from bson import ObjectId
from typing import Optional, List
from db import db

auctions_collection = db.auctions


async def insert_auction(auction_data: dict) -> ObjectId:
    result = await auctions_collection.insert_one(auction_data)
    return result.inserted_id


async def find_auction_by_id(auction_id: ObjectId) -> Optional[dict]:
    return await auctions_collection.find_one({"_id": auction_id})


async def find_active_auctions(
    query: Optional[str] = None, 
    categories: Optional[List[str]] = None, 
    sort_list: Optional[List[str]] = None
) -> List[dict]:
    match_stage = {"status": {"$in": ["active", "pending"]}}
    
    if query:
        match_stage["$or"] = [
            {"title": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}}
        ]
    
    if categories and "All" not in categories:
        match_stage["category"] = {"$in": categories}

    pipeline = [{"$match": match_stage}]
    
    # Handle compound sorting
    sort_dict = {}
    if sort_list:
        for s in sort_list:
            if s == "price_asc": sort_dict["current_price"] = 1
            elif s == "price_desc": sort_dict["current_price"] = -1
            elif s == "oldest": sort_dict["created_at"] = 1
            elif s == "newest": sort_dict["created_at"] = -1
    
    # Default sort if nothing selected
    if not sort_dict:
        sort_dict["created_at"] = -1
        
    pipeline.append({"$sort": sort_dict})

    cursor = auctions_collection.aggregate(pipeline)
    return await cursor.to_list(length=None)







async def find_auctions_by_seller(seller_id: ObjectId) -> List[dict]:
    cursor = auctions_collection.find({"seller_id": seller_id})
    return await cursor.to_list(length=None)



async def update_auction_fields(auction_id: ObjectId, fields: dict) -> bool:
    result = await auctions_collection.update_one({"_id": auction_id}, {"$set": fields})
    return result.matched_count == 1


async def close_auction(auction_id: ObjectId) -> bool:
    result = await auctions_collection.update_one(
        {"_id": auction_id}, {"$set": {"status": "closed"}}
    )
    return result.matched_count == 1


async def delete_auction(auction_id: ObjectId) -> bool:
    result = await auctions_collection.delete_one({"_id": auction_id})
    return result.deleted_count == 1


async def has_bids(auction_id: ObjectId) -> bool:
    count = await db.bids.count_documents({"auction_id": auction_id})
    return count > 0

