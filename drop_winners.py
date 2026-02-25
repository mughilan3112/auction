from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def drop():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    await client.auction_db.drop_collection("winners")
    print("Collection 'winners' dropped successfully.")

if __name__ == "__main__":
    asyncio.run(drop())
