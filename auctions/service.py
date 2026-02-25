from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime, timezone
from db import db



from auctions.models import AuctionDocument
from auctions.schemas import AuctionCreate
from auctions.repository import (
    insert_auction,
    find_auction_by_id,
    find_active_auctions,
    find_auctions_by_seller,
    update_auction_fields,
    clear_winner_info,
    delete_auction as repo_delete_auction,
    has_bids,
)
from bids.repository import get_bid_stats
from notifications.service import create_notification


async def _enrich_winner_document(winner_doc: dict) -> dict:
    """Enrich a legacy auction with missing winner_info sub-fields.
    Persists data directly to the auctions collection."""
    update_fields = {}
    auction_id = winner_doc["auction_id"]

    # Fetch auction data
    auction = await find_auction_by_id(auction_id)
    if not auction:
        return winner_doc

    # Enrich buyer_info
    if not winner_doc.get("buyer_info"):
        winner_id = winner_doc.get("winner_id")
        buyer = await db.users.find_one({"_id": winner_id})
        if buyer:
            winner_doc["buyer_info"] = {
                "buyer_id": str(buyer["_id"]),
                "buyer_name": buyer.get("name", "Unknown"),
                "buyer_email": buyer.get("email", ""),
            }
            update_fields["winner_info.buyer_info"] = winner_doc["buyer_info"]

    # Enrich seller_info
    if not winner_doc.get("seller_info"):
        # seller_id in auction may be user _id or seller doc _id
        seller_user = await db.users.find_one({"_id": auction["seller_id"]})
        seller_profile = None
        if seller_user:
            seller_profile = await db.sellers.find_one({"user_id": auction["seller_id"]})
        else:
            seller_profile = await db.sellers.find_one({"_id": auction["seller_id"]})
            if seller_profile:
                seller_user = await db.users.find_one({"_id": seller_profile["user_id"]})
        
        if seller_user:
            winner_doc["seller_info"] = {
                "seller_id": str(seller_user["_id"]),
                "seller_name": seller_user.get("name", "Unknown"),
                "seller_email": seller_user.get("email", ""),
                "store_name": seller_profile.get("store_name") if seller_profile else None,
            }
            update_fields["winner_info.seller_info"] = winner_doc["seller_info"]

    if update_fields:
        await db.auctions.update_one({"_id": auction_id}, {"$set": update_fields})

    return winner_doc


async def declare_winner(auction_id: ObjectId) -> dict:
    auction = await find_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
        
    if auction.get("winner_info"):
        winner_data = {
            "auction_id": auction_id,
            "winner_id": ObjectId(auction["winner_info"]["buyer_info"]["buyer_id"]) if auction["winner_info"].get("buyer_info") else auction.get("highest_bidder"),
            **auction["winner_info"]
        }
        if not winner_data.get("buyer_info") or not winner_data.get("seller_info"):
            winner_data = await _enrich_winner_document(winner_data)
        return _format_winner_response(winner_data, auction)

    now = datetime.now(timezone.utc)
    
    # Normalize auction end_time
    end_time = auction["end_time"]
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    if now < end_time:
        raise HTTPException(status_code=400, detail="Auction is still running")
        
    if not auction.get("highest_bidder"):
        await update_auction_fields(auction_id, {"status": "closed", "updated_at": now})
        raise HTTPException(status_code=400, detail="No bids placed for this auction")

    # Fetch buyer (winner) details
    buyer = await db.users.find_one({"_id": auction["highest_bidder"]})
    if not buyer:
        raise HTTPException(status_code=404, detail="Winner user not found")
    
    # Fetch seller details
    seller_user = await db.users.find_one({"_id": auction["seller_id"]})
    seller_doc = None
    if seller_user:
        seller_doc = await db.sellers.find_one({"user_id": auction["seller_id"]})
    else:
        seller_doc = await db.sellers.find_one({"_id": auction["seller_id"]})
        if seller_doc:
            seller_user = await db.users.find_one({"_id": seller_doc["user_id"]})
    
    if not seller_user:
        raise HTTPException(status_code=404, detail="Seller user not found")

    buyer_info = {
        "buyer_id": str(buyer["_id"]),
        "buyer_name": buyer.get("name", "Unknown"),
        "buyer_email": buyer.get("email", ""),
    }
    
    seller_info = {
        "seller_id": str(seller_user["_id"]),
        "seller_name": seller_user.get("name", "Unknown"),
        "seller_email": seller_user.get("email", ""),
        "store_name": seller_doc.get("store_name") if seller_doc else None,
    }
    
    winner_info_embedded = {
        "final_price": auction["current_price"],
        "declared_at": now,
        "buyer_info": buyer_info,
        "seller_info": seller_info,
    }
    
    await update_auction_fields(
        auction_id, {
            "status": "closed",
            "updated_at": now,
            "winner_info": winner_info_embedded
        }
    )
    
    await create_notification(
        user_id=auction["highest_bidder"],
        title="Auction Won!",
        message=f"Congratulations! You won the auction for '{auction['title']}' with a bid of ₹{auction['current_price']} from {seller_info['seller_name']}.",
        type="success"
    )
    
    await create_notification(
        user_id=auction["seller_id"],
        title="Auction Ended",
        message=f"Your auction '{auction['title']}' has ended. {buyer_info['buyer_name']} has won at ₹{auction['current_price']}.",
        type="info"
    )

    winner_response_data = {
        "_id": auction_id,
        "auction_id": auction_id,
        "winner_id": auction["highest_bidder"],
        **winner_info_embedded
    }
    return _format_winner_response(winner_response_data, auction)


