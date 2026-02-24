from bson import ObjectId
from datetime import datetime, timezone

class NotificationDocument:
    def __init__(self, user_id: ObjectId, title: str, message: str, type: str = "info"):
        self._id: ObjectId = ObjectId()
        self.user_id: ObjectId = user_id
        self.title: str = title
        self.message: str = message
        self.type: str = type # info, success, warning, error
        self.is_read: bool = False
        self.created_at: datetime = datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        return self.__dict__.copy()
