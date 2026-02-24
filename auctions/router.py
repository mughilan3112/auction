from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query
from bson import ObjectId
from datetime import datetime
import os
import uuid

from auctions.schemas import AuctionCreate, AuctionResponse, AuctionListResponse
from auctions.service import create_auction, list_active_auctions, get_auction, update_auction, delete_auction, list_seller_auctions
from users.routes import get_current_user
from db import db

router = APIRouter(prefix="/auctions", tags=["Auctions"])

UPLOAD_DIR = "static/uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


async def get_current_seller_id(user=Depends(get_current_user)):
    seller = await db.sellers.find_one({"user_id": user["_id"]})
    if not seller:
        raise HTTPException(status_code=403, detail="Must be a seller to perform this action")
    return seller["_id"]


@router.get("/my-auctions", response_model=list[AuctionListResponse])
async def list_my_auctions_api(seller_id: ObjectId = Depends(get_current_seller_id)):
    return await list_seller_auctions(seller_id)



@router.post("/create", response_model=AuctionResponse)
async def create_auction_api(
    title: str = Form(...),
    description: str = Form(...),
    starting_price: float = Form(...),
    min_increment: float = Form(...),
    start_time: datetime = Form(...),
    end_time: datetime = Form(...),
    category: str = Form("Others"),
    images: list[UploadFile] = File(...),
    seller_id: ObjectId = Depends(get_current_seller_id)

):
    image_paths = []
    for image in images:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            buffer.write(image.file.read())
        image_paths.append(f"/static/uploads/{filename}")

    data = AuctionCreate(
        title=title,
        description=description,
        starting_price=starting_price,
        min_increment=min_increment,
        start_time=start_time,
        end_time=end_time,
        category=category
    )


    return await create_auction(seller_id=seller_id, data=data, image_paths=image_paths)


@router.get("/", response_model=list[AuctionListResponse])
async def list_auctions_api(
    q: str = None, 
    category: list[str] = Query(None), 
    sort: list[str] = Query(None)
):
    return await list_active_auctions(q, category, sort)





@router.get("/{auction_id}", response_model=AuctionResponse)
async def get_auction_api(auction_id: str):
    try:
        obj_id = ObjectId(auction_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid auction ID format")
    
    return await get_auction(obj_id)




@router.put("/{auction_id}", response_model=AuctionResponse)
async def update_auction_api(
    auction_id: str,
    title: str = Form(...),
    description: str = Form(...),
    starting_price: float = Form(...),
    min_increment: float = Form(...),
    start_time: datetime = Form(...),
    end_time: datetime = Form(...),
    category: str = Form("Others"),
    images: list[UploadFile] = File(None),
    seller_id: ObjectId = Depends(get_current_seller_id)

):
    try:
        current_image_paths = []
        if images:
            for image in images:
                if not image.filename: continue
                ext = os.path.splitext(image.filename)[1].lower()
                if ext in ALLOWED_EXTENSIONS:
                    filename = f"{uuid.uuid4()}{ext}"
                    file_path = os.path.join(UPLOAD_DIR, filename)
                    with open(file_path, "wb") as buffer:
                        buffer.write(image.file.read())
                    current_image_paths.append(f"/static/uploads/{filename}")

        data = AuctionCreate(
            title=title,
            description=description,
            starting_price=starting_price,
            min_increment=min_increment,
            start_time=start_time,
            end_time=end_time,
            category=category
        )

        return await update_auction(ObjectId(auction_id), seller_id, data, current_image_paths if current_image_paths else None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))




@router.delete("/{auction_id}")
async def delete_auction_api(
    auction_id: str,
    seller_id: ObjectId = Depends(get_current_seller_id)
):
    try:
        return await delete_auction(ObjectId(auction_id), seller_id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid auction ID")

