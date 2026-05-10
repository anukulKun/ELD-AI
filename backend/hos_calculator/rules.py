CORRIDOR_CITIES = {
    0: "Chicago, IL",
    100: "Bloomington, IL",
    200: "Springfield, IL",
    300: "St. Louis, MO",
    464: "Springfield, MO",
    550: "Joplin, MO",
    638: "Tulsa, OK",
    750: "Oklahoma City, OK",
    900: "Amarillo, TX",
    1000: "Amarillo, TX",
    1100: "Tucumcari, NM",
    1276: "Albuquerque, NM",
    1400: "Gallup, NM",
    1500: "Flagstaff, AZ",
    1600: "Kingman, AZ",
    1740: "Needles, CA",
    1850: "Barstow, CA",
    1914: "San Bernardino, CA",
    2000: "Ontario, CA",
    2100: "Los Angeles, CA",
}


def nearest_city(mile):
    closest = min(CORRIDOR_CITIES.keys(), key=lambda marker: abs(marker - float(mile or 0)))
    return CORRIDOR_CITIES[closest]


RULESET_CONFIG = {
    "70-hour/8-day": {"cycle": 70.0, "days": 8, "drive": 11.0, "window": 14.0, "reset": 10.0},
    "60-hour/7-day": {"cycle": 60.0, "days": 7, "drive": 11.0, "window": 14.0, "reset": 10.0},
    "alaska-70-hour/7-day": {"cycle": 70.0, "days": 7, "drive": 15.0, "window": 20.0, "reset": 10.0},
    "alaska-80-hour/8-day": {"cycle": 80.0, "days": 8, "drive": 15.0, "window": 20.0, "reset": 10.0},
}


def normalize_ruleset(value):
    aliases = {
        "70-hour-8-day": "70-hour/8-day",
        "60-hour-7-day": "60-hour/7-day",
    }
    normalized = aliases.get(value, value)
    return normalized if normalized in RULESET_CONFIG else "70-hour/8-day"


def calculate_hos_compliance_70_hour(driving_hours, on_duty_hours):
    return {
        "compliant": driving_hours <= 11 and on_duty_hours <= 70,
        "remaining_on_duty_hours": max(0, 70 - on_duty_hours),
        "remaining_driving_hours": max(0, 11 - driving_hours),
        "hours_until_required_break": max(0, 8 - driving_hours),
    }
