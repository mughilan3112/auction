from bson import ObjectId
from typing import List, Optional
from db import db
from core.config import BIDS_EMBED_LIMIT

# Note: bids are now stored only as embedded documents in auctions.bids array
# No separate `bids` collection - pure embedding model


async def insert_bid(bid_data: dict) -> ObjectId:
    """Insert a bid by embedding it in the parent auction's bids array.
    Returns the generated ObjectId for the bid document (for API response).
    """
    # Extract auction_id before processing
    auction_id = bid_data["auction_id"]
    
    # Exclude redundant fields when embedding (don't include auction_id or _id)
    embedded_bid = {k: v for k, v in bid_data.items() if k not in ("auction_id", "_id")}
    
    # Get current bid count to assign bid_number for database clarity
    auction = await db.auctions.find_one(
        {"_id": auction_id},
        {"bids": 1}
    )
    current_bid_count = len(auction.get("bids", [])) if auction else 0
    embedded_bid["bid_number"] = current_bid_count + 1
    
    # Push and trim to keep only the most recent N bids (hybrid model)
    result = await db.auctions.update_one(
        {"_id": auction_id},
        {
            "$push": {
                "bids": {
                    "$each": [embedded_bid],
                    "$slice": -BIDS_EMBED_LIMIT,
                }
            }
        },
    )
    
    # Generate a pseudo-ID for the response (not stored in DB)
    generated_id = ObjectId()
    return generated_id


async def find_bids_for_auction(auction_id: ObjectId) -> List[dict]:
    """Find all bids for an auction from embedded array (sorted by bid_time ascending)."""
    auction = await db.auctions.find_one({"_id": auction_id}, {"bids": 1})
    if not auction:
        return []
    
    bids = auction.get("bids", [])
    # Sort by bid_time ascending
    bids_sorted = sorted(bids, key=lambda b: b.get("bid_time", 0))
    return bids_sorted


async def find_highest_bid_for_auction(auction_id: ObjectId) -> Optional[dict]:
    """Find the highest bid for an auction from embedded array."""
    auction = await db.auctions.find_one({"_id": auction_id}, {"bids": 1})
    if not auction:
        return None
    
    bids = auction.get("bids", [])
    if not bids:
        return None
    
    # Return bid with highest amount
    highest = max(bids, key=lambda b: b.get("amount", 0))
    return highest


async def get_bid_stats(auction_id: ObjectId) -> dict:
    """Calculate bid stats from embedded bids array."""
    auction = await db.auctions.find_one({"_id": auction_id}, {"bids": 1})
    if not auction:
        return {
            "total_bids": 0,
            "average_bid": 0,
            "highest_bid": 0,
            "lowest_bid": 0
        }
    
    bids = auction.get("bids", [])
    if not bids:
        return {
            "total_bids": 0,
            "average_bid": 0,
            "highest_bid": 0,
            "lowest_bid": 0
        }
    
    amounts = [b.get("amount", 0) for b in bids]
    return {
        "total_bids": len(bids),
        "average_bid": sum(amounts) / len(amounts) if amounts else 0,
        "highest_bid": max(amounts) if amounts else 0,
        "lowest_bid": min(amounts) if amounts else 0
    }

