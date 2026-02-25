# Hybrid Embedding Schema Migration Guide

## Overview

Changed from **pure reference** to **hybrid embedding** model:
- **Full bid history** stored in `bids` collection (authoritative)
- **Last N bids** embedded in `auctions.bids` array (fast access in auction detail)
- **Benefits:** Scalability + performance without document size issues

---

## ✅ Changes Made

### 1. Schemas Updated

#### `auctions/schemas.py`
- Added `EmbeddedBid` model:
  ```python
  class EmbeddedBid(BaseModel):
      bidder_id: str
      amount: float
      bid_time: datetime
  ```
- Updated `AuctionResponse.bids` to use `list[EmbeddedBid]` (was `list[dict]`)

#### `bids/schemas.py`
- `BidCreate`: unchanged (still requires `auction_id` and `amount`)
- Added `EmbeddedBid` model (same as above, for consistency)
- `BidResponse`: unchanged (includes full reference: `id`, `auction_id`, `bidder_id`, `amount`, `bid_time`)

### 2. Backend Updated

#### `core/config.py`
- Added `BIDS_EMBED_LIMIT` (default: 5, override via `BIDS_EMBED_LIMIT` env var)

#### `bids/repository.py`
- When inserting a bid:
  - Still writes to `bids` collection (primary store)
  - Also pushes cleaned bid into `auctions.bids` array
  - Uses MongoDB `$push` with `$each` + `$slice` to keep only last N bids
  - Error in embedding **does not** break the workflow

#### `auctions/service.py`
- `_format_auction_response()`: formats embedded bids without `_id` or `auction_id`
- Embedded bids are returned as `list[EmbeddedBid]`

#### `scripts/migrate_bids_to_auctions.py`
- Idempotent migration script (safe to re-run)
- Embeds last N bids per auction (N from config or `--limit` override)
- Supports `--dry-run` (preview mode)
- Excludes `_id` and `auction_id` from embedded documents

### 3. Frontend Updated

#### `src/pages/AuctionDetail.jsx`
- Updated bid appending logic to exclude `_id` (embedded bids don't have it)
- Bid list rendering already compatible (uses `b.bidder_id`, `b.amount`, `b.bid_time`)
- Displays last N bids in "Recent Bids" section

---

## 📋 What Fields Are Where?

### Reference Bid (in `bids` collection)
```json
{
  "_id": ObjectId(),
  "auction_id": ObjectId(),
  "bidder_id": ObjectId(),
  "amount": 1200,
  "bid_time": ISODate()
}
```

### Embedded Bid (in `auctions.bids` array)
```json
{
  "bidder_id": ObjectId(),
  "amount": 1200,
  "bid_time": ISODate()
}
```

---

## 🚀 How to Deploy

### Step 1: Update Environment (Optional)
```bash
# If you want a different embed limit (default is 5):
export BIDS_EMBED_LIMIT=10
```

### Step 2: Dry-Run Migration (Recommended)
```bash
cd /path/to/auction
python scripts/migrate_bids_to_auctions.py --dry-run
```
Output shows what would be embedded per auction.

### Step 3: Run Migration
```bash
# With default limit (5 bids per auction)
python scripts/migrate_bids_to_auctions.py

# Or override limit
python scripts/migrate_bids_to_auctions.py --limit 10
```

### Step 4: Verify in MongoDB
```javascript
use auction_db
db.auctions.findOne({status: "active"}, {title: 1, bids: 1})
```
Expected output:
```json
{
  "_id": ObjectId("..."),
  "title": "...",
  "bids": [
    {
      "bidder_id": ObjectId("..."),
      "amount": 1200,
      "bid_time": ISODate("...")
    }
  ]
}
```

### Step 5: Deploy Code
```bash
# Backend: uvicorn picks up new schemas/config automatically
# Frontend: already updated and backward-compatible
npm run dev  # if frontend needs rebuild
```

---

## ✅ Backward Compatibility

- ✅ **Old bids collection still exists** (full history preserved)
- ✅ **New bids automatically embedded** on each insert
- ✅ **Frontend works with or without embedded bids** (safe fallback)
- ✅ **API responses include embedded bids** (if present)
- ✅ **No breaking changes** to existing endpoints

---

## 🔄 Rollback Plan

If needed:
1. Stop inserting into `auctions.bids` (revert `bids/repository.py` changes)
2. Keep historical data in `bids` collection
3. Frontend will still work (just won't display embedded bids)
4. No data loss

---

## 📚 Architecture Benefits

| Aspect | Before | After |
| --- | --- | --- |
| Query auction detail | Separate query for bids | Bids included (faster) |
| Bid history | Full | Full + last N cached |
| Document size | N/A | Bounded (max N bids) |
| Scalability | Good | Better (no 16MB limit) |
| Write performance | Fast | Fast + async embedding |

---

## 🐛 Troubleshooting

### Migration fails to import `db`
```bash
PYTHONPATH=. python scripts/migrate_bids_to_auctions.py
```

### Embedded bids not showing in frontend
1. Verify migration ran: `python scripts/migrate_bids_to_auctions.py --dry-run`
2. Check MongoDB: `db.auctions.findOne({}, {bids: 1})`
3. Restart backend/frontend

### Want to change embed limit later
```bash
# Update config or env var, then re-run migration
python scripts/migrate_bids_to_auctions.py --limit 20
```

---

## 📝 Summary

- **Schemas:** EmbeddedBid added; AuctionResponse.bids now typed
- **Backend:** Hybrid embedding on insert; config-driven limit
- **Frontend:** Already compatible; bid list renders without breaking
- **Migration:** Idempotent, supports dry-run and limit override
- **Safety:** Full history in bids collection; no data loss

**Next:** Run dry-run migration and verify structure in MongoDB.
