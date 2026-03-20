"""
services/hawker_service.py

Service layer — all business logic for hawker centre data.

Design pattern: Repository-style service class (OOP).
Route handlers stay thin; this class owns all logic.

Data source priority:
  1. Supabase          — if configured via env vars
  2. data.gov.sg GeoJSON poll-download API — same source as frontend
"""

import os
import math
import httpx

from functools import lru_cache
from typing import Optional

from app.models.hawker import HawkerCentre

# ── Constants ─────────────────────────────────────────────────────────────────

# GeoJSON poll-download endpoint (same API the frontend uses)
GOVSG_POLL_URL = (
    "https://api-open.data.gov.sg/v1/public/api/datasets/"
    "d_4a086da0a5553be1d89383cd90d07ecd/poll-download"
)

SUPABASE_TABLE = "hawker_centres"

# Postal sector → planning region (mirrors frontend regionMapper.js)
SECTOR_REGION: dict[str, str] = {
    **{s: "Central"    for s in ["01","02","03","04","07","08","14","15","16","17","18","19","20","21"]},
    **{s: "North"      for s in ["55","56","57","69","70","71","72","73"]},
    **{s: "North-East" for s in ["28","37","38","39","40","41","53","54"]},
    **{s: "East"       for s in ["34","35","36","42","43","44","45","46","47","48","49","50","51","52"]},
    **{s: "West"       for s in ["05","06","22","23","24","25","26","27","60","61","62","63","64","65","66","67","68"]},
}


def _get_region(postal: str) -> str:
    """Derives planning region from a 6-digit Singapore postal code."""
    clean = str(postal).strip().zfill(6)
    return SECTOR_REGION.get(clean[:2], "Unknown")


def _normalise_feature(feature: dict, index: int) -> Optional[HawkerCentre]:
    """
    Converts a GeoJSON feature into a HawkerCentre model.
    GeoJSON coordinates are [longitude, latitude] — note the swap.
    Returns None if coordinates are missing or invalid.
    """
    coords = feature.get("geometry", {}).get("coordinates", [])
    props  = feature.get("properties", {})

    if not coords or len(coords) < 2:
        return None

    try:
        lng = float(coords[0])   # GeoJSON is [lng, lat]
        lat = float(coords[1])
    except (TypeError, ValueError):
        return None

    if not lat or not lng or math.isnan(lat) or math.isnan(lng):
        return None

    postal  = str(props.get("ADDRESSPOSTALCODE") or "").strip()
    block   = str(props.get("ADDRESSBLOCKHOUSENUMBER") or "").strip()
    street  = str(props.get("ADDRESSSTREETNAME") or "").strip()
    address = (
        props.get("ADDRESS_MYENV")
        or (f"{block} {street}, Singapore {postal}".strip(", ") if block or street else None)
        or "Address unavailable"
    )

    return HawkerCentre(
        id=props.get("OBJECTID") or index,
        name=props.get("NAME") or props.get("ADDRESSBUILDINGNAME") or "Unnamed Hawker Centre",
        address=address,
        postal=postal,
        lat=lat,
        lng=lng,
        region=_get_region(postal),
        description=props.get("DESCRIPTION") or "",
        photo_url=props.get("PHOTOURL"),
    )


# ── Service class ─────────────────────────────────────────────────────────────

