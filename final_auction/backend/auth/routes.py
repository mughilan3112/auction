from fastapi import APIRouter, HTTPException
from db import db
from models.user_models import RegisterUser, LoginUser
from core.security import hash_password, verify_password, create_jwt
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
async def register(user: RegisterUser):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(400, "Email already exists")

    doc = {
        "name": user.name,
        "email": user.email,
        "password_hash": hash_password(user.password),
        "role": "buyer",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    return {"message": "User created", "user_id": str(result.inserted_id)}


@router.post("/login")
async def login(user: LoginUser):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_jwt(str(db_user["_id"]))
    await db.auth_tokens.insert_one({"user_id": db_user["_id"], "token": token})
    return {"access_token": token}
