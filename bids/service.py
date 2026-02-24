from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime, timedelta, timezone


from bids.models import BidDocument
from bids.repository import insert_bid, find_highest_bid_for_auction
from auctions.repository import find_auction_by_id, update_auction_fields

BONUS_TIME = timedelta(minutes=5)


async def place_bid(
    auction_id: ObjectId, bidder_id: ObjectId, amount: float
) -> dict:
    auction = await find_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    if auction["status"] != "active":
        raise HTTPException(status_code=400, detail="Auction is not active")
    now = datetime.now(timezone.utc)
    
    start_time = auction["start_time"]
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
        
    end_time = auction["end_time"]
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    if now < start_time:
        raise HTTPException(status_code=400, detail="Auction has not started")
    if now >= end_time:
        if auction["status"] == "active":
            await update_auction_fields(auction_id, {"status": "closed"})
        raise HTTPException(status_code=400, detail="Auction has ended")


    if bidder_id == auction["seller_id"]:
        raise HTTPException(status_code=403, detail="Seller cannot bid on own auction")

    highest_bid = await find_highest_bid_for_auction(auction_id)
    current_price = (
        highest_bid["amount"] if highest_bid else auction["starting_price"]
    )
    min_required = current_price + auction["min_increment"]
    if amount < min_required:
        raise HTTPException(
            status_code=400, detail=f"Bid must be at least {min_required}"
        )

    if end_time - now <= BONUS_TIME:
        await update_auction_fields(
            auction_id, {"end_time": end_time + BONUS_TIME}
        )


    bid = BidDocument(auction_id=auction_id, bidder_id=bidder_id, amount=amount)
    bid_id = await insert_bid(bid.to_dict())
    await update_auction_fields(
        auction_id,
        {"current_price": amount, "highest_bidder": bidder_id, "updated_at": now},
    )
    return {
        "id": str(bid_id),
        "auction_id": str(auction_id),
        "bidder_id": str(bidder_id),
        "amount": amount,
        "bid_time": bid.bid_time,
    }