class HawkerService:
    """
    Provides hawker centre data with filtering and geospatial queries.

    Usage:
        service = HawkerService()
        all_hawkers = await service.get_all()
        nearby      = await service.get_nearby(lat=1.35, lng=103.82)
    """

    def __init__(self) -> None:
        self._supabase_url = os.getenv("SUPABASE_URL")
        self._supabase_key = os.getenv("SUPABASE_KEY")
        self._use_supabase = bool(self._supabase_url and self._supabase_key)

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_all(
        self,
        region: Optional[str] = None,
    ) -> list[HawkerCentre]:
        """Returns all hawker centres, optionally filtered by region."""
        records = await self._fetch_raw()
        if region and region.lower() != "all":
            records = [h for h in records if h.region.lower() == region.lower()]
        return records

    async def get_by_id(self, hawker_id: int) -> Optional[HawkerCentre]:
        """Returns a single hawker centre by its ID, or None if not found."""
        records = await self._fetch_raw()
        return next((h for h in records if h.id == hawker_id), None)

    async def get_nearby(
        self,
        lat: float,
        lng: float,
        radius_km: float = 2.0,
        limit: int = 10,
    ) -> list[HawkerCentre]:
        """
        Returns hawker centres within radius_km of (lat, lng),
        sorted by distance ascending. Uses the Haversine formula.
        """
        records = await self._fetch_raw()

        def haversine(h: HawkerCentre) -> float:
            R = 6371.0
            dlat = math.radians(h.lat - lat)
            dlng = math.radians(h.lng - lng)
            a = (
                math.sin(dlat / 2) ** 2
                + math.cos(math.radians(lat))
                * math.cos(math.radians(h.lat))
                * math.sin(dlng / 2) ** 2
            )
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        with_dist = [(h, haversine(h)) for h in records]
        nearby = [(h, d) for h, d in with_dist if d <= radius_km]
        nearby.sort(key=lambda x: x[1])
        return [h for h, _ in nearby[:limit]]

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _fetch_raw(self) -> list[HawkerCentre]:
        """Fetches from Supabase if configured, else from data.gov.sg GeoJSON."""
        if self._use_supabase:
            return await self._fetch_from_supabase()
        return await self._fetch_from_govsg()

    async def _fetch_from_supabase(self) -> list[HawkerCentre]:
        """Reads the hawker_centres table from Supabase."""
        try:
            from supabase import create_client
            client = create_client(self._supabase_url, self._supabase_key)
            result = client.table(SUPABASE_TABLE).select("*").execute()
            rows = result.data or []
            cleaned = [_normalise_feature({"geometry": {"coordinates": [r.get("lng"), r.get("lat")]}, "properties": r}, i) for i, r in enumerate(rows)]
            return [h for h in cleaned if h is not None]
        except Exception as exc:
            print(f"[HawkerService] Supabase failed: {exc} — falling back to data.gov.sg")
            return await self._fetch_from_govsg()

    async def _fetch_from_govsg(self) -> list[HawkerCentre]:
        """
        Fetches GeoJSON from data.gov.sg using the poll-download endpoint.
        This is a two-step process:
          1. Poll the dataset endpoint to get a signed download URL
          2. Download the actual GeoJSON from that URL
        """
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Step 1: get signed URL
            poll_resp = await client.get(GOVSG_POLL_URL)
            poll_resp.raise_for_status()
            poll_data = poll_resp.json()

            if poll_data.get("code") != 0:
                raise ValueError(
                    f"data.gov.sg poll error: {poll_data.get('errorMsg', 'unknown')}"
                )

            download_url = poll_data.get("data", {}).get("url")
            if not download_url:
                raise ValueError("No download URL returned from data.gov.sg poll")

            # Step 2: download the GeoJSON
            data_resp = await client.get(download_url)
            data_resp.raise_for_status()
            geojson = data_resp.json()

        features = geojson.get("features", [])
        cleaned  = [_normalise_feature(f, i) for i, f in enumerate(features)]
        return [h for h in cleaned if h is not None]


# ── Singleton via FastAPI dependency injection ─────────────────────────────────

@lru_cache(maxsize=1)
def get_hawker_service() -> HawkerService:
    """Returns a cached singleton HawkerService. Called once per worker process."""
    return HawkerService()

# import os
# import math
# import httpx
# from functools import lru_cache
# from typing import Optional
# from app.models.hawker import HawkerCentre

# GOVSG_URL = (
#     "https://data.gov.sg/api/action/datastore_search"
#     "?resource_id=d_4a086da0a5553be1d89383cd90d07ecd&limit=1000"
# )

# SECTOR_REGION: dict[str, str] = {
#     **{s: "Central"    for s in ["01","02","03","04","07","08","14","15","16","17","18","19","20","21"]},
#     **{s: "North"      for s in ["55","56","57","69","70","71","72","73"]},
#     **{s: "North-East" for s in ["28","37","38","39","40","41","53","54"]},
#     **{s: "East"       for s in ["34","35","36","42","43","44","45","46","47","48","49","50","51","52"]},
#     **{s: "West"       for s in ["05","06","22","23","24","25","26","27","60","61","62","63","64","65","66","67","68"]},
# }


