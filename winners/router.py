from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from db import db
from users.routes import get_current_user

from winners.schemas import WinnerResponse
from winners.service import declare_winner, _format_winner_response
from winners.repository import (
    find_winner_by_auction_id,
    find_winners_by_buyer_id,
    find_winners_by_seller_id,
)

router = APIRouter(prefix="/winners", tags=["Winners"])


@router.get("/my-wins", response_model=list[WinnerResponse])
async def get_my_won_auctions(user=Depends(get_current_user)):
    """Get all auctions won by the current user (as buyer)"""
    try:
        winners = await find_winners_by_buyer_id(user["_id"])
        return [_format_winner_response(w) for w in winners]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-sales", response_model=list[WinnerResponse])
async def get_my_sold_auctions(user=Depends(get_current_user)):
    """Get all auctions sold by the current user (as seller)"""
    try:
        # Find all winners where seller_info.seller_id matches current user
        winners = await find_winners_by_seller_id(user["_id"])
        return [_format_winner_response(w) for w in winners]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{auction_id}", response_model=WinnerResponse)
async def declare_winner_api(auction_id: str):
    try:
        return await declare_winner(ObjectId(auction_id))
    except Exception as e:
        if hasattr(e, "status_code"):
            raise e
        raise HTTPException(status_code=400, detail="Invalid auction ID")


