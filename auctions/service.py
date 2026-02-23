from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime

from auctions.models import AuctionDocument
from auctions.schemas import AuctionCreate
from auctions.repository import (
    insert_auction,
    find_auction_by_id,
    find_active_auctions,
)


async def create_auction(seller_id: ObjectId, data: AuctionCreate) -> dict:
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
    )
    auction_id = await insert_auction(auction.to_dict())
    created = await find_auction_by_id(auction_id)
    return _format_auction_response(created)


async def list_active_auctions() -> list:
    auctions = await find_active_auctions()
    return [_format_auction_list_response(a) for a in auctions]


async def get_auction(auction_id: ObjectId) -> dict:
    auction = await find_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return _format_auction_response(auction)


def _format_auction_response(auction: dict) -> dict:
    return {
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
        "start_time": auction["start_time"],
        "end_time": auction["end_time"],
        "status": auction["status"],
        "created_at": auction["created_at"],
        "updated_at": auction["updated_at"],
    }


def _format_auction_list_response(auction: dict) -> dict:
    return {
        "id": str(auction["_id"]),
        "title": auction["title"],
        "current_price": auction["current_price"],
        "end_time": auction["end_time"],
        "status": auction["status"],
    }
