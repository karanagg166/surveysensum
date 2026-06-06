import numpy as np
from typing import List, Dict, Any

# Archetype configurations
ARCHETYPES = {
    "Promoter": {
        "weight": 0.40,
        "sat_mean": 4.6,
        "sat_std": 0.4,
        "nps_boost": 2,
        "delivery_prob": 0.92
    },
    "Passive": {
        "weight": 0.30,
        "sat_mean": 3.3,
        "sat_std": 0.5,
        "nps_boost": 0,
        "delivery_prob": 0.80
    },
    "Detractor": {
        "weight": 0.20,
        "sat_mean": 1.6,
        "sat_std": 0.5,
        "nps_boost": -2,
        "delivery_prob": 0.45
    },
    "Mixed": {
        "weight": 0.10,
        "sat_mean": 3.0,
        "sat_std": 0.8,
        "nps_boost": 1,
        "delivery_prob": 0.70
    }
}

CATEGORIES = ["Electronics", "Clothing", "Home", "Other"]
CATEGORY_WEIGHTS = [0.30, 0.35, 0.25, 0.10]

def assign_personas(n: int) -> List[Dict[str, Any]]:
    """
    Assign archetypes and purchasing categories to N respondents.
    """
    archetype_names = list(ARCHETYPES.keys())
    archetype_weights = [ARCHETYPES[name]["weight"] for name in archetype_names]
    
    # Probabilistic assignment of archetypes using NumPy
    assigned_archetypes = np.random.choice(archetype_names, size=n, p=archetype_weights)
    
    # Probabilistic assignment of purchasing categories
    assigned_categories = np.random.choice(CATEGORIES, size=n, p=CATEGORY_WEIGHTS)
    
    personas = []
    for i in range(n):
        archetype_name = assigned_archetypes[i]
        arch_info = ARCHETYPES[archetype_name]
        
        # Build respondent persona
        delivery_on_time = bool(np.random.random() < arch_info["delivery_prob"])
        persona = {
            "respondent_id": f"resp_{i+1:04d}",
            "archetype": archetype_name,
            "sat_mean": arch_info["sat_mean"],
            "sat_std": arch_info["sat_std"],
            "nps_boost": arch_info["nps_boost"],
            "delivery_prob": arch_info["delivery_prob"],
            "delivery_on_time": delivery_on_time,
            "category": assigned_categories[i]
        }
        personas.append(persona)
        
    return personas
