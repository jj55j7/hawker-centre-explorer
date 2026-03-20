# 🍜 Hawker Centre Explorer

> An interactive geospatial web application for discovering Singapore's hawker centres — built as part of the Topo EH-AI Consulting Software Developer Intern Technical Assessment 2026.

**[Live Demo →](https://hawker-centre-explorer.vercel.app)**  &nbsp;|&nbsp;  **[API Docs →](https://hawker-api.onrender.com/docs)**

---

## What It Does

Search, filter, and explore all of Singapore's hawker centres on an interactive map. Click a marker to see the name, address, and postal code. Use **Near Me** to instantly find the closest centres to your location.

---

## Architecture

```
hawker-centre-explorer/
├── frontend/   React + Vite app (deployed on Vercel)
└── backend/    Python FastAPI API (deployed on Render)
```

**Data flow:**

```
data.gov.sg API
      ↓
 process_data.py  ←  cleans, validates, derives regions
      ↓
  Supabase DB     ←  stores clean records
      ↓
  FastAPI backend ←  serves /api/hawkers endpoints
      ↓
  React frontend  ←  renders map + sidebar + dashboard
```

The frontend also falls back to calling data.gov.sg directly if the backend is unavailable — so the app works even without the Python backend running.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast HMR, modern JSX, matches Topo's stack |
| Mapping | Leaflet.js + MarkerCluster | No API key, free OSM tiles, smooth clustering |
| Charts | Recharts | React-native, clean bar charts |
| Fuzzy search | Fuse.js | Handles partial names and typos |
| Styling | Tailwind CSS | Utility-first, zero runtime overhead |
| Backend | Python + FastAPI | Matches JD; auto OpenAPI docs, async, type-safe |
| Data validation | Pydantic v2 | Clean models, auto-validation, serialisation |
| Database | Supabase (PostgreSQL) | Matches JD; instant setup, REST + realtime |
| Deployment (frontend) | Vercel | GitHub integration, instant previews |
| Deployment (backend) | Render | Free tier, Dockerfile support |

---

## Features

### MVP — Core Requirements

| Feature | Status |
|---|---|
| Interactive Leaflet map centred on Singapore | ✅ |
| Marker for every hawker centre | ✅ |
| Click marker → popup with name, address, postal code | ✅ |
| Search by name (fuzzy, debounced 300 ms) | ✅ |
| Sidebar list synced with map | ✅ |
| Click list item → map flies to marker | ✅ |
| Region filter (Central / North / North-East / East / West) | ✅ |
| Click → zoom in + selected marker highlighted | ✅ |
| Loading skeleton while fetching | ✅ |
| Empty state when search returns nothing | ✅ |
| Error message if API fails | ✅ |

### Standout Features

| Feature | Notes |
|---|---|
| **Marker clustering** | Groups nearby markers at low zoom; numbered bubbles |
| **Stats dashboard panel** | Collapsible overlay; region bar chart; click bar to filter |
| **Near Me** | Haversine formula; finds 5 closest; shows distance |
| **Python FastAPI backend** | `/api/hawkers`, `/api/hawkers/nearby`, `/api/hawkers/{id}` |
| **Data pipeline script** | `process_data.py` — extract → transform → load into Supabase |
| **Fuzzy search** | Fuse.js; "Bedok 85" finds "Bedok 85 Fengshan Centre" |
| **Smooth animations** | Fly-to transitions, staggered list reveals, pin scale on select |

---

## Setup — Frontend

### Prerequisites
- Node.js 18+

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

**Build for production:**
```bash
npm run build
```

---

## Setup — Backend

### Prerequisites
- Python 3.11+

```bash
cd backend

# Create a virtual environment (keeps dependencies isolated)
python3 -m venv venv
source venv/bin/activate      # Mac/Linux
# venv\Scripts\activate       # Windows

pip install -r requirements.txt

# Copy env template and fill in your values
cp .env.example .env
# Edit .env with your Supabase URL + key (optional — app works without it)

# Start the API server
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (interactive API explorer)
```

---

## Setup — Data Pipeline

```bash
cd backend
source venv/bin/activate

# Dry run — downloads and cleans data, writes to data/hawkers_clean.json
python scripts/process_data.py

# With Supabase upload
SUPABASE_URL=... SUPABASE_KEY=... python scripts/process_data.py --upload
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hawkers` | All centres (optional `?region=East`) |
| GET | `/api/hawkers/{id}` | Single centre by ID |
| GET | `/api/hawkers/nearby?lat=1.35&lng=103.8` | Centres within radius |
| GET | `/health` | Liveness probe |

Full interactive docs available at `/docs` when the server is running.

---

## Deployment

### Frontend → Vercel
1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Set root directory to `frontend`
4. Add env variable: `VITE_API_URL=https://your-api.onrender.com`
5. Deploy

### Backend → Render
1. Create a new **Web Service** at [render.com](https://render.com)
2. Connect your GitHub repo
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `ALLOWED_ORIGINS`

---

## Supabase Setup (Optional)

1. Go to [supabase.com](https://supabase.com) → New project
2. Open the SQL editor and run:

```sql
create table hawker_centres (
  id          integer primary key,
  name        text not null,
  address     text,
  postal      text,
  lat         double precision,
  lng         double precision,
  region      text,
  description text,
  "photoUrl"  text
);
```

3. Copy your project URL and anon key into `.env`
4. Run `python scripts/process_data.py --upload` to populate the table

---

## Assumptions & Design Decisions

### Region Derivation
The dataset has no explicit region field. I derive region from the **first two digits of the postal code** (postal sector), using Singapore Post's published sector map combined with URA's planning region boundaries. This is the same method used by property portals like PropertyGuru.

Sectors on boundaries (e.g. 05, 06, 22, 23) are assigned to **West** based on geographic centroid.

### Coordinate Filtering
Records with missing, zero, or non-numeric lat/lng are silently dropped. The pipeline logs how many were dropped. In total, fewer than 5 records are affected.

### Distance Calculation
"Near Me" uses the **Haversine formula** for straight-line distance, not walking distance. The UI says "closest" not "nearest walking route" to be accurate. A future improvement would use the OneMap SG routing API.

### Search Debounce
Search is debounced at 300 ms to avoid re-rendering the marker layer on every keystroke. A spinning indicator in the search field shows the user that their input is being processed.

### Fuzzy Search
Fuse.js threshold is set to 0.35 — permissive enough to handle abbreviations like "Bedok 85" and common misspellings, strict enough to avoid irrelevant results.

### Backend Fallback
The frontend tries the FastAPI backend first (via `/api/hawkers`). If it gets no response within 4 seconds, it falls back to calling data.gov.sg directly. This means the app is resilient — it keeps working even if the backend goes to sleep on Render's free tier.

---

*Built by [Your Name] · March 2026 · Singapore*
