# Hawker Centre Explorer

> An interactive geospatial web application for discovering all of Singapore's hawker centres.

**[Live Demo →](https://hawker-centre-explorer.vercel.app)** &nbsp;|&nbsp; **[API Docs →](http://localhost:8000/docs)** *(run backend locally to access)* &nbsp;|&nbsp; **[Data Source →](https://data.gov.sg/datasets/d_4a086da0a5553be1d89383cd90d07ecd/view)**

---

## Overview

Hawker Centre Explorer lets users discover, search, filter, and save Singapore's hawker centres through a clean map-first interface. The app fetches live GeoJSON data from the Singapore government's open data portal, normalises it through a typed data pipeline, and presents it through a responsive React frontend backed by a Python FastAPI service and Supabase database.

---

## Screenshots

### Full Map View
<img width="1512" height="862" alt="Screenshot 2026-03-20 at 5 09 31 PM" src="https://github.com/user-attachments/assets/93be6c23-a184-4eb6-a75d-f80a169e3778" />

### Search & Region Filter
<img width="1512" height="862" alt="Screenshot 2026-03-20 at 5 06 46 PM" src="https://github.com/user-attachments/assets/10e5e086-1813-4e1c-a4cc-d14e9b5bebde" />

### Marker Popup
<img width="1512" height="862" alt="Screenshot 2026-03-20 at 5 07 24 PM" src="https://github.com/user-attachments/assets/567705e2-a0e8-4ace-a92a-882d47cc6293" />

### Marker Clustering
<img width="1512" height="862" alt="Screenshot 2026-03-20 at 5 08 04 PM" src="https://github.com/user-attachments/assets/968a9603-e306-44c7-aa57-14ebb9e03823" />

### Stats Dashboard Panel
<img width="1512" height="862" alt="Screenshot 2026-03-20 at 5 11 05 PM" src="https://github.com/user-attachments/assets/e9215199-c2b1-48bd-a6b7-bb65b3a85b2b" />

### Near Me
<img width="1512" height="862" alt="Screenshot 2026-03-20 at 5 11 47 PM" src="https://github.com/user-attachments/assets/96465fff-479c-470b-85f2-4de7a0fcac9c" />

### Favourites Tab
<img width="1512" height="862" alt="Screenshot 2026-03-20 at 5 12 48 PM" src="https://github.com/user-attachments/assets/10229cf8-4d67-40e0-9979-48deb6eb227b" />

### FastAPI Interactive Docs 
<img width="1512" height="857" alt="Screenshot 2026-03-20 at 6 04 25 PM" src="https://github.com/user-attachments/assets/c63730e5-82b1-402d-9a7c-98bac548aeb9" />

### Search Query FastAPI 
<img width="1512" height="857" alt="Screenshot 2026-03-20 at 6 06 09 PM" src="https://github.com/user-attachments/assets/dab5835f-3237-4a90-b62e-b495c5b88dec" />

---

## Architecture

```
hawker-centre-explorer/
├── frontend/   React + Vite  →  deployed on Vercel
└── backend/    Python FastAPI →  deployed on Render
```

### Data flow

```
Local GeoJSON (public/hawkers.geojson)   ← primary source, bundled
        ↓ fallback if missing
  FastAPI backend  (localhost:8000)       ← Python + Supabase
        ↓ fallback if not running  
  data.gov.sg GeoJSON API                ← live external API
        ↓
  React frontend                          ← renders everything
```

**Resilience:** the frontend loads from a bundled local GeoJSON file first (zero network calls), then tries the FastAPI backend, then falls back to the live data.gov.sg API — so the app works at every stage of deployment.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Matches Topo stack; fast HMR; component-based |
| Map | Leaflet.js + leaflet.markercluster | No API key; free OSM tiles; smooth clustering |
| Charts | Recharts | React-native; interactive bar charts |
| Fuzzy search | Fuse.js | Handles abbreviations and typos gracefully |
| Styling | Tailwind CSS v3 | Utility-first; zero runtime overhead |
| Backend | Python + FastAPI | Matches JD; async; auto OpenAPI docs; type-safe |
| Data models | Pydantic v2 | Request/response validation; serialisation |
| Database | Supabase (PostgreSQL) | Matches JD; favourites + hawker data storage |
| Deployment (FE) | Vercel | Auto-redeploy on every git push |
| Deployment (BE) | Render | Free tier; connects to Supabase via env vars |

---

## Features

### MVP — Core Requirements 

| Feature | Implementation |
|---|---|
| Interactive Leaflet map centred on Singapore | `[1.3521, 103.8198]`, zoom 12, OSM tiles |
| Marker for every hawker centre | Custom SVG pin icons coloured by region |
| Click marker → popup | Name, address, postal code, stall count, region badge |
| Live search | Fuse.js fuzzy match, debounced 300ms, spinner while pending |
| Sidebar list synced with map | Staggered animation on load, selected state highlighted |
| Click list item → map flies to marker | `map.flyTo()` 0.9s, popup auto-opens at zoom 17 |
| Region filter | Central / North / North-East / East / West pill buttons |
| Click → zoom + highlight | Zooms to level 17, selected pin scales up |
| Loading skeleton | Animated pulse placeholders match final layout shape |
| Empty state | "No hawker centres found" with helpful subtext |
| Error state | Shown if all 3 data sources fail, with message |

### Standout Features 

| Feature | Details |
|---|---|
| **Marker clustering** | `leaflet.markercluster` — numbered bubbles at low zoom, spiderfies on click |
| **Stats dashboard panel** | Recharts bar chart; region counts; clicking a bar applies that filter |
| **Near Me** | Browser Geolocation API + Haversine formula; 5 closest with live distances |
| **Favourites tab** | Heart button in every popup; saved to Supabase; persists via anonymous session ID |
| **Python FastAPI backend** | OOP service layer; Pydantic models; 3 REST endpoints; auto Swagger UI |
| **Data pipeline script** | `process_data.py` ETL class — extract → transform → load to Supabase |
| **Fuzzy search** | Fuse.js threshold 0.35; "Bedok 85" finds "Bedok 85 Fengshan Centre" |
| **Smooth animations** | Fly-to transitions, staggered list reveals, pin scale on select |

---

## Project Structure

```
hawker-centre-explorer/
├── frontend/
│   ├── public/
│   │   └── hawkers.geojson              ← bundled data (no API needed)
│   └── src/
│       ├── components/
│       │   ├── Map/HawkerMap.jsx        ← Leaflet map, markers, clusters, popups
│       │   ├── Sidebar/
│       │   │   ├── Sidebar.jsx          ← tab container (Explore / Favourites)
│       │   │   ├── SearchBar.jsx        ← debounced input with spinner
│       │   │   ├── RegionFilter.jsx     ← coloured pill buttons
│       │   │   ├── HawkerList.jsx       ← animated results list
│       │   │   └── FavouritesPanel.jsx  ← saved centres view
│       │   ├── Dashboard/StatsPanel.jsx ← collapsible overlay with Recharts
│       │   └── UI/
│       │       ├── LoadingSkeleton.jsx
│       │       └── ErrorMessage.jsx
│       ├── hooks/
│       │   ├── useHawkerData.js         ← fetch + normalise GeoJSON (3-source fallback)
│       │   ├── useFilter.js             ← fuzzy search + region filter + debounce
│       │   ├── useGeolocation.js        ← browser location API wrapper
│       │   └── useFavourites.js         ← Supabase CRUD for favourites
│       └── utils/
│           ├── regionMapper.js          ← postal sector → region derivation
│           ├── distanceCalculator.js    ← Haversine formula + formatDistance
│           └── supabase.js              ← Supabase client + anonymous session ID
│
└── backend/
    ├── app/
    │   ├── main.py                      ← FastAPI app, CORS middleware
    │   ├── models/hawker.py             ← Pydantic HawkerCentre model
    │   ├── routes/hawkers.py            ← thin route handlers
    │   └── services/hawker_service.py   ← OOP service, all business logic
    └── scripts/
        └── process_data.py              ← DataPipeline class: ETL
```

---

## Setup — Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

**Download the local data file** (prevents API rate limiting):
```bash
curl "https://api-open.data.gov.sg/v1/public/api/datasets/d_4a086da0a5553be1d89383cd90d07ecd/poll-download" -o /tmp/poll.json
# Open poll.json, copy the URL inside, then:
curl "PASTE_URL_HERE" -o frontend/public/hawkers.geojson
```

**`frontend/.env`** (never commit this):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

---

## Setup — Backend

```bash
cd backend
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill in Supabase credentials
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

---

## Setup — Supabase

1. Create project at [supabase.com](https://supabase.com)
2. SQL Editor → run:

```sql
create table favourites (
  id          uuid default gen_random_uuid() primary key,
  session_id  text not null,
  hawker_id   integer not null,
  hawker_name text not null,
  created_at  timestamptz default now(),
  unique(session_id, hawker_id)
);
alter table favourites enable row level security;
create policy "Anyone can manage favourites"
  on favourites for all using (true) with check (true);
```

3. Settings → API → copy URL and anon key to `.env`

---

## Data Pipeline

```bash
cd backend && source venv/bin/activate
python scripts/process_data.py           # dry run → data/hawkers_clean.json
python scripts/process_data.py --upload  # + upload to Supabase
```

The pipeline uses a `DataPipeline` class with three stages: `extract()` fetches from data.gov.sg, `transform()` cleans names to Title Case and derives regions from postal sectors, `load()` writes JSON and optionally upserts to Supabase in batches of 100.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hawkers` | All centres — optional `?region=East` |
| GET | `/api/hawkers/{id}` | Single centre by numeric ID |
| GET | `/api/hawkers/nearby?lat=1.35&lng=103.8` | Centres within radius, sorted by distance |
| GET | `/health` | Liveness probe |

Interactive docs at `http://localhost:8000/docs`.

---

## Deployment

### Frontend → Vercel
1. Push to GitHub
2. Import at [vercel.com](https://vercel.com) — root directory: `frontend`
3. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`
4. Deploy — auto-redeploys on every `git push`

### Backend → Render
1. New Web Service at [render.com](https://render.com)
2. Root: `backend` | Build: `pip install -r requirements.txt`
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `ALLOWED_ORIGINS`

---

## Assumptions & Design Decisions

**Region derivation** — The GeoJSON dataset has no explicit region field. Region is derived from the first two digits of the postal code (the postal sector), using Singapore Post's published sector map combined with URA's planning region boundaries. This logic is identical in both `regionMapper.js` (frontend) and `hawker_service.py` (backend) so results are always consistent. Sectors on regional boundaries (05, 06, 22, 23) are assigned to West based on geographic centroid.

**GeoJSON coordinate order** — GeoJSON stores coordinates as `[longitude, latitude]`, which is the reverse of Leaflet's `[latitude, longitude]`. The `normaliseFeature` function explicitly swaps them with a comment to prevent future confusion.

**Three-source data fallback** — `useHawkerData` tries sources in order: (1) local `hawkers.geojson` bundled with the app, (2) the FastAPI backend at `/api/hawkers`, (3) the live data.gov.sg API. This means the app works during local development without a backend, on Vercel without the Render backend being awake, and degrades gracefully if all else fails.

**Favourites without login** — Favourites use an anonymous session ID generated with `crypto.randomUUID()` and stored in `localStorage` on first visit. This ID is sent with every Supabase query so favourites persist across page reloads in the same browser with zero friction. Different devices get a fresh ID.

**Leaflet + React bridge** — Leaflet popup HTML runs outside React's rendering tree, so the favourites `Set` cannot be directly accessed from popup button `onclick` handlers. The solution is exposing a `window.toggleFav` function in a `useEffect` that re-runs when `favourites` or `onToggleFavourite` changes. This is a documented standard pattern for Leaflet + React integration.

**Search debounce** — 300ms debounce prevents Fuse.js from re-indexing the full dataset on every keystroke. An animated spinner in the search field (`isSearching` state) gives visual feedback while the debounce timer is running.

**Distance** — Near Me uses the Haversine formula for straight-line distance. The UI says "closest" not "nearest walking route" to be accurate about what's being calculated.

---
