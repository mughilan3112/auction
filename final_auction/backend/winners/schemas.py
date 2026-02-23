from pydantic import BaseModel
from datetime import datetime


class WinnerResponse(BaseModel):
    id: str
    auction_id: str
    winner_id: str
    final_price: float
    declared_at: datetime
