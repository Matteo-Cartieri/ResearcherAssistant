import requests
import os
from pydantic import BaseModel, Field
from agno.tools import tool
from agents.shared import knowledge, current_user_id
from pathlib import Path
from agno.knowledge.reader.pdf_reader import PDFReader

INTERNAL_API_TOKEN = os.environ["INTERNAL_API_TOKEN"] 

class WorkplanInputModel(BaseModel):
    title: str = Field(description="Titolo del piano di lavoro.")
    description: str = Field(description="La descrizione del piano di lavoro.")
    research_domain: str = Field(description="Il dominio di ricerca del piano di lavoro.")
    start_date: str = Field(description="La data di inizio del progetto.")
    end_date: str = Field(description="La data di fine del progetto.")
    status: str = Field(description="Lo stato del piano di lavoro (pianificato, in_corso, completato).")

@tool
def upsert_user_workplan(title: str, description: str, research_domain: str, start_date: str, end_date: str, status: str) -> str:
    """
    Upsert the current logged-in user's workplan in the database.

    Args:
        title (str): The title of the workplan.
        description (str): The description of the workplan.
        research_domain (str): The research domain of the workplan.
        start_date (str): The start date of the project.
        end_date (str): The end date of the project.
        status (str): The status of the workplan (planned, in_progress, completed).

    Returns:
        str: A confirmation message.
    """
    user_id = current_user_id.get()
    if not user_id:
        return "No authenticated user found in this session; cannot upsert the workplan."

    # Make a POST request to the internal API to upsert the workplan
    response = requests.post(
        "http://localhost:3000/api/workplans",
        json={
            "userId": user_id,
            "title": title,
            "description": description,
            "researchDomain": research_domain,
            "startDate": start_date,
            "endDate": end_date,
            "status": status,
        },
        headers={"x-internal-api-token": INTERNAL_API_TOKEN},
        timeout=10
    )
    response.raise_for_status()
    result = response.json()
    return (f"Workplan saved successfully. Workplan ID: {result['id']}")

@tool
def get_user_workplan() -> str:
    """
    Retrieves the current authenticated user's latest workplan.

    Use this tool when the user asks to:
    - view their workplan
    - check their research plan
    - see the plan they previously created
    - retrieve a previously saved workplan
    """
    user_id = current_user_id.get()

    if not user_id:
        return ("No authenticated user found .")

    # Make a GET request to the internal API to retrieve the workplan
    response = requests.get(
        "http://localhost:3000/api/workplans",
        params={
            "userId": user_id,
        },
        headers={"x-internal-api-token": INTERNAL_API_TOKEN},
        timeout=10,
    )

    if response.status_code == 404:
        return "No workplan has been saved for this user."

    response.raise_for_status()
    workplan = response.json()
    return WorkplanInputModel(
        title=workplan["title"], 
        description=workplan["description"], 
        research_domain=workplan["research_domain"], 
        start_date=workplan["start_date"], 
        end_date=workplan["end_date"], 
        status=workplan["status"]
    )

@tool
def search_user_knowledge(query: str) -> str:
    """
    Search the current logged-in user's own indexed papers in the knowledge base.
    Use this when the user wants to find information within their own papers.

    Args:
        query: What to search for inside the user's papers.
    """
    user_id = current_user_id.get()
    if not user_id:
        return "No authenticated user found in this session; cannot search the knowledge base."

    # search the knowledge base for the user's indexed papers
    results = knowledge.search(query=query, filters={"user_id": user_id})

    if not results:
        return "No matching content found in this user's indexed papers."

    chunks = []
    for doc in results:
        paper_id = doc.meta_data.get("paper_id", "unknown")
        chunks.append(f"[paper_id: {paper_id}]\n{doc.content}")

    return "\n\n---\n\n".join(chunks)

@tool
def search_user_paper_ids(query: str) -> str:
    """
    Search the current logged-in user's own indexed papers and return the
    matching paper_id(s), ranked by relevance. Use this to locate which paper
    a user is referring to (e.g. by title or topic) BEFORE calling get_full_text_from_paper.
    Use this when the user wants a summary or a comparison regarding a specific paper.

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
    Use this when the user wants a summary or a comparison regarding a specific paper.

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