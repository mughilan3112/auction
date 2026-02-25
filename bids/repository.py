from bson import ObjectId
from typing import List, Optional
from db import db
from core.config import BIDS_EMBED_LIMIT

bids_collection = db.bids


async def insert_bid(bid_data: dict) -> ObjectId:
    result = await bids_collection.insert_one(bid_data)
    # Also push a cleaned copy of the bid into the parent auction's embedded bids array
    try:
        # Exclude redundant fields when embedding (don't include auction_id or _id)
        embedded_bid = {k: v for k, v in bid_data.items() if k not in ("auction_id", "_id")}
        
        # Get current bid count to assign bid_number for database clarity
        auction = await db.auctions.find_one(
            {"_id": bid_data["auction_id"]},
            {"bids": 1}
        )
        current_bid_count = len(auction.get("bids", [])) if auction else 0
        embedded_bid["bid_number"] = current_bid_count + 1
        
        # Push and trim to keep only the most recent N bids (hybrid model)
        try:
            await db.auctions.update_one(
                {"_id": bid_data["auction_id"]},
                {
                    "$push": {
                        "bids": {
                            "$each": [embedded_bid],
                            "$slice": -BIDS_EMBED_LIMIT,
                        }
                    }
                },
            )
        except Exception:
            # If embedding fails, keep primary bid in bids collection — don't break workflow
            pass
    except Exception:
        # If embedding fails, keep primary bid in bids collection — don't break workflow
        pass
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

