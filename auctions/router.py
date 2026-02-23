from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from auctions.schemas import AuctionCreate, AuctionResponse, AuctionListResponse
from auctions.service import create_auction, list_active_auctions, get_auction
from users.routes import get_current_user
from db import db

router = APIRouter(prefix="/auctions", tags=["Auctions"])


async def get_current_seller_id(user=Depends(get_current_user)):
    seller = await db.sellers.find_one({"user_id": user["_id"]})
    if not seller:
        raise HTTPException(status_code=403, detail="Must be a seller to create auctions")
    return seller["_id"]


@router.post("/create", response_model=AuctionResponse)
async def create_auction_api(
    data: AuctionCreate, seller_id: ObjectId = Depends(get_current_seller_id)
):
    return await create_auction(seller_id=seller_id, data=data)


@router.get("/", response_model=list[AuctionListResponse])
async def list_auctions_api():
    return await list_active_auctions()


@router.get("/{auction_id}", response_model=AuctionResponse)
async def get_auction_api(auction_id: str):
    try:
        return await get_auction(ObjectId(auction_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid auction ID")
