#!/usr/bin/env python3
"""Idempotent migration: copy existing documents from `bids` collection
into their parent auction's `bids` array. Safe to run multiple times.

Usage:
  python scripts/migrate_bids_to_auctions.py
"""
import asyncio
import os
import sys

# Ensure project root is on sys.path so `from db import db` works
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from db import db
from core.config import BIDS_EMBED_LIMIT
import argparse


async def main(dry_run: bool = False, limit: int | None = None):
    limit = limit or BIDS_EMBED_LIMIT
    auction_ids = await db.bids.distinct("auction_id")
    total_auctions = len(auction_ids)
    processed = 0
    for aid in auction_ids:
        # fetch last `limit` bids for this auction (newest first)
        cursor = db.bids.find({"auction_id": aid}).sort("bid_time", -1).limit(limit)
        bids = []
        async for b in cursor:
            embedded_bid = {k: v for k, v in b.items() if k not in ("auction_id", "_id")}
            bids.append(embedded_bid)

        # reverse so chronological ascending
        bids = list(reversed(bids))
        # Add bid_number for database clarity (Bid 1, Bid 2, etc)
        for idx, bid in enumerate(bids, start=1):
            bid["bid_number"] = idx
        processed += 1
        if dry_run:
            print(f"[dry-run] Auction {aid}: would set {len(bids)} embedded bids")
            continue

        if bids:
            res = await db.auctions.update_one({"_id": aid}, {"$set": {"bids": bids}})
            if getattr(res, "modified_count", 0):
                print(f"Updated auction {aid} with {len(bids)} bids")

    print(f"Processed {processed}/{total_auctions} auctions.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without changing DB")
    parser.add_argument("--limit", type=int, default=None, help="Number of recent bids to embed per auction (overrides config)")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run, limit=args.limit))
