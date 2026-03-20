from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.hawker import HawkerCentre
from app.services.hawker_service import HawkerService, get_hawker_service

router = APIRouter(prefix="/api/hawkers", tags=["hawkers"])


@router.get("", response_model=list[HawkerCentre])
async def list_hawkers(
    region:  Optional[str] = Query(None, description="Filter by region e.g. 'East'"),
    service: HawkerService = Depends(get_hawker_service),
) -> list[HawkerCentre]:
    return await service.get_all(region=region)


@router.get("/nearby", response_model=list[HawkerCentre])
async def nearby_hawkers(
    lat:       float = Query(..., example=1.3521),
    lng:       float = Query(..., example=103.8198),
    radius_km: float = Query(2.0, ge=0.1, le=20),
    limit:     int   = Query(10,  ge=1, le=50),
    service:   HawkerService = Depends(get_hawker_service),
) -> list[HawkerCentre]:
    if not (1.1 <= lat <= 1.5 and 103.5 <= lng <= 104.1):
        raise HTTPException(status_code=400, detail="Coordinates outside Singapore.")
    return await service.get_nearby(lat=lat, lng=lng, radius_km=radius_km, limit=limit)


@router.get("/{hawker_id}", response_model=HawkerCentre)
async def get_hawker(
    hawker_id: int,
    service:   HawkerService = Depends(get_hawker_service),
) -> HawkerCentre:
    hawker = await service.get_by_id(hawker_id)
    if hawker is None:
        raise HTTPException(status_code=404, detail=f"Hawker {hawker_id} not found.")
    return hawker