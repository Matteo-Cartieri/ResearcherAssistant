from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
import os
from knowledge_service import index_paper_for_user, deindex_paper_for_user

router = APIRouter(prefix="/knowledge", tags=["knowledge"],)

class IndexPaperRequest(BaseModel):
    user_id: str
    paper_id: str
    pdf_url: str

@router.post("/index")
async def index_paper(request: IndexPaperRequest, authorization: str | None = Header(default=None)):
    expected_token = os.getenv("INTERNAL_API_TOKEN")

    if not expected_token:
        raise HTTPException(status_code=500, detail="INTERNAL_API_TOKEN is not configured")

    if authorization != f"Bearer {expected_token}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # save the paper in the user'sknowledge base
        result = index_paper_for_user(
            user_id=request.user_id,
            paper_id=request.paper_id,
            pdf_url=request.pdf_url,
        )
        return result

    except Exception as e:
        print(f"Error indexing paper {request.paper_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index paper: {str(e)}",)
    
class DeindexPaperRequest(BaseModel):
    user_id: str
    paper_id: str
    delete_file: bool = False

@router.post("/deindex")
async def deindex_paper(request: DeindexPaperRequest, authorization: str | None = Header(default=None)):
    expected_token = os.getenv("INTERNAL_API_TOKEN")

    if not expected_token:
        raise HTTPException(status_code=500, detail="INTERNAL_API_TOKEN is not configured")

    if authorization != f"Bearer {expected_token}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # remove the paper from the user's knowledge base 
        result = deindex_paper_for_user(
            user_id=request.user_id,
            paper_id=request.paper_id,
            delete_file=request.delete_file,
        )
        return result
    except Exception as e:
        print(f"Error deindexing paper {request.paper_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to deindex paper: {str(e)}")