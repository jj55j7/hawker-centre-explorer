from pydantic import BaseModel, Field
from typing import Optional


class HawkerCentre(BaseModel):
    id:          int
    name:        str
    address:     str
    postal:      str            = ''
    lat:         float
    lng:         float
    region:      str            = 'Unknown'
    description: Optional[str] = None
    photo_url:   Optional[str] = Field(None, alias='photoUrl')

    model_config = {
        'populate_by_name': True,
    }