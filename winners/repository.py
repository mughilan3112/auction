from bson import ObjectId
from typing import Optional, List
from db import db

winners_collection = db.winners


async def insert_winner(winner_data: dict) -> ObjectId:
    result = await winners_collection.insert_one(winner_data)
    return result.inserted_id


async def find_winner_by_auction_id(auction_id: ObjectId) -> Optional[dict]:
    return await winners_collection.find_one({"auction_id": auction_id})


async def find_winners_by_buyer_id(buyer_id: ObjectId) -> List[dict]:
    """Find all auctions won by a specific buyer"""
    cursor = winners_collection.find({"winner_id": buyer_id})
    return await cursor.to_list(length=None)


async def find_winners_by_seller_id(seller_id: ObjectId) -> List[dict]:
    """Find all auctions sold by a specific seller (where they were the seller)"""
    cursor = winners_collection.find({"seller_info.seller_id": str(seller_id)})
    return await cursor.to_list(length=None)

async def delete_winner_by_auction_id(auction_id: ObjectId):
    await winners_collection.delete_one({"auction_id": auction_id})

