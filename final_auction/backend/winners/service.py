from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime

from winners.models import WinnerDocument
from winners.repository import insert_winner, find_winner_by_auction_id
from auctions.repository import find_auction_by_id, update_auction_fields


async def declare_winner(auction_id: ObjectId) -> dict:
    auction = await find_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    existing_winner = await find_winner_by_auction_id(auction_id)
    if existing_winner:
        raise HTTPException(status_code=400, detail="Winner already declared")
    now = datetime.utcnow()
    if auction["status"] == "active" and now < auction["end_time"]:
        raise HTTPException(status_code=400, detail="Auction is still running")
    if not auction.get("highest_bidder"):
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
    return {
        "id": str(winner_id),
        "auction_id": str(auction_id),
        "winner_id": str(winner.winner_id),
        "final_price": winner.final_price,
        "declared_at": winner.declared_at,
    }
