from bson import ObjectId
from datetime import datetime
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
    ):
        self._id: ObjectId = ObjectId()
        self.seller_id: ObjectId = seller_id
        self.title: str = title
        self.description: str = description
        self.starting_price: float = starting_price
        self.current_price: float = starting_price
        self.highest_bidder: Optional[ObjectId] = None
        self.min_increment: float = min_increment
        self.start_time: datetime = start_time
        self.end_time: datetime = end_time
        self.status: str = "active"
        self.created_at: datetime = datetime.utcnow()
        self.updated_at: datetime = datetime.utcnow()

    def to_dict(self) -> dict:
        return self.__dict__.copy()
