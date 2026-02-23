from fastapi import APIRouter, Depends
from bson import ObjectId

from bids.schemas import BidCreate, BidResponse
from bids.service import place_bid
from users.routes import get_current_user

router = APIRouter(prefix="/bids", tags=["Bids"])


@router.post("/place", response_model=BidResponse)
async def place_bid_api(data: BidCreate, user=Depends(get_current_user)):
    return await place_bid(
        auction_id=ObjectId(data.auction_id),
        bidder_id=user["_id"],
        amount=data.amount,
    )
