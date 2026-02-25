# Winner Embedded Documentation Feature

## Overview
This feature implements embedded documentation in the winners collection to enable buyers and sellers to know each other after an auction ends. The winner document now embeds:
- **Buyer Information** (for sellers to identify who won)
- **Seller Information** (for buyers to know who they bought from)
- **Auction/Product Details** (winning product information including title, description, price, category, and image)

## Architecture Design

### Data Model Changes

#### Auctions Collection - With Winner Info
```python
{
  "_id": ObjectId,
  "seller_id": ObjectId,
  "title": str,
  "status": "closed",
  "current_price": float,
  "winner_info": {
    "final_price": float,
    "declared_at": datetime,
    "buyer_info": {
      "buyer_id": str,
      "buyer_name": str,
      "buyer_email": str
    },
    "seller_info": {
      "seller_id": str,
      "seller_name": str,
      "seller_email": str,
      "store_name": str (optional)
    }
  }
}
```
*Note: The separate `winners` collection has been decommissioned.*

## Implementation Details

### Backend Changes

#### 1. **Schema Updates** (`winners/schemas.py`)
- Added `EmbeddedBuyerInfo` - Contains buyer name, email, and ID
- Added `EmbeddedSellerInfo` - Contains seller name, email, store name, and ID
- Added `EmbeddedAuctionInfo` - Contains product details
- Updated `WinnerResponse` to include these embedded documents

#### 2. **Model Updates** (`winners/models.py`)
- Modified `WinnerDocument` constructor to accept `buyer_info`, `seller_info`, and `auction_info` parameters
- All embedded data passed as dictionaries during document creation

#### 3. **Service Layer** (`winners/service.py`)
- Enhanced `declare_winner()` function to:
  - Fetch buyer (winner) details from users collection
  - Fetch seller details from users and sellers collections
  - Extract auction/product information
  - Create embedded documents
  - Pass embedded data to `WinnerDocument`
- Added `_format_winner_response()` helper to format winner documents for API responses
- Improved notifications to include seller/buyer names

#### 4. **Repository Updates** (`winners/repository.py`)
- Added `find_winners_by_buyer_id()` - Queries winners where winner_id matches buyer_id
- Added `find_winners_by_seller_id()` - Queries winners where seller_info.seller_id matches seller_id

#### 5. **API Endpoints** (`winners/router.py`)
- **GET /winners/{auction_id}** - Get/declare winner for specific auction (existing)
- **GET /winners/my-wins** - NEW - Get all auctions won by current user (buyer)
- **GET /winners/my-sales** - NEW - Get all auctions sold by current user (seller)
- Added `get_current_user_id()` dependency for authentication

### Frontend Changes

#### 1. **API Methods** (`src/api.js`)
- Added `getMyWonAuctions()` - Fetch all won auctions for buyer
- Added `getMySoldAuctions()` - Fetch all sold auctions for seller

#### 2. **Dashboard Component** (`src/pages/Dashboard.jsx`)
- Added state for `wonAuctions` and `soldAuctions`
- Added `fetchWonAuctions()` - Called for all authenticated users
- Added `fetchSoldAuctions()` - Called for sellers only
- Added **"🏆 Auctions Won"** section showing:
  - Product image
  - Product title, description
  - Winning bid price vs starting price
  - Category
  - **Seller details card** (name, email, store name)
  - Won date and time
- Added **"💰 Auctions Sold"** section showing:
  - Product image
  - Product title, description
  - Sold price vs starting price
  - Category
  - **Buyer details card** (name, email)
  - Sale date and time

## Usage Flow

### For Buyers (Winners)
1. User browses and wins an auction
2. When auction ends, `declare_winner()` is called
3. Seller details (name, email, store name) are embedded in winner document
4. On Dashboard, buyer sees "🏆 Auctions Won" section
5. Buyer can see:
   - What they won (product details + image)
   - How much they paid
   - Who the seller is (name, email, store info)
   - When they won

### For Sellers
1. User creates auction and waits for bids
2. When auction ends with bids, `declare_winner()` is called
3. Buyer details (name, email) are embedded in winner document
4. On Dashboard, seller sees:
   - "My Items" section shows their listings with winner names
   - **New "💰 Auctions Sold"** section shows detailed winner info
5. Seller can see:
   - What sold (product details + image)
   - Final selling price
   - Who the buyer is (name, email)
   - When it sold

## Database Queries

