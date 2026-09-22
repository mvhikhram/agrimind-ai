"""
Agronomic AI Engine & Precision Diagnostics Service.
Provides analytical algorithms for:
- Crop recommendation & soil chemistry evaluation
- Leaf disease diagnostic classification & treatment plans
- Evapotranspiration-informed irrigation scheduling
- Simulated multi-zone telemetry generation
"""

import math
import random
from typing import Dict, List, Any, Optional

# Standard reference crop library
CROPS_DATABASE = [
    {
        "id": "wheat",
        "name": "Winter Wheat",
        "category": "Cereal",
        "temp_range": (12, 26),
        "moisture_range": (40, 65),
        "ph_range": (6.0, 7.5),
        "optimal_npk": {"n": 120, "p": 60, "k": 40},
        "description": "High tolerance to moderate drought; optimal for temperate plains."
    },
    {
        "id": "tomato",
        "name": "Roma Tomato",
        "category": "Solanaceae",
        "temp_range": (18, 29),
        "moisture_range": (60, 75),
        "ph_range": (6.0, 6.8),
        "optimal_npk": {"n": 100, "p": 80, "k": 120},
        "description": "Requires consistent moisture and high potassium for fruit firmness."
    },
    {
        "id": "grape",
        "name": "Cabernet Sauvignon Grapevine",
        "category": "Viticulture",
        "temp_range": (15, 34),
        "moisture_range": (35, 55),
        "ph_range": (5.5, 7.2),
        "optimal_npk": {"n": 50, "p": 30, "k": 80},
        "description": "Thrives with controlled deficit irrigation to enhance berry sugar brix."
    },
    {
        "id": "lettuce",
        "name": "Butterhead Lettuce",
        "category": "Hydroponic / Greens",
        "temp_range": (13, 23),
        "moisture_range": (70, 85),
        "ph_range": (6.0, 6.5),
        "optimal_npk": {"n": 150, "p": 50, "k": 100},
        "description": "Fast growing, highly sensitive to heat stress and tipburn."
    },
    {
        "id": "corn",
        "name": "Sweet Corn",
        "category": "Cereal / Grain",
        "temp_range": (20, 33),
        "moisture_range": (50, 70),
        "ph_range": (5.8, 7.0),
        "optimal_npk": {"n": 160, "p": 75, "k": 90},
        "description": "Heavy nitrogen feeder requiring steady moisture during tasseling."
    }
]

DISEASE_PROFILES = {
    "early_blight": {
        "disease": "Early Blight (Alternaria solani)",
        "pathogen_type": "Fungal",
        "severity": "Moderate",
        "symptoms": "Concentric rings resembling target boards on older leaves, yellow chlorotic halo.",
        "cause": "Warm temperatures (24-29°C) combined with prolonged leaf wetness.",
        "organic_treatment": "Apply copper octanoate or Bacillus subtilis spray every 7-10 days; prune infected lower foliage.",
        "chemical_treatment": "Azoxystrobin or Chlorothalonil fungicide applications.",
        "confidence_base": 0.94
    },
    "powdery_mildew": {
        "disease": "Powdery Mildew (Erysiphales)",
        "pathogen_type": "Fungal",
        "severity": "Mild to Moderate",
        "symptoms": "White talcum-powder spots on upper leaf surfaces and young shoots.",
        "cause": "High relative humidity with dry leaf surfaces, poor canopy airflow.",
        "organic_treatment": "Potassium bicarbonate spray, neem oil emulsion, or dilute milk spray (1:9 ratio).",
        "chemical_treatment": "Myclobutanil or sulfur-based contact fungicides.",
        "confidence_base": 0.96
    },
    "bacterial_spot": {
        "disease": "Bacterial Leaf Spot (Xanthomonas spp.)",
        "pathogen_type": "Bacterial",
        "severity": "High",
        "symptoms": "Dark brown water-soaked lesions that develop yellow halos and tear out leaves.",
        "cause": "Rain splash, overhead sprinkler irrigation, and temperature above 25°C.",
        "organic_treatment": "Strict drip irrigation only; copper sulfate + mancozeb preventative regime; remove crop debris.",
        "chemical_treatment": "Fixed copper bactericide formulations.",
        "confidence_base": 0.91
    },
    "healthy": {
        "disease": "Healthy Foliage - No Pathology Detected",
        "pathogen_type": "None",
        "severity": "None",
        "symptoms": "Lush chlorophyll pigmentation, intact cuticle, no chlorosis or necroses.",
        "cause": "Optimal photosynthetic equilibrium and balanced micronutrient absorption.",
        "organic_treatment": "Maintain current nutrient balance and preventative bio-stimulant foliar sprays.",
        "chemical_treatment": "None required.",
        "confidence_base": 0.98
    }
}


