from agno.run import RunContext
from agno.tools import tool
import arxiv
import os
import requests
from agents.shared import current_user_id
from pydantic import BaseModel, Field

INTERNAL_API_TOKEN = os.environ["INTERNAL_API_TOKEN"] 

class ArxivPaper(BaseModel):
    """Single paper found on ArXiv."""
    title: str = Field(description="Titolo del paper.")
    authors: list[str] = Field(description="Elenco degli autori del paper.")
    published_date: str = Field(description="Data di pubblicazione (formato YYYY-MM-DD, 'N/A' se assente).")
    arxiv_id: str = Field(description="ID breve ArXiv del paper (es. '2401.01234v1').")
    entry_url: str = Field(description="URL della pagina ArXiv del paper.")
    pdf_url: str = Field(description="URL diretto al PDF del paper.")
    abstract: str = Field(description="Abstract del paper.")

class ArxivSearchResult(BaseModel):
    """Complete structured result for ArXiv search."""
    query: str = Field(description="Query di ricerca utilizzata.")
    total_results: int = Field(description="Numero di paper trovati.")
    papers: list[ArxivPaper] = Field(
        default_factory=list,
        description="Elenco dei paper trovati, vuoto se nessun risultato.",
    )
    error: str | None = Field(
        default=None,
        description="Messaggio di errore, presente solo in caso di fallimento della ricerca.",
    )
    
@tool
def search_arxiv(run_context: RunContext, query: str, max_results: int = 1, sort_by: str = "relevance") -> str:
    """Searches ArXiv for papers matching the given query.

    Args:
        query (str): Search terms
        max_results (int): Number of results to return
        sort_by (str): Criterion to sort results by. Options: 'relevance', 'lastUpdatedDate', 'submittedDate'.
    """
    sort_mapping = {
        "relevance": arxiv.SortCriterion.Relevance,
        "lastUpdatedDate": arxiv.SortCriterion.LastUpdatedDate,
        "submittedDate": arxiv.SortCriterion.SubmittedDate,
    }
    sort_criterion = sort_mapping.get(sort_by, arxiv.SortCriterion.Relevance)
    
    try:
        page_size = min(max_results, 100)
        client = arxiv.Client(page_size=page_size)
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=sort_criterion
        )
        results = list(client.results(search))

        if not results:
            return "No papers found on ArXiv."

        run_context.session_state.setdefault("papers", [])
        papers: list[ArxivPaper] = []
        for paper in results:
            published_str = paper.published.strftime("%Y-%m-%d") if paper.published else "N/A"
            paper_id = paper.get_short_id()

            # update the agent's session state with the paper information
            if not any(p["id"] == paper_id for p in run_context.session_state["papers"]):
                run_context.session_state["papers"].append({
                    "id": paper_id,
                    "user_id": "",
                    "arxiv_id": paper_id,
                    "title": paper.title,
                    "pdf_url": paper.pdf_url,
                    "published_at": published_str,
                    "selected": False,
                    "indexed": False,
                    "created_at":"",
                    "updated_at":""
                })

            papers.append(ArxivPaper(
                title=paper.title,
                authors=[a.name for a in paper.authors],
                published_date=published_str,
                arxiv_id=paper_id,
                entry_url=paper.entry_id,
                pdf_url=paper.pdf_url,
                abstract=paper.summary,
            ))  
        return ArxivSearchResult(query=query, total_results=len(papers), papers=papers)

    except Exception as e:
        return ArxivSearchResult(query=query, total_results=0, papers=[], error=str(e))
    
class ResearcherProfileInputModel(BaseModel):
    research_field: str = Field(description="Il campo di ricerca del ricercatore.")
    interests: str = Field(description="Gli interessi di ricerca del ricercatore.")

@tool
def upsert_researcher_profile(research_field: str, interests: str) -> str:
    """
    Upsert the current logged-in user's researcher profile in the database.

    Args:
        research_field (str): The research field of the user.
        interests (str): The research interests of the user.

    Returns:
        str: A confirmation message.
    """
    user_id = current_user_id.get()
    if not user_id:
        return "No authenticated user found in this session; cannot upsert the researcher profile."

    # Make a POST request to the internal API to upsert the researcher profile
    response = requests.post(
        "http://localhost:3000/api/profiles",
        json={
            "userId": user_id,
            "researchField": research_field,
            "interests": interests,
        },
        headers={"x-internal-api-token": INTERNAL_API_TOKEN},
        timeout=10
    )
    response.raise_for_status()
    result = response.json()
    return (f"Researcher profile saved successfully. Profile ID: {result['id']}")

@tool
def get_researcher_profile() -> str:
    """
    Retrieves the current authenticated user's researcher profile.

    Use this tool when the user asks to view their researcher profile or check their research field or interests. 
    Use this tool before search_arxiv whenever the user's query is generic or underspecified.
    """
    user_id = current_user_id.get()

    if not user_id:
        return ("No authenticated user found .")

    # Make a GET request to the internal API to retrieve the researcher profile
    response = requests.get(
        "http://localhost:3000/api/profiles",
        params={
            "userId": user_id,
        },
        headers={"x-internal-api-token": INTERNAL_API_TOKEN},
        timeout=10,
    )

    if response.status_code == 404:
        return "No researcher profile has been saved for this user."

    response.raise_for_status()
    profile = response.json()
    return ResearcherProfileInputModel(
        research_field=profile["researchField"],
        interests=profile["interests"],
    )