def _format_winner_response(winner_doc: dict, auction_doc: dict = None) -> dict:
    """Format winner data for API response."""
    auction_info = None
    if auction_doc:
        auction_info = {
            "auction_id": str(auction_doc["_id"]),
            "title": auction_doc.get("title", ""),
            "description": auction_doc.get("description", ""),
            "starting_price": auction_doc.get("starting_price", 0),
            "category": auction_doc.get("category", "Others"),
            "image_path": auction_doc.get("image_paths", [None])[0] if auction_doc.get("image_paths") else None,
        }

    return {
        "id": str(winner_doc.get("_id", winner_doc.get("auction_id", ""))),
        "auction_id": str(winner_doc.get("auction_id", "")),
        "winner_id": str(winner_doc.get("winner_id", "")),
        "final_price": winner_doc.get("final_price", 0),
        "declared_at": winner_doc.get("declared_at"),
        "buyer_info": winner_doc.get("buyer_info"),
        "seller_info": winner_doc.get("seller_info"),
        "auction_info": auction_info
    }


async def get_my_won_auctions_logic(user_id: ObjectId):
    from auctions.repository import find_winners_by_buyer_id
    auctions = await find_winners_by_buyer_id(user_id)
    result = []
    for a in auctions:
        winner_data = {
            "auction_id": a["_id"],
            "winner_id": user_id,
            **a["winner_info"]
        }
        if not winner_data.get("buyer_info") or not winner_data.get("seller_info"):
            winner_data = await _enrich_winner_document(winner_data)
        result.append(_format_winner_response(winner_data, a))
    return result


async def get_my_sold_auctions_logic(user_id: ObjectId):
    from auctions.repository import find_winners_by_seller_id
    auctions = await find_winners_by_seller_id(user_id)
    result = []
    for a in auctions:
        winner_data = {
            "auction_id": a["_id"],
            "winner_id": ObjectId(a["winner_info"]["buyer_info"]["buyer_id"]) if a["winner_info"].get("buyer_info") else a.get("highest_bidder"),
            **a["winner_info"]
        }
        if not winner_data.get("buyer_info") or not winner_data.get("seller_info"):
            winner_data = await _enrich_winner_document(winner_data)
        result.append(_format_winner_response(winner_data, a))
    return result



