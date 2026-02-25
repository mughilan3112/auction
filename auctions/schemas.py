from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class AuctionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    starting_price: float = Field(..., gt=0)
    min_increment: float = Field(..., gt=0)
    start_time: datetime
    end_time: datetime
    category: Optional[str] = "Others"


class EmbeddedBid(BaseModel):
    """Bid document embedded inside auction (no auction_id or _id)"""
    bid_number: int  # Sequential bid number (1, 2, 3, etc)
    bidder_id: str
    amount: float
    bid_time: datetime


class EmbeddedBuyerInfo(BaseModel):
    """Buyer (winner) details embedded in auction document"""
    buyer_id: str
    buyer_name: str
    buyer_email: str


class EmbeddedSellerInfo(BaseModel):
    """Seller details embedded in auction document"""
    seller_id: str
    seller_name: str
    seller_email: str
    store_name: Optional[str] = None


class EmbeddedAuctionInfo(BaseModel):
    """Auction/Product details formatted for winner response"""
    auction_id: str
    title: str
    description: str
    starting_price: float
    category: Optional[str] = None
    image_path: Optional[str] = None


class EmbeddedWinnerInfo(BaseModel):
    """Complete winner information embedded in closed auction"""
    final_price: float
    declared_at: datetime
    buyer_info: EmbeddedBuyerInfo
    seller_info: EmbeddedSellerInfo


class WinnerResponse(BaseModel):
    """Legacy compatible response for winner details, now sourced from auctions"""
    id: str
    auction_id: str
    winner_id: str
    final_price: float
    declared_at: datetime
    buyer_info: Optional[EmbeddedBuyerInfo] = None
    seller_info: Optional[EmbeddedSellerInfo] = None
    auction_info: Optional[EmbeddedAuctionInfo] = None


class AuctionResponse(BaseModel):
    id: str
    seller_id: str
    title: str
    description: str
    starting_price: float
    current_price: float
    highest_bidder: Optional[str]
    min_increment: float
    start_time: datetime
    end_time: datetime
    status: str
    image_paths: list[str] = []
    created_at: datetime
    updated_at: datetime
    category: str
    stats: Optional[dict] = None
    bids: list[EmbeddedBid] = []  # Embedded bids (last N)
    winner_info: Optional[EmbeddedWinnerInfo] = None  # Embedded winner info for closed auctions


class AuctionListResponse(BaseModel):
    """Response schema for listing auctions (simplified for list views)"""
    id: str
    title: str
    current_price: float
    start_time: datetime
    end_time: datetime
    status: str
    category: str = "Others"
    image_path: Optional[str] = None
    winner_name: Optional[str] = None
    winner_id: Optional[str] = None
