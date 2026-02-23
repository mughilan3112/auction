from fastapi import APIRouter, HTTPException
from bson import ObjectId

from winners.schemas import WinnerResponse
from winners.service import declare_winner

router = APIRouter(prefix="/winners", tags=["Winners"])


@router.get("/{auction_id}", response_model=WinnerResponse)
async def declare_winner_api(auction_id: str):
    try:
        return await declare_winner(ObjectId(auction_id))
    except Exception as e:
        if hasattr(e, "status_code"):
            raise e
        raise HTTPException(status_code=400, detail="Invalid auction ID")
