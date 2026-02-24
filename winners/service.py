from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime, timezone
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
        return {
            "id": str(existing_winner["_id"]),
            "auction_id": str(auction_id),
            "winner_id": str(existing_winner["winner_id"]),
            "final_price": existing_winner["final_price"],
            "declared_at": existing_winner["declared_at"],
        }

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

    await update_auction_fields(
        auction_id, {"status": "closed", "updated_at": now}
    )
    winner = WinnerDocument(
        auction_id=auction_id,
        winner_id=auction["highest_bidder"],
        final_price=auction["current_price"],
    )
    winner_id = await insert_winner(winner.to_dict())
    
    # Notify Winner
    await create_notification(
        user_id=auction["highest_bidder"],
        title="Auction Won!",
        message=f"Congratulations! You won the auction for '{auction['title']}' with a bid of ${auction['current_price']}.",
        type="success"
    )
    
    # Notify Seller
    await create_notification(
        user_id=auction["seller_id"],
        title="Auction Ended",
        message=f"Your auction '{auction['title']}' has ended. Winner has been declared.",
        type="info"
    )

    return {
        "id": str(winner_id),
        "auction_id": str(auction_id),
        "winner_id": str(winner.winner_id),
        "final_price": winner.final_price,
        "declared_at": winner.declared_at,
    }

