from fastapi import APIRouter, Depends, HTTPException
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import JWT_SECRET, JWT_ALGO
from db import db
from bson import ObjectId

router = APIRouter(prefix="/users", tags=["Users"])
security = HTTPBearer()


async def get_current_user(cred: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except JWTError:
        raise HTTPException(401, "Invalid token")
    except Exception:
        raise HTTPException(401, "Authentication failed")


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return {"name": user["name"], "email": user["email"], "role": user["role"], "id": str(user["_id"])}


@router.put("/me")
async def update_me(data: dict, user=Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": data})
    return {"message": "Updated"}
