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
    delete_auction as repo_delete_auction,
    has_bids,
)
from bids.repository import get_bid_stats
from winners.repository import delete_winner_by_auction_id
from winners.service import declare_winner



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
                auction["status"] = "closed"
            except Exception:
                await update_auction_fields(auction_id, {"status": "closed"})
                auction["status"] = "closed"

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
            await delete_winner_by_auction_id(auction_id)


        
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
            await delete_winner_by_auction_id(auction_id)


    
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



