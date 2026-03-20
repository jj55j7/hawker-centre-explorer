#!/usr/bin/env python3
"""
scripts/process_data.py  —  Data Pipeline Script
=================================================

Downloads the raw hawker centre dataset from data.gov.sg,
cleans it, derives regions from postal codes, and writes:

  1. data/hawkers_clean.json   — clean JSON for the frontend (fallback)
  2. Supabase upload           — inserts/upserts to the hawker_centres table

Usage:
    # Dry run (just produces JSON, no Supabase)
    python scripts/process_data.py

    # With Supabase upload
    SUPABASE_URL=... SUPABASE_KEY=... python scripts/process_data.py --upload

Design:
    Uses OOP — a DataPipeline class encapsulates each step so stages
    can be tested, reordered, or replaced independently.
"""

import os
import sys
import math
import json
import argparse
import httpx
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Constants ─────────────────────────────────────────────────────────────────

GOVSG_URL = (
    "https://data.gov.sg/api/action/datastore_search"
    "?resource_id=d_4a086da0a5553be1d89383cd90d07ecd&limit=1000"
)

OUTPUT_PATH = Path(__file__).parent.parent / "data" / "hawkers_clean.json"

SECTOR_REGION: dict[str, str] = {
    **{s: "Central"    for s in ["01","02","03","04","07","08","14","15","16","17","18","19","20","21"]},
    **{s: "North"      for s in ["55","56","57","69","70","71","72","73"]},
    **{s: "North-East" for s in ["28","37","38","39","40","41","53","54"]},
    **{s: "East"       for s in ["34","35","36","42","43","44","45","46","47","48","49","50","51","52"]},
    **{s: "West"       for s in ["05","06","22","23","24","25","26","27","60","61","62","63","64","65","66","67","68"]},
}


# ── Pipeline class ────────────────────────────────────────────────────────────

class DataPipeline:
    """
    OOP data pipeline for hawker centre data.

    Stages:
        extract()   → fetch raw records from data.gov.sg
        transform() → clean, validate, enrich each record
        load()      → write JSON + optionally upsert to Supabase
    """

    def __init__(self) -> None:
        self.raw_records:   list[dict] = []
        self.clean_records: list[dict] = []
        self.stats = {
            "total_raw":     0,
            "dropped_no_coords": 0,
            "dropped_no_name":   0,
            "region_unknown":    0,
        }

    # ── Stage 1: Extract ──────────────────────────────────────────────────────

    def extract(self) -> "DataPipeline":
        """Downloads raw data from data.gov.sg."""
        print("📥  Fetching data from data.gov.sg…")
        resp = httpx.get(GOVSG_URL, timeout=20)
        resp.raise_for_status()

        data = resp.json()
        if not data.get("success"):
            raise RuntimeError("API returned unsuccessful response")

        self.raw_records = data["result"].get("records", [])
        self.stats["total_raw"] = len(self.raw_records)
        print(f"    ✓  {self.stats['total_raw']} raw records received")
        return self

    # ── Stage 2: Transform ────────────────────────────────────────────────────

    def transform(self) -> "DataPipeline":
        """Cleans and enriches each record."""
        print("🔧  Transforming records…")
        clean = []

        for i, raw in enumerate(self.raw_records):
            result = self._transform_one(raw, i)
            if result is None:
                continue
            clean.append(result)

        self.clean_records = clean
        self._print_stats()
        return self

    def _transform_one(self, raw: dict, index: int) -> dict | None:
        """
        Cleans a single raw record.
        Returns None to drop the record.
        """
        # ── Validate coordinates ──────────────────────────────
        try:
            lat = float(raw.get("latitude_hc")  or 0)
            lng = float(raw.get("longitude_hc") or 0)
        except (TypeError, ValueError):
            lat = lng = 0.0

        if not lat or not lng or math.isnan(lat) or math.isnan(lng):
            self.stats["dropped_no_coords"] += 1
            return None

        # ── Name ──────────────────────────────────────────────
        name = (raw.get("name") or "").strip()
        if not name:
            self.stats["dropped_no_name"] += 1
            return None
        name = name.title()   # "MAXWELL FOOD CENTRE" → "Maxwell Food Centre"

        # ── Address ───────────────────────────────────────────
        address = (
            raw.get("addressfulladdress")
            or raw.get("addressstreetname")
            or "Address unavailable"
        ).strip()

        # ── Postal code ───────────────────────────────────────
        postal = str(raw.get("addresspostalcode") or "").strip()
        if postal.upper() in ("NIL", "NA", "N/A", ""):
            postal = ""
        else:
            postal = postal.zfill(6)   # ensure 6 digits

        # ── Region ────────────────────────────────────────────
        region = self._derive_region(postal)
        if region == "Unknown":
            self.stats["region_unknown"] += 1

        return {
            "id":          raw.get("_id") or index,
            "name":        name,
            "address":     address,
            "postal":      postal,
            "lat":         round(lat, 6),
            "lng":         round(lng, 6),
            "region":      region,
            "description": (raw.get("description_myenv") or "").strip() or None,
            "photoUrl":    raw.get("photourl") or None,
        }

    @staticmethod
    def _derive_region(postal: str) -> str:
        if not postal or len(postal) < 2:
            return "Unknown"
        sector = postal[:2]
        return SECTOR_REGION.get(sector, "Unknown")

    def _print_stats(self) -> None:
        s = self.stats
        kept = len(self.clean_records)
        print(f"    ✓  {kept} clean records  "
              f"(dropped {s['dropped_no_coords']} no-coords, "
              f"{s['dropped_no_name']} no-name, "
              f"{s['region_unknown']} unknown region)")

    # ── Stage 3: Load ─────────────────────────────────────────────────────────

    def load(self, upload_to_supabase: bool = False) -> "DataPipeline":
        """Writes JSON and optionally upserts to Supabase."""
        self._write_json()
        if upload_to_supabase:
            self._upsert_supabase()
        return self

    def _write_json(self) -> None:
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(self.clean_records, f, ensure_ascii=False, indent=2)
        print(f"💾  Written → {OUTPUT_PATH}  ({len(self.clean_records)} records)")

    def _upsert_supabase(self) -> None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            print("⚠️  SUPABASE_URL / SUPABASE_KEY not set — skipping upload")
            return

        print("☁️   Uploading to Supabase…")
        try:
            from supabase import create_client
            client = create_client(url, key)

            # Upsert in batches of 100 to stay within Supabase limits
            batch_size = 100
            total = len(self.clean_records)
            for start in range(0, total, batch_size):
                batch = self.clean_records[start : start + batch_size]
                client.table("hawker_centres").upsert(batch).execute()
                print(f"    uploaded {min(start + batch_size, total)}/{total}…")

            print(f"    ✓  {total} records upserted to Supabase")

        except Exception as exc:
            print(f"    ✗  Supabase upload failed: {exc}", file=sys.stderr)
            raise


# ── CLI entry point ───────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Hawker Centre Data Pipeline")
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upsert cleaned data to Supabase after processing",
    )
    args = parser.parse_args()

    print("\n🍜  Hawker Centre Data Pipeline\n" + "─" * 35)
    pipeline = DataPipeline()
    pipeline.extract().transform().load(upload_to_supabase=args.upload)
    print("\n✅  Pipeline complete.\n")


if __name__ == "__main__":
    main()
