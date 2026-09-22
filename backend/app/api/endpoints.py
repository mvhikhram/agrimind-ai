"""
REST API Endpoints for SmartFarm-AI.
Includes endpoints for real-time sensor metrics, field zones, AI diagnostics,
and irrigation scheduling.
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import random
import time

from app.services.ai_engine import AgronomicAIEngine, CROPS_DATABASE

router = APIRouter()

# In-memory dynamic telemetry state for demo
FIELD_ZONES = [
    {
        "id": "zone-a",
        "name": "Zone A - North Plains",
        "crop": "Winter Wheat",
        "area_ha": 12.5,
        "soil_type": "Loam",
        "target_moisture": 55.0,
        "base_temp": 22.4,
        "base_moisture": 49.8,
        "base_humidity": 56.0,
        "ph": 6.8,
        "npk": {"n": 115, "p": 58, "k": 42},
        "valve_open": False
    },
    {
        "id": "zone-b",
        "name": "Zone B - South Greenhouse",
        "crop": "Roma Tomato",
        "area_ha": 4.2,
        "soil_type": "Sandy Clay Loam",
        "target_moisture": 68.0,
        "base_temp": 25.1,
        "base_moisture": 61.2,
        "base_humidity": 68.5,
        "ph": 6.4,
        "npk": {"n": 98, "p": 76, "k": 118},
        "valve_open": True
    },
    {
        "id": "zone-c",
        "name": "Zone C - Terraced Vineyard",
        "crop": "Cabernet Grapevine",
        "area_ha": 8.0,
        "soil_type": "Calcareous Silt",
        "target_moisture": 45.0,
        "base_temp": 24.8,
        "base_moisture": 36.5,
        "base_humidity": 46.0,
        "ph": 6.9,
        "npk": {"n": 48, "p": 32, "k": 82},
        "valve_open": False
    },
    {
        "id": "zone-d",
        "name": "Zone D - Hydroponic Pods",
        "crop": "Butterhead Lettuce",
        "area_ha": 1.5,
        "soil_type": "Hydroponic Media",
        "target_moisture": 80.0,
        "base_temp": 20.2,
        "base_moisture": 77.8,
        "base_humidity": 74.0,
        "ph": 6.2,
        "npk": {"n": 145, "p": 52, "k": 95},
        "valve_open": False
    }
]


# Pydantic Request Models
class CropRecommendationRequest(BaseModel):
    temperature: float = Field(..., ge=-10, le=60, description="Ambient temperature in °C")
    moisture: float = Field(..., ge=0, le=100, description="Soil moisture %")
    ph: float = Field(..., ge=3.0, le=10.0, description="Soil pH level")
    nitrogen: float = Field(..., ge=0, le=300, description="Nitrogen level in mg/kg")
    phosphorus: float = Field(..., ge=0, le=200, description="Phosphorus level in mg/kg")
    potassium: float = Field(..., ge=0, le=300, description="Potassium level in mg/kg")


class LeafDiagnosisRequest(BaseModel):
    sample_key: Optional[str] = Field(None, description="Preset disease condition key or random")
    image_metadata: Optional[Dict[str, Any]] = None


class ValveToggleRequest(BaseModel):
    zone_id: str
    valve_open: bool


@router.get("/zones")
def get_zones():
    """Retrieve all monitored field zones."""
    return {"status": "success", "zones": FIELD_ZONES}


@router.get("/sensors/current")
def get_current_telemetry():
    """
    Retrieve real-time live sensor telemetry across all zones with simulated micro-variations.
    """
    telemetry = []
    now_epoch = int(time.time())
    
    for z in FIELD_ZONES:
        # Subtle real-world fluctuation simulation
        jitter_temp = round(z["base_temp"] + random.uniform(-0.6, 0.6), 1)
        jitter_moist = round(z["base_moisture"] + random.uniform(-0.8, 0.8), 1)
        jitter_hum = round(z["base_humidity"] + random.uniform(-1.2, 1.2), 1)
        jitter_solar = int(random.uniform(550, 780))

        telemetry.append({
            "zone_id": z["id"],
            "zone_name": z["name"],
            "crop": z["crop"],
            "timestamp": now_epoch,
            "metrics": {
                "soil_moisture_pct": jitter_moist,
                "target_moisture_pct": z["target_moisture"],
                "temperature_c": jitter_temp,
                "humidity_pct": jitter_hum,
                "ph_level": z["ph"],
                "solar_radiation_w_sqm": jitter_solar,
                "npk": z["npk"]
            },
            "irrigation_active": z["valve_open"],
            "health_status": "Optimal" if jitter_moist >= (z["target_moisture"] - 8) else "Water Stress Alert"
        })

    return {"status": "success", "timestamp": now_epoch, "data": telemetry}


@router.post("/ai/crop-recommendation")
def get_crop_recommendation(request: CropRecommendationRequest):
    """
    Evaluates soil parameters and ambient weather to recommend ranked suitable crops.
    """
    rankings = AgronomicAIEngine.recommend_crops(
        temperature=request.temperature,
        moisture=request.moisture,
        ph=request.ph,
        nitrogen=request.nitrogen,
        phosphorus=request.phosphorus,
        potassium=request.potassium
    )
    return {
        "status": "success",
        "input_parameters": request.dict(),
        "recommendations": rankings
    }


@router.post("/ai/diagnose-leaf")
def diagnose_leaf(request: LeafDiagnosisRequest):
    """
    Simulates AI computer vision analysis for plant foliage pathologies.
    """
    result = AgronomicAIEngine.diagnose_leaf(request.sample_key)
    return {
        "status": "success",
        "diagnosis": result
    }


@router.get("/irrigation/schedule")
def get_irrigation_schedule(rain_prob: float = Query(20.0, ge=0, le=100)):
    """
    Calculates intelligent irrigation volumes and runtimes across all field zones.
    """
    schedules = []
    for z in FIELD_ZONES:
        sched = AgronomicAIEngine.calculate_irrigation(
            zone_id=z["id"],
            current_moisture=z["base_moisture"],
            target_moisture=z["target_moisture"],
            area_hectares=z["area_ha"],
            ambient_temp=z["base_temp"],
            forecast_rain_prob=rain_prob
        )
        sched["zone_name"] = z["name"]
        sched["crop"] = z["crop"]
        schedules.append(sched)

    return {
        "status": "success",
        "rain_forecast_probability_pct": rain_prob,
        "schedules": schedules
    }


@router.post("/irrigation/toggle-valve")
def toggle_irrigation_valve(request: ValveToggleRequest):
    """Toggles the simulated irrigation solenoid valve for a specific zone."""
    for z in FIELD_ZONES:
        if z["id"] == request.zone_id:
            z["valve_open"] = request.valve_open
            # If valve is open, slowly replenish soil moisture
            if request.valve_open:
                z["base_moisture"] = min(90.0, z["base_moisture"] + 3.5)
            return {
                "status": "success",
                "zone_id": z["id"],
                "valve_open": z["valve_open"],
                "updated_moisture": z["base_moisture"]
            }

    raise HTTPException(status_code=404, detail="Zone not found")
