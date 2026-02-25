from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class BidCreate(BaseModel):
    """Create a bid (sent to API)"""
    auction_id: str = Field(..., description="Auction ID")
    amount: float = Field(..., gt=0)


class EmbeddedBid(BaseModel):
    """Bid document embedded inside auction (no auction_id or _id)"""
    bid_number: int  # Sequential bid number for database clarity
    bidder_id: str
    amount: float
    bid_time: datetime


class BidResponse(BaseModel):
    """Response from place_bid API (includes full reference bid)"""
    id: str
    auction_id: str
    bidder_id: str
    amount: float
    bid_time: datetime
