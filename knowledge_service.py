import httpx
import os
from agents.shared import knowledge
from agno.knowledge.reader.pdf_reader import PDFReader

def index_paper_for_user(user_id: str, paper_id: str, pdf_url: str):
    """
    Add a paper to the user's knowledge base and download its PDF
    into the local docs directory.

    The paper is stored in LanceDB together with metadata
    identifying the owner and the original paper.
    """

    docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
    os.makedirs(docs_dir, exist_ok=True)
    pdf_path = os.path.join(docs_dir,f"{paper_id}.pdf")

    if os.path.exists(pdf_path):
        print(f"PDF already downloaded, skipping download: {pdf_path}")

    else:
        print(f"Downloading PDF for paper {paper_id} from {pdf_url}")

        try:
            # download the PDF file from the provided URL
            response = httpx.get(pdf_url, follow_redirects=True, timeout=60.0,)
            response.raise_for_status()

        except httpx.HTTPError as e:
            raise RuntimeError(f"Unable to download PDF from {pdf_url}: {e}") from e

        if not response.content:
            raise RuntimeError(f"Downloaded PDF is empty: {pdf_url}")

        with open(pdf_path, "wb") as pdf_file:
            pdf_file.write(response.content)

        print(f"PDF downloaded successfully: {pdf_path}")
        
    reader = PDFReader(chunk=True)

    knowledge.insert(
        name=paper_id,
        path=pdf_path,
        metadata={
            "user_id": user_id,
            "paper_id": paper_id,
        },
        reader=reader,
    )

    return {
        "success": True,
        "user_id": user_id,
        "paper_id": paper_id,
    }
  
def deindex_paper_for_user(user_id: str, paper_id: str, delete_file: bool = False) -> dict:
    """
    Remove a paper's chunks from the knowledge base for a specific user,
    and optionally delete the cached PDF if no other user needs it.
    """
    knowledge.remove_vectors_by_metadata({
              "user_id": user_id,
              "paper_id": paper_id,
          }) 

    file_deleted = False
    
    if delete_file:
        docs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs")
        pdf_path = os.path.join(docs_dir, f"{paper_id}.pdf")

        # delete the cached PDF file if requested
        try:
            os.remove(pdf_path)
            file_deleted = True
            print(f"Deleted cached PDF: {pdf_path}")
        except FileNotFoundError:
            print(f"No cached PDF to delete: {pdf_path}")

    return {
        "success": True,
        "user_id": user_id,
        "paper_id": paper_id,
        "file_deleted": file_deleted,
    }