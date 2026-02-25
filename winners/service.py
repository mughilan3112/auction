from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime, timezone
from db import db
from notifications.service import create_notification
from winners.models import WinnerDocument
from winners.repository import insert_winner, find_winner_by_auction_id
from auctions.repository import find_auction_by_id, update_auction_fields


async def declare_winner(auction_id: ObjectId) -> dict:
    auction = await find_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
        
    existing_winner = await find_winner_by_auction_id(auction_id)
    if existing_winner:
        return _format_winner_response(existing_winner)

    now = datetime.now(timezone.utc)
    
    # Normalize auction end_time
    end_time = auction["end_time"]
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    if now < end_time:
        raise HTTPException(status_code=400, detail="Auction is still running")
        
    if not auction.get("highest_bidder"):
        # If no bids, just close it
        await update_auction_fields(auction_id, {"status": "closed", "updated_at": now})
        raise HTTPException(status_code=400, detail="No bids placed for this auction")

    # Fetch buyer (winner) details
    buyer = await db.users.find_one({"_id": auction["highest_bidder"]})
    if not buyer:
        raise HTTPException(status_code=404, detail="Winner user not found")
    
    # Fetch seller details
    seller = await db.users.find_one({"_id": auction["seller_id"]})
    seller_doc = await db.sellers.find_one({"user_id": auction["seller_id"]})
    
    if not seller:
        raise HTTPException(status_code=404, detail="Seller user not found")

    # Create embedded documents
    buyer_info = {
        "buyer_id": str(buyer["_id"]),
        "buyer_name": buyer.get("name", "Unknown"),
        "buyer_email": buyer.get("email", ""),
    }
    
    seller_info = {
        "seller_id": str(seller["_id"]),
        "seller_name": seller.get("name", "Unknown"),
        "seller_email": seller.get("email", ""),
        "store_name": seller_doc.get("store_name") if seller_doc else None,
    }
    
    auction_info = {
        "auction_id": str(auction["_id"]),
        "title": auction.get("title", ""),
        "description": auction.get("description", ""),
        "starting_price": auction.get("starting_price", 0),
        "category": auction.get("category", "Others"),
        "image_path": auction.get("image_paths", [None])[0] if auction.get("image_paths") else None,
    }

    # Create winner_info for embedding in auction document
    winner_info_embedded = {
        "final_price": auction["current_price"],
        "declared_at": now,
        "buyer_info": buyer_info,
        "seller_info": seller_info,
    }
    
    # Update auction document with embedded winner info AND close it
    await update_auction_fields(
        auction_id, {
            "status": "closed",
            "updated_at": now,
            "winner_info": winner_info_embedded
        }
    )
    
    winner = WinnerDocument(
        auction_id=auction_id,
        winner_id=auction["highest_bidder"],
        final_price=auction["current_price"],
        buyer_info=buyer_info,
        seller_info=seller_info,
        auction_info=auction_info,
    )
    winner_id = await insert_winner(winner.to_dict())
    
    # Notify Winner
    await create_notification(
        user_id=auction["highest_bidder"],
        title="Auction Won!",
        message=f"Congratulations! You won the auction for '{auction['title']}' with a bid of ${auction['current_price']} from {seller_info['seller_name']}.",
        type="success"
    )
    
    # Notify Seller
    await create_notification(
        user_id=auction["seller_id"],
        title="Auction Ended",
        message=f"Your auction '{auction['title']}' has ended. {buyer_info['buyer_name']} has won at ${auction['current_price']}.",
        type="info"
    )

    return _format_winner_response(winner.to_dict())


def _format_winner_response(winner_doc: dict) -> dict:
    """Format winner document for API response"""
    return {
        "id": str(winner_doc["_id"]),
        "auction_id": str(winner_doc["auction_id"]),
        "winner_id": str(winner_doc["winner_id"]),
        "final_price": winner_doc["final_price"],
        "declared_at": winner_doc["declared_at"],
        "buyer_info": winner_doc.get("buyer_info"),
        "seller_info": winner_doc.get("seller_info"),
        "auction_info": winner_doc.get("auction_info"),
    }

