from bson import ObjectId
from typing import List, Optional
from db import db

bids_collection = db.bids


async def insert_bid(bid_data: dict) -> ObjectId:
    result = await bids_collection.insert_one(bid_data)
    return result.inserted_id


async def find_bids_for_auction(auction_id: ObjectId) -> List[dict]:
    cursor = bids_collection.find({"auction_id": auction_id}).sort("bid_time", 1)
    return await cursor.to_list(length=None)


async def find_highest_bid_for_auction(auction_id: ObjectId) -> Optional[dict]:
    return await bids_collection.find_one(
        {"auction_id": auction_id}, sort=[("amount", -1)]
    )
