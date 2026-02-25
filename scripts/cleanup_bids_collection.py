#!/usr/bin/env python3
"""
Drops the `bids` collection from MongoDB after migrating to pure embedding model.
Bids are now stored only as embedded documents in auctions.bids array.

IMPORTANT: Run this ONLY after verifying embedded bids are present in auctions.

Usage:
  python scripts/cleanup_bids_collection.py
"""
import asyncio
import os
import sys

# Ensure project root is on sys.path
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from db import db


async def main():
    print("🗑️  Cleaning up `bids` collection...")
    print("   Bids are now stored only as embedded documents in auctions.bids")
    
    # Check if bids collection has documents
    bid_count = await db.bids.count_documents({})
    if bid_count > 0:
        print(f"⚠️  Warning: `bids` collection still has {bid_count} documents.")
        print("   Make sure migrations are complete before deleting.")
        response = input("   Continue with deletion? (yes/no): ").strip().lower()
        if response != "yes":
            print("   Cancelled.")
            return
    
    # Drop the collection
    await db.bids.drop()
    print("✅ Dropped `bids` collection successfully.")
    print("   Database now uses pure embedding model (bids in auctions.bids array only).")


if __name__ == "__main__":
    asyncio.run(main())