class AgronomicAIEngine:
    """Core AI diagnostic and recommendation engine."""

    @staticmethod
    def recommend_crops(
        temperature: float,
        moisture: float,
        ph: float,
        nitrogen: float,
        phosphorus: float,
        potassium: float
    ) -> List[Dict[str, Any]]:
        """Calculates suitability score (0-100%) for each candidate crop."""
        rankings = []
        for crop in CROPS_DATABASE:
            # Temperature score
            t_min, t_max = crop["temp_range"]
            if t_min <= temperature <= t_max:
                t_score = 1.0
            else:
                dist = min(abs(temperature - t_min), abs(temperature - t_max))
                t_score = max(0.0, 1.0 - (dist / 12.0))

            # Moisture score
            m_min, m_max = crop["moisture_range"]
            if m_min <= moisture <= m_max:
                m_score = 1.0
            else:
                dist = min(abs(moisture - m_min), abs(moisture - m_max))
                m_score = max(0.0, 1.0 - (dist / 30.0))

            # pH score
            ph_min, ph_max = crop["ph_range"]
            if ph_min <= ph <= ph_max:
                ph_score = 1.0
            else:
                dist = min(abs(ph - ph_min), abs(ph - ph_max))
                ph_score = max(0.0, 1.0 - (dist / 2.0))

            # NPK balance score
            req = crop["optimal_npk"]
            n_ratio = min(nitrogen / max(req["n"], 1), 1.0)
            p_ratio = min(phosphorus / max(req["p"], 1), 1.0)
            k_ratio = min(potassium / max(req["k"], 1), 1.0)
            npk_score = (n_ratio + p_ratio + k_ratio) / 3.0

            # Composite compatibility score
            composite = (
                (t_score * 0.30) +
                (m_score * 0.30) +
                (ph_score * 0.20) +
                (npk_score * 0.20)
            ) * 100.0

            rankings.append({
                "crop_id": crop["id"],
                "name": crop["name"],
                "category": crop["category"],
                "suitability_score": round(composite, 1),
                "temp_compatibility": round(t_score * 100, 1),
                "moisture_compatibility": round(m_score * 100, 1),
                "ph_compatibility": round(ph_score * 100, 1),
                "description": crop["description"]
            })

        rankings.sort(key=lambda x: x["suitability_score"], reverse=True)
        return rankings

    @staticmethod
    def diagnose_leaf(condition_key: Optional[str] = None) -> Dict[str, Any]:
        """Simulates neural vision diagnosis for leaf pathology."""
        if not condition_key or condition_key not in DISEASE_PROFILES:
            # Deterministically or probabilistically pick a diagnostic sample
            keys = list(DISEASE_PROFILES.keys())
            condition_key = random.choice(keys)

        profile = DISEASE_PROFILES[condition_key]
        confidence = round(profile["confidence_base"] - random.uniform(0.0, 0.04), 3)

        return {
            "diagnosis_code": condition_key,
            "disease_name": profile["disease"],
            "pathogen_type": profile["pathogen_type"],
            "severity": profile["severity"],
            "confidence": confidence,
            "symptoms": profile["symptoms"],
            "environmental_catalyst": profile["cause"],
            "organic_remediation": profile["organic_treatment"],
            "chemical_remediation": profile["chemical_treatment"]
        }

    @staticmethod
    def calculate_irrigation(
        zone_id: str,
        current_moisture: float,
        target_moisture: float,
        area_hectares: float,
        ambient_temp: float,
        forecast_rain_prob: float
    ) -> Dict[str, Any]:
        """
        Calculates required irrigation volume and valve runtime based on soil deficit,
        evapotranspiration demand, and rain probability penalty.
        """
        deficit_pct = max(0.0, target_moisture - current_moisture)
        
        # Base water requirement in mm (1 mm over 1 ha = 10,000 liters)
        water_depth_mm = (deficit_pct / 100.0) * 25.0  # active root depth factor
        
        # Temperature evapotranspiration multiplier
        et_factor = 1.0 + max(0.0, (ambient_temp - 20.0) * 0.04)
        
        # Rain discount
        rain_discount = max(0.0, 1.0 - (forecast_rain_prob / 100.0 * 0.7))
        
        adjusted_depth_mm = water_depth_mm * et_factor * rain_discount
        total_liters = adjusted_depth_mm * 10000.0 * area_hectares
        
        # Typical drip system flow rate ~ 35,000 L/hour/ha
        flow_rate_per_hour = 35000.0 * area_hectares
        runtime_minutes = (total_liters / max(flow_rate_per_hour, 1.0)) * 60.0

        action_required = deficit_pct > 8.0 and forecast_rain_prob < 60.0

        return {
            "zone_id": zone_id,
            "current_moisture_pct": round(current_moisture, 1),
            "target_moisture_pct": round(target_moisture, 1),
            "moisture_deficit_pct": round(deficit_pct, 1),
            "water_volume_liters": int(round(total_liters)),
            "suggested_runtime_minutes": int(round(runtime_minutes)),
            "evapotranspiration_index": round(et_factor, 2),
            "rain_delay_applied": forecast_rain_prob >= 60.0,
            "action_required": action_required,
            "status": "Irrigation Recommended" if action_required else "Adequate Moisture / Rain Expected"
        }
