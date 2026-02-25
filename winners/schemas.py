from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EmbeddedBuyerInfo(BaseModel):
    """Buyer (winner) details embedded in winner document"""
    buyer_id: str
    buyer_name: str
    buyer_email: str


class EmbeddedSellerInfo(BaseModel):
    """Seller details embedded in winner document"""
    seller_id: str
    seller_name: str
    seller_email: str
    store_name: Optional[str] = None


class EmbeddedAuctionInfo(BaseModel):
    """Auction/Product details embedded in winner document"""
    auction_id: str
    title: str
    description: str
    starting_price: float
    category: Optional[str] = None
    image_path: Optional[str] = None


class WinnerResponse(BaseModel):
    id: str
    auction_id: str
    winner_id: str
    final_price: float
    declared_at: datetime
    buyer_info: Optional[EmbeddedBuyerInfo] = None
    seller_info: Optional[EmbeddedSellerInfo] = None
    auction_info: Optional[EmbeddedAuctionInfo] = None
