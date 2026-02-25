from bson import ObjectId
from datetime import datetime, timezone

from typing import Optional


class AuctionDocument:
    def __init__(
        self,
        seller_id: ObjectId,
        title: str,
        description: str,
        starting_price: float,
        min_increment: float,
        start_time: datetime,
        end_time: datetime,
        image_paths: Optional[list] = None,
        category: str = "Uncategorized",
    ):
        self._id: ObjectId = ObjectId()
        self.seller_id: ObjectId = seller_id
        self.title: str = title
        self.description: str = description
        self.category: str = category

        self.starting_price: float = starting_price
        self.current_price: float = starting_price
        self.highest_bidder: Optional[ObjectId] = None
        self.min_increment: float = min_increment
        self.start_time: datetime = start_time
        self.end_time: datetime = end_time
        self.image_paths: list = image_paths or []
        self.bids: list = []
        self.status: str = "active"
        self.created_at: datetime = datetime.now(timezone.utc)
        self.updated_at: datetime = datetime.now(timezone.utc)




    def to_dict(self) -> dict:
        return self.__dict__.copy()