### Query Optimization
- `find_winners_by_buyer_id()` - Indexes on `winner_id` field
- `find_winners_by_seller_id()` - Queries nested field `seller_info.seller_id`
  - Note: Consider adding index on `seller_info.seller_id` in production for better performance

### Example MongoDB Queries
```javascript
// Get all auctions won by a buyer
db.auctions.find({ 
  "status": "closed", 
  "winner_info.buyer_info.buyer_id": "..." 
})

// Get all auctions sold by a seller
db.auctions.find({ 
  "seller_id": ObjectId("..."),
  "status": "closed",
  "winner_info": { "$exists": true }
})
```

## Backward Compatibility

✅ **Fully Backward Compatible**
- Existing winner documents (without embedded fields) continue to work
- New endpoints (`/my-wins`, `/my-sales`) are optional
- Existing `GET /winners/{auction_id}` endpoint unchanged
- Seller auction listing shows winner names as before

## Data Safety & Workflow

### No Breaking Changes
- Pure embedding (no references modified)
- Additional fields only, no field removals
- Existing bid/auction/notification workflows unchanged
- No foreign key dependencies

### Idempotent Operations
- Multiple calls to `declare_winner()` on same auction return same data
- Embedded data recalculated from live user/auction documents

## Performance Considerations

### Document Size
- Embedded info adds ~200-300 bytes per winner document
- No MongoDB 16MB limit concerns
- Negligible storage impact

### Query Performance
- Dashboard queries now single hit to winners collection
- No joins needed (data embedded)
- Slightly faster than reference-based queries

### Index Recommendations
```javascript
// Create these indexes in production for optimal performance
db.winners.createIndex({ "winner_id": 1 })
db.winners.createIndex({ "seller_info.seller_id": 1 })
```

## Testing Checklist

- [ ] Create auction as Seller A
- [ ] Place bids as Buyer B
- [ ] Wait for auction to end
- [ ] Verify `declare_winner()` embeds buyer/seller/auction info
- [ ] Check Buyer B's Dashboard shows "Auctions Won" with Seller A details
- [ ] Check Seller A's Dashboard shows "Auctions Sold" with Buyer B details
- [ ] Verify notifications include opponent names
- [ ] Test with multiple auctions per buyer/seller
- [ ] Verify embedded data persists in MongoDB

## API Response Example

**GET /winners/my-wins**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "auction_id": "507f1f77bcf86cd799439012",
    "winner_id": "507f1f77bcf86cd799439013",
    "final_price": 2500.0,
    "declared_at": "2026-02-25T10:30:00Z",
    "buyer_info": {
      "buyer_id": "507f1f77bcf86cd799439013",
      "buyer_name": "John Doe",
      "buyer_email": "john@example.com"
    },
    "seller_info": {
      "seller_id": "507f1f77bcf86cd799439014",
      "seller_name": "Jane Smith",
      "seller_email": "jane@example.com",
      "store_name": "Jane's Electronics"
    },
    "auction_info": {
      "auction_id": "507f1f77bcf86cd799439012",
      "title": "Vintage Laptop",
      "description": "Well-maintained vintage laptop...",
      "starting_price": 1000.0,
      "category": "Electronics",
      "image_path": "/static/uploads/abc123.jpg"
    }
  }
]
```

## Future Enhancements

- Add buyer/seller rating/review system
- Direct messaging between buyer/seller
- Transaction history view
- Export sales/purchase records
- Email notifications with counterparty details
- Seller reputation metrics embedded in winner document
- Buyer rating embedded in winner document for sellers view

## Troubleshooting

### Embedded data missing
- Check if winner document was created after code deployment
- Existing winners created before feature won't have embedded data
- Create migration script if needed to backfill

### API endpoint returns 401
- Verify JWT token is valid
- Check authentication middleware in `core/security.py`

### Seller info shows None
- Verify seller profile created for that user
- Non-sellers may have null `store_name` (handled gracefully)

## Files Modified

1. `winners/schemas.py` - Added embedded models
2. `winners/models.py` - Updated WinnerDocument
3. `winners/service.py` - Enhanced declare_winner
4. `winners/repository.py` - Added query methods
5. `winners/router.py` - Added new endpoints
6. `src/api.js` - Added API methods
7. `src/pages/Dashboard.jsx` - Added UI sections

## Maintenance Notes

- Embedded data is snapshot at time of winner declaration
- Changes to buyer/seller details after auction won won't reflect
- For current profile updates, use existing user/seller edit endpoints
- Consider ETL job if need to update historical embedded data
