from agno.tools import tool
import ast
import re
import autopep8
import textwrap
import subprocess
import tempfile
import base64
import json
import os
import base64
import pickle
from typing import Any, List, Optional, Dict
from pathlib import Path
from agno.knowledge.reader.pdf_reader import PDFReader
from agents.shared import current_user_id, knowledge

DOCKER_IMAGE = "paper-code-sandbox"

def _format_python_code(raw_code: str) -> str:
    """
    Format Python code by ensuring proper indentation and applying autopep8 formatting.
    """
    code = raw_code.strip()

    # insert newlines after colons, docstrings, and assignments for better readability
    code = re.sub(r',\s*\n\s*', ', ', code)
    code = re.sub(r'\s*\n\s*=', ' =', code) 
    code = re.sub(r'(:\s*)("""|\'\'\')', r':\n\2\n', code)
    code = re.sub(r'("""|\'\'\')\s*', r'\1\n', code)
    code = re.sub(r'\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*\s*=\s*)', r'\n\1', code)       
    code = re.sub(r'\s*\breturn\b', r'\nreturn ', code)     

    # clean up the code by removing extra spaces 
    lines = [line.strip() for line in code.splitlines() if line.strip()]

    if not lines:
        return raw_code

    formatted_lines = []
    in_function_body = False

    # manual indentation: 4 spaces for function bodies
    for line in lines:
        if line.startswith("def ") or line.startswith("class "):
            formatted_lines.append(line)
            in_function_body = True
        elif in_function_body:
            formatted_lines.append("    " + line)
        else:
            formatted_lines.append(line)

    reconstructed_code = "\n".join(formatted_lines)

    # final formatting using autopep8
    final_code = autopep8.fix_code(reconstructed_code, options={'indent_size': 4, 'aggressive': 1})

    return final_code

