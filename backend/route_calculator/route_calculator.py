"""
Route Calculator for ELD Trip Planner
Handles route geometry retrieval and optimization using OSRM
"""

import requests
from typing import Dict, List, Tuple, Optional


OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"


def get_osrm_route(coordinates: List[Tuple[float, float]]) -> Optional[Dict]:
    """
    Get route information from OSRM service.
    coordinates: List of (longitude, latitude) tuples
    Returns: Dict with distance (meters) and duration (seconds)
    """
    if not coordinates or len(coordinates) < 2:
        return None

    # Format coordinates for OSRM: lon1,lat1;lon2,lat2;...
    coords_str = ";".join([f"{lon},{lat}" for lon, lat in coordinates])
    # FIX 3.3: keep OSRM from blocking the app; callers can render fallback geometry.
    url = f"{OSRM_BASE_URL}/{coords_str}?overview=full&geometries=geojson&steps=true&annotations=distance,duration"

    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data['code'] == 'Ok' and data['routes']:
                route = data['routes'][0]
                return {
                    'distance': route['distance'],  # in meters
                    'duration': route['duration'],  # in seconds
                    'geometry': route['geometry'],
                    'legs': route.get('legs', []),
                    'estimated': False,
                }
        return fallback_route_estimation(coordinates)
    except requests.exceptions.RequestException:
        return fallback_route_estimation(coordinates)


def fallback_route_estimation(coordinates: List[Tuple[float, float]]) -> Dict:
    """
    Fallback estimation when OSRM is unavailable.
    Uses haversine formula for distance approximation.
    """
    total_distance = 0
    total_duration = 0

    for i in range(len(coordinates) - 1):
        dist = haversine_distance(
            coordinates[i][1], coordinates[i][0],
            coordinates[i+1][1], coordinates[i+1][0]
        )
        total_distance += dist
        total_duration += (dist / 100 * 3600)  # Assume ~100 km/h average

    return {
        'distance': total_distance * 1000,  # Convert to meters
        'duration': total_duration,  # in seconds
        'geometry': None,
        'estimated': True,
    }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in kilometers.
    """
    from math import radians, cos, sin, asin, sqrt

    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    km = 6371 * c
    return km


def estimate_travel_time(distance_km: float, avg_speed_kmh: float = 80) -> int:
    """
    Estimate travel time in seconds.
    """
    hours = distance_km / avg_speed_kmh
    return int(hours * 3600)


def format_route_response(route_data: Dict) -> Dict:
    """
    Format route data for API response.
    """
    distance_km = route_data['distance'] / 1000
    duration_hours = route_data['duration'] / 3600

    return {
        'distance_km': round(distance_km, 2),
        'duration_hours': round(duration_hours, 2),
        'duration_formatted': format_duration(route_data['duration']),
    }


def format_duration(seconds: int) -> str:
    """
    Format duration in seconds to readable string.
    """
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return f"{hours}h {minutes}m"
