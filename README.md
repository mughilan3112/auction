# Auction App

Full-stack auction application: **React** frontend, **FastAPI** backend, **MongoDB** database.

## Structure

This is a monolithic repository where backend and frontend are integrated in the root directory.

- **FastAPI Backend:** Logic lives in `main.py`, `auth/`, `users/`, `sellers/`, `auctions/`, `bids/`, and `winners/`.
- **React (Vite) Frontend:** Logic lives in `src/`, `index.html`, `package.json`, etc.

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB running locally (default: `mongodb://localhost:27017`)

## Setup & Running

### Backend

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
python -m pip install "uvicorn[standard]"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
npm install
npm install --legacy-peer-deps
npm run dev
```

App: http://localhost:5173

## Environment

- **Backend:** optional `MONGO_URI` (default: `mongodb://localhost:27017`)
- **Frontend:** optional `VITE_API_URL` (default: `http://localhost:8000`)

## Features

- **Auth:** Register, login (JWT)
- **Users:** Profile, become seller (store name)
- **Auctions:** List active, view detail, create (sellers only)
- **Bids:** Place bid (min increment, bonus time extension)
- **Winners:** Declare winner when auction has ended (GET `/winners/{auction_id}`)