def _identify_functions(code: str) -> list[dict]:
    """
    Analyzes a code snippet extracted from a paper and lists the functions
    defined at the module level, with their name, arguments, and docstring.

    Args:
        code (str): The source code extracted from the paper.
    Returns:
        list[dict]: A list of available functions with their signature.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [{"error": f"Invalid syntax: {e}"}]

    functions = []
    for node in tree.body:  # only top-level, not nested functions
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.name.startswith("_"):
                continue
            args = [a.arg for a in node.args.args]
            n_defaults = len(node.args.defaults)
            required = args[: len(args) - n_defaults] if n_defaults else args
            functions.append({
                "name": node.name,
                "args": args,
                "required_args": required,
                "docstring": ast.get_docstring(node),
            })
    return functions

@tool
def get_runnable_functions(text: str) -> dict:
    """
    Extracts code snippets from the given text and identifies the functions available in each snippet.

    Args:
        text: The complete text of the paper from which to extract code.
    Returns:
        dict: {"snippets": [{"code": str, "functions": [{"name", "args", "required_args", "docstring"}]}]}
    """
    snippets = _extract_code(text)  

    result = []
    for snippet in snippets:
        functions = _identify_functions(snippet)  
        if functions and not any("error" in f for f in functions):
            result.append({"code": snippet, "functions": functions})

    return {"snippets": result}

def _extract_code(text: str) -> list[str]:
    """
    Extracts code snippets from the given text.

    Args:
        text (str): The text from which to extract code snippets.
    Returns:
        list[str]: A list of extracted code snippets.    
    """
    candidates = []

    candidates += re.findall(
        r"((?:^[ \t]*(?:import\s+[^\n]+|from\s+\S+\s+import\s+[^\n]+)\n)+"
        r"(?:[ \t]*def\s+[a-zA-Z_]\w*\s*\([\s\S]*?\):[\s\S]*?\breturn\b[^\n\.]*)?)",
        text, flags=re.MULTILINE
    )

    candidates += re.findall(
        r"(?<!import\s)(?<!from\s)(def\s+[a-zA-Z_]\w*\s*\([\s\S]*?\):[\s\S]*?\breturn\b[^\n\.]*)",
        text
    )

    seen = set()
    code_snippets = []
    for raw in candidates:
        cleaned = raw.strip()
        return_idx = cleaned.rfind("return")
        if return_idx != -1:
            after_return = cleaned[return_idx + 6:]
            # find valid variable names after 'return' and keeps only those
            match_vars = re.match(r"^(\s*[a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)", after_return)
            if match_vars:
                valid_return_vars = match_vars.group(1)
                cleaned = cleaned[:return_idx + 6] + valid_return_vars

        cleaned = re.sub(r'(\b\w+)\s+(def\b)', r'\1\n\2', cleaned)
        cleaned = _format_python_code(cleaned)

        seen.add(cleaned)
        code_snippets.append(cleaned)
    code_snippets = _remove_contained(list(code_snippets))

    return code_snippets

def _remove_contained(snippets: list[str]) -> list[str]:
    """
    Removes snippets that are entirely contained within another, more complete snippet.
    """
    sorted_snippets = sorted(set(snippets), key=len, reverse=True)

    kept = []
    for candidate in sorted_snippets:
        # if any longer snippet already kept contains this candidate, discard it
        if any(candidate in longer for longer in kept):
            continue
        kept.append(candidate)

    return kept

@tool
def run_code(
    code: str, 
    function_name: str, 
    args: Optional[List[Any]] = None,     
    kwargs: Optional[Dict[str, Any]] = None,
    timeout: int = 15, 
    memory_mb: int = 512
) -> dict:
    """
    Executes a Python function inside an isolated Docker container,
    supporting any arbitrary Python data structure (Tensors, NumPy arrays, custom objects).
    
    Args:
        code (str): Source code.
        function_name (str): Name of the function to execute.
        args (list, optional): Positional arguments (*args) for the function.
        kwargs (dict, optional): Keyword arguments (**kwargs) for the function.
        timeout (int): Timeout in seconds.
        memory_mb (int): Container memory limit in MB.
    Returns:
        dict: {"success": bool, "output": Any, "error": str|None, "stderr": str|None}
    """
    args = args or []
    kwargs = kwargs or {}

    try:
        payload = {"args": args, "kwargs": kwargs}
        serialized_payload = base64.b64encode(pickle.dumps(payload, protocol=4)).decode("ascii")
    except Exception as e:
        return {
            "success": False, 
            "output": None, 
            "error": f"Failed to serialize arguments with pickle: {e}", 
            "stderr": None
        }

    runner_logic = textwrap.dedent(f"""
        import sys, base64, pickle, json

        try:
            _raw_payload = base64.b64decode("{serialized_payload}")
            _payload = pickle.loads(_raw_payload)
            _args = _payload.get("args", [])
            _kwargs = _payload.get("kwargs", {{}})

            _fn = globals().get({function_name!r})

            if _fn is None:
                print(json.dumps({{"__error__": f"Function '{function_name}' not found"}}))
                sys.exit(1)

            # execute the function and capture the result
            _result = _fn(*_args, **_kwargs)

            try:
                json.dumps(_result)
                _final_output = _result
            except (TypeError, ValueError):
                _final_output = repr(_result)

            print(json.dumps({{"__result__": _final_output}}))

        except TypeError as e:
            print(json.dumps({{"__error__": f"Invalid arguments/signature: {{e}}"}}))
        except Exception as e:
            print(json.dumps({{"__error__": f"{{type(e).__name__}}: {{e}}"}}))
    """)

    full_code = code + "\n" + runner_logic

    # create a temporary directory to hold the script
    tmp_dir = tempfile.mkdtemp(prefix="paper_sandbox_")
    script_path = os.path.join(tmp_dir, "script.py")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(full_code)

    # run the code inside a Docker container with strict resource limits and no network access
    docker_cmd = [
        "docker", "run",
        "--rm",
        "--network", "none",
        f"--memory={memory_mb}m",
        "--memory-swap", f"{memory_mb}m",
        "--cpus=1",
        "--pids-limit=64",
        "--read-only",
        "--tmpfs", "/tmp:rw,size=64m,noexec",
        "-v", f"{script_path}:/tmp/script.py:ro",
        "--security-opt", "no-new-privileges",
        DOCKER_IMAGE,
        "python3", "/tmp/script.py"  
    ]

    try:
        proc = subprocess.run(
            docker_cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        if proc.returncode != 0:
            return {
                "success": False, "output": None,
                "error": proc.stderr.strip() or "Container terminated with error",
                "stderr": proc.stderr,
            }

        try:
            parsed = json.loads(proc.stdout.strip().splitlines()[-1])
        except (json.JSONDecodeError, IndexError):
            return {
                "success": False, 
                "output": None, 
                "error": f"Invalid or empty output from execution: {proc.stdout[:300]}", 
                "stderr": proc.stderr
            }

        if "__error__" in parsed:
            return {"success": False, "output": None, "error": parsed["__error__"], "stderr": proc.stderr}

        return {"success": True, "output": parsed.get("__result__"), "error": None, "stderr": proc.stderr}

    except subprocess.TimeoutExpired:
        return {"success": False, "output": None, "error": "Timeout expired", "stderr": None}
    finally:
        try:
            os.remove(script_path)
            os.rmdir(tmp_dir)
        except OSError:
            pass

@tool
def search_user_paper_ids(query: str) -> str:
    """
    Search the current logged-in user's own indexed papers and return the
    matching paper_id(s), ranked by relevance. Use this to locate which paper
    a user is referring to (e.g. by title or topic) BEFORE calling
    get_full_text_from_KB, which expects a filename derived from paper_id
    (docs/<paper_id>.pdf).

    Args:
        query: Title, keywords, or topic to match against the user's papers.
    Returns:
        A formatted list of candidate paper_ids with their titles, or a
        message indicating no matches were found.
    """
    user_id = current_user_id.get()
    if not user_id:
        return "No authenticated user found in this session; cannot search the knowledge base."

    # search the knowledge base for the user's indexed papers
    results = knowledge.search(query=query, filters={"user_id": user_id})

    if not results:
        return "No matching papers found in this user's indexed knowledge base."

    seen = {}
    for doc in results:
        paper_id = doc.meta_data.get("paper_id")
        if not paper_id or paper_id in seen:
            continue
        title = doc.meta_data.get("title", "unknown title")
        seen[paper_id] = title

    if not seen:
        return "Matches found but no paper_id metadata attached; cannot resolve filenames."

    lines = [f"- paper_id: {pid} | title: {title}" for pid, title in seen.items()]
    return "Candidate papers (best match first):\n" + "\n".join(lines)

@tool
def get_full_text_from_paper(paper_id: str) -> dict:
    """
    Extract the full text of a PDF paper from the local knowledge base without splitting 
    it into chunks, given its paper_id (papers are stored at docs/<paper_id>.pdf).

    Args:
        paper_id: The ID of the paper for which to extract text.
    Returns:
        dict: {"success": bool, "text": str|None, "error": str|None}
    """
    path = Path("docs") / f"{paper_id}.pdf"
    if not path.exists():
        return {"success": False, "text": None, "error": f"File not found: {path}"}

    reader = PDFReader(chunk=False) 
    try:
        documents = reader.read(str(path))
    except Exception as e:
        return {"success": False, "text": None, "error": f"Extraction failed: {e}"}

    if not documents:
        return {"success": False, "text": None, "error": "Reader returned empty list (corrupted or unreadable PDF)."}

    full_text = "\n".join(doc.content for doc in documents if getattr(doc, "content", None))

    if not full_text.strip():
        return {"success": False, "text": None, "error": "No extractable text."}

    return {"success": True, "text": full_text, "error": None}