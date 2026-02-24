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




class AuctionListResponse(BaseModel):
    id: str
    title: str
    current_price: float
    start_time: datetime
    end_time: datetime
    status: str
    category: Optional[str] = None
    image_path: Optional[str] = None


