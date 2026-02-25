import os

JWT_SECRET = "super_secret_key"
JWT_ALGO = "HS256"
JWT_EXPIRE_MINUTES = 60

# Hybrid embedding: keep last N bids embedded in `auctions.bids` (default 5)
BIDS_EMBED_LIMIT = int(os.getenv("BIDS_EMBED_LIMIT", "5"))