# def _get_region(postal: str) -> str:
#     clean = str(postal).strip().zfill(6)
#     return SECTOR_REGION.get(clean[:2], "Unknown")


# def _normalise(raw: dict, index: int) -> Optional[HawkerCentre]:
#     try:
#         lat = float(raw.get("latitude_hc") or raw.get("lat") or 0)
#         lng = float(raw.get("longitude_hc") or raw.get("lng") or 0)
#     except (TypeError, ValueError):
#         return None

#     if not lat or not lng or math.isnan(lat) or math.isnan(lng):
#         return None

#     postal = str(raw.get("addresspostalcode") or raw.get("postal") or "").strip()
#     postal = "" if postal.upper() == "NIL" else postal

#     return HawkerCentre(
#         id=raw.get("_id") or raw.get("id") or index,
#         name=raw.get("name") or "Unnamed Hawker Centre",
#         address=(
#             raw.get("addressfulladdress")
#             or raw.get("address")
#             or "Address unavailable"
#         ),
#         postal=postal,
#         lat=lat,
#         lng=lng,
#         region=raw.get("region") or _get_region(postal),
#         description=raw.get("description_myenv") or raw.get("description"),
#         photo_url=raw.get("photourl") or raw.get("photo_url"),
#     )


# class HawkerService:
#     def __init__(self) -> None:
#         self._supabase_url = os.getenv("SUPABASE_URL")
#         self._supabase_key = os.getenv("SUPABASE_KEY")
#         self._use_supabase = bool(self._supabase_url and self._supabase_key)

#     async def get_all(self, region: Optional[str] = None) -> list[HawkerCentre]:
#         records = await self._fetch_raw()
#         if region and region.lower() != "all":
#             records = [h for h in records if h.region.lower() == region.lower()]
#         return records

#     async def get_by_id(self, hawker_id: int) -> Optional[HawkerCentre]:
#         records = await self._fetch_raw()
#         return next((h for h in records if h.id == hawker_id), None)

#     async def get_nearby(
#         self,
#         lat: float,
#         lng: float,
#         radius_km: float = 2.0,
#         limit: int = 10,
#     ) -> list[HawkerCentre]:
#         records = await self._fetch_raw()

#         def haversine(h: HawkerCentre) -> float:
#             R = 6371.0
#             dlat = math.radians(h.lat - lat)
#             dlng = math.radians(h.lng - lng)
#             a = (
#                 math.sin(dlat / 2) ** 2
#                 + math.cos(math.radians(lat))
#                 * math.cos(math.radians(h.lat))
#                 * math.sin(dlng / 2) ** 2
#             )
#             return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

#         with_dist = [(h, haversine(h)) for h in records]
#         nearby = [(h, d) for h, d in with_dist if d <= radius_km]
#         nearby.sort(key=lambda x: x[1])
#         return [h for h, _ in nearby[:limit]]

#     async def _fetch_raw(self) -> list[HawkerCentre]:
#         if self._use_supabase:
#             return await self._fetch_from_supabase()
#         return await self._fetch_from_govsg()

#     async def _fetch_from_supabase(self) -> list[HawkerCentre]:
#         try:
#             from supabase import create_client
#             client = create_client(self._supabase_url, self._supabase_key)
#             result = client.table("hawker_centres").select("*").execute()
#             rows = result.data or []
#             cleaned = [_normalise(r, i) for i, r in enumerate(rows)]
#             return [h for h in cleaned if h is not None]
#         except Exception as exc:
#             print(f"Supabase failed: {exc} — falling back to data.gov.sg")
#             return await self._fetch_from_govsg()

#     async def _fetch_from_govsg(self) -> list[HawkerCentre]:
#         async with httpx.AsyncClient(timeout=15.0) as client:
#             resp = await client.get(GOVSG_URL)
#             resp.raise_for_status()
#             data = resp.json()
#         if not data.get("success"):
#             raise ValueError("data.gov.sg returned unsuccessful response")
#         records = data["result"].get("records", [])
#         cleaned = [_normalise(r, i) for i, r in enumerate(records)]
#         return [h for h in cleaned if h is not None]


# @lru_cache(maxsize=1)
# def get_hawker_service() -> HawkerService:
#     return HawkerService()