from bson import ObjectId
from typing import Optional
from db import db

winners_collection = db.winners


async def insert_winner(winner_data: dict) -> ObjectId:
    result = await winners_collection.insert_one(winner_data)
    return result.inserted_id


async def find_winner_by_auction_id(auction_id: ObjectId) -> Optional[dict]:
    return await winners_collection.find_one({"auction_id": auction_id})


async def delete_winner_by_auction_id(auction_id: ObjectId):
    await winners_collection.delete_one({"auction_id": auction_id})

