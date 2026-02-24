from bson import ObjectId
from datetime import datetime, timezone


class BidDocument:
    def __init__(self, auction_id: ObjectId, bidder_id: ObjectId, amount: float):
        self._id: ObjectId = ObjectId()
        self.auction_id: ObjectId = auction_id
        self.bidder_id: ObjectId = bidder_id
        self.amount: float = amount
        self.bid_time: datetime = datetime.now(timezone.utc)


    def to_dict(self) -> dict:
        return self.__dict__.copy()
