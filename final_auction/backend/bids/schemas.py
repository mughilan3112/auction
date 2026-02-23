from pydantic import BaseModel, Field
from datetime import datetime


class BidCreate(BaseModel):
    auction_id: str = Field(..., description="Auction ID")
    amount: float = Field(..., gt=0)


class BidResponse(BaseModel):
    id: str
    auction_id: str
    bidder_id: str
    amount: float
    bid_time: datetime
