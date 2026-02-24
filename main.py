from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from auth.routes import router as auth_router
from users.routes import router as user_router
from sellers.routes import router as seller_router
from auctions.router import router as auctions_router
from bids.router import router as bids_router
from winners.router import router as winners_router
from notifications.router import router as notifications_router


app = FastAPI(title="Auction App", version="1.0.0")

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(seller_router)
app.include_router(auctions_router)
app.include_router(bids_router)
app.include_router(winners_router)
app.include_router(notifications_router)



@app.get("/")
def root():
    return {"message": "Auction API", "docs": "/docs"}
