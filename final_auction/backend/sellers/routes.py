from fastapi import APIRouter, Depends, HTTPException
from db import db
from models.seller_models import SellerCreate
from users.routes import get_current_user
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/sellers", tags=["Sellers"])


@router.post("/create")
async def create_seller(data: SellerCreate, user=Depends(get_current_user)):
    existing = await db.sellers.find_one({"user_id": user["_id"]})
    if existing:
        raise HTTPException(400, "Already a seller")
    doc = {
        "user_id": user["_id"],
        "store_name": data.store_name,
        "verified": False,
        "created_at": datetime.utcnow(),
    }
    await db.sellers.insert_one(doc)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"role": "seller"}})
    return {"message": "Seller profile created"}


@router.get("/me")
async def get_my_seller(user=Depends(get_current_user)):
    seller = await db.sellers.find_one({"user_id": user["_id"]})
    if not seller:
        raise HTTPException(404, "Not a seller")
    return {
        "id": str(seller["_id"]),
        "user_id": str(seller["user_id"]),
        "store_name": seller["store_name"],
        "verified": seller["verified"],
    }


@router.get("/{id}")
async def get_seller(id: str):
    try:
        seller = await db.sellers.find_one({"_id": ObjectId(id)})
        if not seller:
            raise HTTPException(404, "Seller not found")
        seller["_id"] = str(seller["_id"])
        seller["user_id"] = str(seller["user_id"])
        return seller
    except Exception:
        raise HTTPException(400, "Invalid seller ID")
