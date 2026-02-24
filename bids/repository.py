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


async def get_bid_stats(auction_id: ObjectId) -> dict:
    pipeline = [
        {"$match": {"auction_id": auction_id}},
        {
            "$group": {
                "_id": "$auction_id",
                "total_bids": {"$sum": 1},
                "average_bid": {"$avg": "$amount"},
                "highest_bid": {"$max": "$amount"},
                "lowest_bid": {"$min": "$amount"}
            }
        }
    ]
    cursor = bids_collection.aggregate(pipeline)
    result = await cursor.to_list(length=1)
    if result:
        res = result[0]
        return {
            "total_bids": res.get("total_bids", 0),
            "average_bid": res.get("average_bid", 0),
            "highest_bid": res.get("highest_bid", 0),
            "lowest_bid": res.get("lowest_bid", 0)
        }
    return {
        "total_bids": 0,
        "average_bid": 0,
        "highest_bid": 0,
        "lowest_bid": 0
    }

