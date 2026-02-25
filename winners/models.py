from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional


class WinnerDocument:
    def __init__(
        self, 
        auction_id: ObjectId, 
        winner_id: ObjectId, 
        final_price: float,
        buyer_info: Optional[dict] = None,
        seller_info: Optional[dict] = None,
        auction_info: Optional[dict] = None,
    ):
        self._id: ObjectId = ObjectId()
        self.auction_id: ObjectId = auction_id
        self.winner_id: ObjectId = winner_id
        self.final_price: float = final_price
        self.declared_at: datetime = datetime.now(timezone.utc)
        
        # Embedded documents for buyer/seller/auction details
        self.buyer_info: Optional[dict] = buyer_info
        self.seller_info: Optional[dict] = seller_info
        self.auction_info: Optional[dict] = auction_info

    def to_dict(self) -> dict:
        return self.__dict__.copy()
