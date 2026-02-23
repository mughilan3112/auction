from bson import ObjectId
from typing import Optional, List
from db import db

auctions_collection = db.auctions


async def insert_auction(auction_data: dict) -> ObjectId:
    result = await auctions_collection.insert_one(auction_data)
    return result.inserted_id


async def find_auction_by_id(auction_id: ObjectId) -> Optional[dict]:
    return await auctions_collection.find_one({"_id": auction_id})


async def find_active_auctions() -> List[dict]:
    cursor = auctions_collection.find({"status": "active"})
    return await cursor.to_list(length=None)


async def update_auction_fields(auction_id: ObjectId, fields: dict) -> bool:
    result = await auctions_collection.update_one({"_id": auction_id}, {"$set": fields})
    return result.matched_count == 1


async def close_auction(auction_id: ObjectId) -> bool:
    result = await auctions_collection.update_one(
        {"_id": auction_id}, {"$set": {"status": "closed"}}
    )
    return result.matched_count == 1
