from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from notifications.schemas import NotificationResponse
from notifications.service import list_user_notifications, mark_as_read
from users.routes import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=list[NotificationResponse])
async def get_my_notifications(user=Depends(get_current_user)):
    return await list_user_notifications(user["_id"])

@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    try:
        ok = await mark_as_read(ObjectId(notification_id))
        if not ok:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification marked as read"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")
