import requests
import os
from pydantic import BaseModel, Field
from agno.tools import tool
from agents.shared import knowledge, current_user_id

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
def search_user_papers(query: str) -> str:
    """
    Search the current logged-in user's own indexed papers in the knowledge base.
    Use this whenever you need content from papers the user has previously indexed
    (e.g. to summarize, compare, or answer questions about them).

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