async def create_auction(seller_id: ObjectId, data: AuctionCreate, image_paths: list = None) -> dict:
    # Ensure datetimes are aware UTC
    if data.start_time.tzinfo is None:
        data.start_time = data.start_time.replace(tzinfo=timezone.utc)
    if data.end_time.tzinfo is None:
        data.end_time = data.end_time.replace(tzinfo=timezone.utc)

    if data.start_time >= data.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    
    if data.starting_price <= 0 or data.min_increment <= 0:
        raise HTTPException(status_code=400, detail="Invalid pricing values")

    auction = AuctionDocument(
        seller_id=seller_id,
        title=data.title,
        description=data.description,
        starting_price=data.starting_price,
        min_increment=data.min_increment,
        start_time=data.start_time,
        end_time=data.end_time,
        image_paths=image_paths,
        category=data.category or "Others",
    )

    
    # Determine status based on time
    now = datetime.now(timezone.utc)
    if now < data.start_time:
        auction.status = "pending"
    elif now >= data.end_time:
        auction.status = "closed"
    else:
        auction.status = "active"



    auction_id = await insert_auction(auction.to_dict())
    created = await find_auction_by_id(auction_id)
    return _format_auction_response(created)


async def list_active_auctions(query: str = None, categories: list = None, sorts: list = None) -> list:
    now = datetime.now(timezone.utc)
    auctions = await find_active_auctions(query, categories, sorts)




    result = []
    for a in auctions:
        # Sync status: ensure naive values from DB are treated as UTC
        end_time = a["end_time"]
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
            
        if now >= end_time:
            if a["status"] != "closed":
                try:
                    await declare_winner(a["_id"])
                except Exception:
                    # Likely no bids, still need to close it
                    await update_auction_fields(a["_id"], {"status": "closed"})
            continue

            
        # Also sync 'pending' vs 'active'
        start_time = a["start_time"]
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
            
        if now < start_time:
            if a["status"] != "pending":
                await update_auction_fields(a["_id"], {"status": "pending"})
        else:
            if a["status"] == "pending":
                await update_auction_fields(a["_id"], {"status": "active"})
                
        result.append(await _format_auction_list_response(a))


    return result



async def list_seller_auctions(seller_id: ObjectId) -> list:
    auctions = await find_auctions_by_seller(seller_id)
    return [await _format_auction_list_response(a) for a in auctions]



async def get_auction(auction_id: ObjectId) -> dict:
    auction = await find_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    now = datetime.now(timezone.utc)
    end_time = auction["end_time"]
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    # Sync status with time
    start_time = auction["start_time"]
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)

    if now >= end_time:
        if auction["status"] != "closed":
            try:
                await declare_winner(auction_id)
            except Exception:
                await update_auction_fields(auction_id, {"status": "closed"})
            # Re-fetch auction to get the freshly embedded winner_info
            auction = await find_auction_by_id(auction_id)
            if not auction:
                raise HTTPException(status_code=404, detail="Auction not found")

        # Handle legacy closed auctions that are missing embedded winner_info
        if not auction.get("winner_info") and auction.get("highest_bidder"):
            try:
                await declare_winner(auction_id)
                auction = await find_auction_by_id(auction_id)
                if not auction:
                    raise HTTPException(status_code=404, detail="Auction not found")
            except Exception:
                pass

    elif now < start_time:
        if auction["status"] != "pending":
            await update_auction_fields(auction_id, {"status": "pending"})
            auction["status"] = "pending"
    else:
        # It's in the middle, should be active
        if auction["status"] != "active":
            await update_auction_fields(auction_id, {"status": "active"})
            auction["status"] = "active"
            
        # If it was closed before but now isn't (e.g. end_time extended), clear winner
        if auction["status"] == "closed":
            await clear_winner_info(auction_id)


        
    stats = await get_bid_stats(auction_id)
    return _format_auction_response(auction, stats)


