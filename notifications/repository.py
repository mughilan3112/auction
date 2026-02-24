from bson import ObjectId
from typing import List, Optional
from db import db

notifications_collection = db.notifications

async def insert_notification(notification_data: dict) -> ObjectId:
    result = await notifications_collection.insert_one(notification_data)
    return result.inserted_id

async def find_notifications_by_user(user_id: ObjectId) -> List[dict]:
    cursor = notifications_collection.find({"user_id": user_id}).sort("created_at", -1)
    return await cursor.to_list(length=None)

async def mark_notification_as_read(notification_id: ObjectId) -> bool:
    result = await notifications_collection.update_one(
        {"_id": notification_id}, {"$set": {"is_read": True}}
    )
    return result.matched_count == 1

async def delete_notification(notification_id: ObjectId) -> bool:
    result = await notifications_collection.delete_one({"_id": notification_id})
    return result.deleted_count == 1
