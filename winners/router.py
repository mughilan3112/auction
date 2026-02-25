from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from db import db
from users.routes import get_current_user

from auctions.schemas import WinnerResponse
from auctions.service import (
    declare_winner, 
    get_my_won_auctions_logic, 
    get_my_sold_auctions_logic
)

router = APIRouter(prefix="/winners", tags=["Winners"])


@router.get("/my-wins", response_model=list[WinnerResponse])
async def get_my_won_auctions(user=Depends(get_current_user)):
    """Get all auctions won by the current user (as buyer)"""
    try:
        return await get_my_won_auctions_logic(user["_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-sales", response_model=list[WinnerResponse])
async def get_my_sold_auctions(user=Depends(get_current_user)):
    """Get all auctions sold by the current user (as seller)"""
    try:
        return await get_my_sold_auctions_logic(user["_id"])
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


