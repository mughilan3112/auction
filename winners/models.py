from bson import ObjectId
from datetime import datetime, timezone


class WinnerDocument:
    def __init__(
        self, auction_id: ObjectId, winner_id: ObjectId, final_price: float
    ):
        self._id: ObjectId = ObjectId()
        self.auction_id: ObjectId = auction_id
        self.winner_id: ObjectId = winner_id
        self.final_price: float = final_price
        self.declared_at: datetime = datetime.now(timezone.utc)


    def to_dict(self) -> dict:
        return self.__dict__.copy()
