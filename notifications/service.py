from bson import ObjectId
from notifications.models import NotificationDocument
from notifications.repository import (
    insert_notification,
    find_notifications_by_user,
    mark_notification_as_read as repo_mark_as_read
)

async def create_notification(user_id: ObjectId, title: str, message: str, type: str = "info"):
    notification = NotificationDocument(user_id, title, message, type)
    await insert_notification(notification.to_dict())

async def list_user_notifications(user_id: ObjectId):
    notifications = await find_notifications_by_user(user_id)
    return [_format_notification(n) for n in notifications]

async def mark_as_read(notification_id: ObjectId):
    return await repo_mark_as_read(notification_id)

def _format_notification(n: dict):
    return {
        "id": str(n["_id"]),
        "title": n["title"],
        "message": n["message"],
        "type": n["type"],
        "is_read": n["is_read"],
        "created_at": n["created_at"]
    }