async def update_auction(auction_id: ObjectId, seller_id: ObjectId, data: AuctionCreate, image_paths: list = None) -> dict:
    auction = await find_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction["seller_id"] != seller_id:
        raise HTTPException(status_code=403, detail="You do not own this auction")

    # Ensure datetimes are aware UTC
    if data.start_time.tzinfo is None:
        data.start_time = data.start_time.replace(tzinfo=timezone.utc)
    if data.end_time.tzinfo is None:
        data.end_time = data.end_time.replace(tzinfo=timezone.utc)

    update_data = {
        "title": data.title,
        "description": data.description,
        "starting_price": data.starting_price,
        "min_increment": data.min_increment,
        "start_time": data.start_time,

        "end_time": data.end_time,
        "category": data.category or "Others",
        "updated_at": datetime.now(timezone.utc),
    }

    
    if image_paths:
        update_data["image_paths"] = image_paths
    
    # Logic: Status depends on Start and End Time
    now = datetime.now(timezone.utc)
    if now < data.start_time:
        update_data["status"] = "pending"
    elif now >= data.end_time:
        update_data["status"] = "closed"
    else:
        update_data["status"] = "active"
        # Reactivate: Clear winner if status was previously closed and now it's active
        if auction["status"] == "closed":
            await clear_winner_info(auction_id)


    
    await update_auction_fields(auction_id, update_data)
    updated = await find_auction_by_id(auction_id)
    stats = await get_bid_stats(auction_id)
    return _format_auction_response(updated, stats)


async def delete_auction(auction_id: ObjectId, seller_id: ObjectId) -> dict:
    auction = await find_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction["seller_id"] != seller_id:
        raise HTTPException(status_code=403, detail="You do not own this auction")

    if await has_bids(auction_id):
        raise HTTPException(status_code=400, detail="Cannot delete auction with bids")

    await repo_delete_auction(auction_id)
    return {"message": "Auction deleted successfully"}


def _format_auction_response(auction: dict, stats: dict = None) -> dict:
    # Ensure datetimes are aware UTC for the response
    start_time = auction["start_time"]
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    
    end_time = auction["end_time"]
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    response = {
        "id": str(auction["_id"]),
        "seller_id": str(auction["seller_id"]),
        "title": auction["title"],
        "description": auction["description"],
        "starting_price": auction["starting_price"],
        "current_price": auction["current_price"],
        "highest_bidder": (
            str(auction["highest_bidder"]) if auction.get("highest_bidder") else None
        ),
        "min_increment": auction["min_increment"],
        "start_time": start_time,
        "end_time": end_time,
        "status": auction["status"],
        "image_paths": auction.get("image_paths", []),
        "created_at": auction["created_at"],
        "updated_at": auction["updated_at"],
        "category": auction.get("category", "Others"),
        "stats": stats,
        "bids": [
            {
                "bid_number": b.get("bid_number", i + 1),  # fallback to index if not present
                "bidder_id": str(b.get("bidder_id")) if b.get("bidder_id") else None,
                "amount": b.get("amount"),
                "bid_time": b.get("bid_time"),
            }
            for i, b in enumerate(auction.get("bids", []))
        ],
    }

    # Include embedded winner info if auction is closed
    if auction.get("winner_info"):
        winner_info = auction["winner_info"]
        response["winner_info"] = {
            "final_price": winner_info.get("final_price"),
            "declared_at": winner_info.get("declared_at"),
            "buyer_info": winner_info.get("buyer_info"),
            "seller_info": winner_info.get("seller_info"),
        }
    else:
        response["winner_info"] = None

    return response




async def _format_auction_list_response(auction: dict) -> dict:
    image_paths = auction.get("image_paths", [])
    thumbnail = image_paths[0] if image_paths else auction.get("image_path")
    
    start_time = auction["start_time"]
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
        
    end_time = auction["end_time"]
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    response = {
        "id": str(auction["_id"]),
        "title": auction["title"],
        "current_price": auction["current_price"],
        "start_time": start_time,
        "end_time": end_time,
        "status": auction["status"],
        "category": auction.get("category", "Others"),
        "image_path": thumbnail,
    }


    if auction["status"] == "closed" and auction.get("highest_bidder"):
        winner_user = await db.users.find_one({"_id": auction["highest_bidder"]})
        if winner_user:
            response["winner_name"] = winner_user.get("name")
            response["winner_id"] = str(winner_user["_id"])

    return response



