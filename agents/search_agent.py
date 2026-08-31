from agno.agent import Agent
from tools.search_tools import search_arxiv, get_researcher_profile, upsert_researcher_profile
from agents.shared import db, model, PROMPT_INJECTION_PATTERNS
from agno.guardrails import PromptInjectionGuardrail

search_agent = Agent(
    name="Searcher Assistant",
    model=model,
    db=db,
    tools=[
        search_arxiv, get_researcher_profile, upsert_researcher_profile
    ],
    session_state={"papers": []}, # shared with UI
    instructions=[
        "Always respond to the user in Italian.",  
        # search instructions
        "If you need to search for a paper, use the search_arxiv tool.",
        "Prefer papers related to the Computer Science field.",
        "Determine max_results before calling the tool: "
        "if the user asks for 'un articolo' or 'un paper' (singular), set max_results to 1. "
        "Otherwise, set max_results to the number the user specifies.",
        "Always translate user query terms into English BEFORE calling the search_arxiv tool.",
        "Return the raw results as-is: title, authors, year, abstract, arxiv_id/DOI, and link.",
        "Do NOT summarize, analyze, or add commentary beyond what the tool returns.",
        # researcher profile instructions
        "If the user mentions their field of research (e.g. 'sono un ricercatore in NLP'), use upsert_researcher_profile to save it.",
        "If the user need to search for a paper but the query is generic or underspecified, ",
        "use get_researcher_profile to retrieve their research field and interests, and use that information to refine the search query.",
        "If the user asks to view their researcher profile, use get_researcher_profile to retrieve it.",
        ],
    pre_hooks=[
        PromptInjectionGuardrail(injection_patterns=PROMPT_INJECTION_PATTERNS),
    ],
    markdown=True,  
    debug_mode=True,
)
