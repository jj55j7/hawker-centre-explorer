import os
import math
import httpx
from functools import lru_cache
from typing import Optional
from app.models.hawker import HawkerCentre

GOVSG_URL = (
    "https://data.gov.sg/api/action/datastore_search"
    "?resource_id=d_4a086da0a5553be1d89383cd90d07ecd&limit=1000"
)

SECTOR_REGION: dict[str, str] = {
    **{s: "Central"    for s in ["01","02","03","04","07","08","14","15","16","17","18","19","20","21"]},
    **{s: "North"      for s in ["55","56","57","69","70","71","72","73"]},
    **{s: "North-East" for s in ["28","37","38","39","40","41","53","54"]},
    **{s: "East"       for s in ["34","35","36","42","43","44","45","46","47","48","49","50","51","52"]},
    **{s: "West"       for s in ["05","06","22","23","24","25","26","27","60","61","62","63","64","65","66","67","68"]},
}


def _get_region(postal: str) -> str:
    clean = str(postal).strip().zfill(6)
    return SECTOR_REGION.get(clean[:2], "Unknown")


def _normalise(raw: dict, index: int) -> Optional[HawkerCentre]:
    try:
        lat = float(raw.get("latitude_hc") or raw.get("lat") or 0)
        lng = float(raw.get("longitude_hc") or raw.get("lng") or 0)
    except (TypeError, ValueError):
        return None

    if not lat or not lng or math.isnan(lat) or math.isnan(lng):
        return None

    postal = str(raw.get("addresspostalcode") or raw.get("postal") or "").strip()
    postal = "" if postal.upper() == "NIL" else postal

    return HawkerCentre(
        id=raw.get("_id") or raw.get("id") or index,
        name=raw.get("name") or "Unnamed Hawker Centre",
        address=(
            raw.get("addressfulladdress")
            or raw.get("address")
            or "Address unavailable"
        ),
        postal=postal,
        lat=lat,
        lng=lng,
        region=raw.get("region") or _get_region(postal),
        description=raw.get("description_myenv") or raw.get("description"),
        photo_url=raw.get("photourl") or raw.get("photo_url"),
    )


class HawkerService:
    def __init__(self) -> None:
        self._supabase_url = os.getenv("SUPABASE_URL")
        self._supabase_key = os.getenv("SUPABASE_KEY")
        self._use_supabase = bool(self._supabase_url and self._supabase_key)

    async def get_all(self, region: Optional[str] = None) -> list[HawkerCentre]:
        records = await self._fetch_raw()
        if region and region.lower() != "all":
            records = [h for h in records if h.region.lower() == region.lower()]
        return records

    async def get_by_id(self, hawker_id: int) -> Optional[HawkerCentre]:
        records = await self._fetch_raw()
        return next((h for h in records if h.id == hawker_id), None)

    async def get_nearby(
        self,
        lat: float,
        lng: float,
        radius_km: float = 2.0,
        limit: int = 10,
    ) -> list[HawkerCentre]:
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

    async def _fetch_raw(self) -> list[HawkerCentre]:
        if self._use_supabase:
            return await self._fetch_from_supabase()
        return await self._fetch_from_govsg()

    async def _fetch_from_supabase(self) -> list[HawkerCentre]:
        try:
            from supabase import create_client
            client = create_client(self._supabase_url, self._supabase_key)
            result = client.table("hawker_centres").select("*").execute()
            rows = result.data or []
            cleaned = [_normalise(r, i) for i, r in enumerate(rows)]
            return [h for h in cleaned if h is not None]
        except Exception as exc:
            print(f"Supabase failed: {exc} — falling back to data.gov.sg")
            return await self._fetch_from_govsg()

    async def _fetch_from_govsg(self) -> list[HawkerCentre]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(GOVSG_URL)
            resp.raise_for_status()
            data = resp.json()
        if not data.get("success"):
            raise ValueError("data.gov.sg returned unsuccessful response")
        records = data["result"].get("records", [])
        cleaned = [_normalise(r, i) for i, r in enumerate(records)]
        return [h for h in cleaned if h is not None]


@lru_cache(maxsize=1)
def get_hawker_service() -> HawkerService:
    return HawkerService()