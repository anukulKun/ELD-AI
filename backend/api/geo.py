import math
import time

import requests

from hos_calculator import nearest_city

FALLBACK_COORDS = {
    "new york, ny": (40.7128, -74.0060),
    "chicago, il": (41.8781, -87.6298),
    "st. louis, mo": (38.6270, -90.1994),
    "saint louis, mo": (38.6270, -90.1994),
    "dallas, tx": (32.7767, -96.7970),
    "los angeles, ca": (34.0522, -118.2437),
    "memphis, tn": (35.1495, -90.0490),
    "atlanta, ga": (33.7490, -84.3880),
    "denver, co": (39.7392, -104.9903),
    "phoenix, az": (33.4484, -112.0740),
}


def geocode(address):
    key = address.strip().lower()
    if key in FALLBACK_COORDS:
        return FALLBACK_COORDS[key]
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": address, "format": "json", "limit": 1},
            headers={"User-Agent": "ELDTripPlanner/1.0"},
            timeout=8,
        )
        time.sleep(1)
        response.raise_for_status()
        payload = response.json()
        if payload:
            return float(payload[0]["lat"]), float(payload[0]["lon"])
    except requests.RequestException:
        pass
    return FALLBACK_COORDS.get(key)


def route_polyline(route, fallback_points):
    if route and route.get("geometry") and route["geometry"].get("coordinates"):
        return [[lat, lng] for lng, lat in route["geometry"]["coordinates"]]
    return [[lat, lng] for lat, lng in fallback_points]


def build_waypoints(start_name, pickup_name, dropoff_name, start, pickup, dropoff, events, polyline, total_distance):
    event_by_type = {event["type"]: event for event in events if event["type"] in {"pickup", "dropoff"}}
    pickup_event = event_by_type.get("pickup", {"day": 1, "arrival_hour": 0})
    dropoff_event = event_by_type.get("dropoff", {"day": 1, "arrival_hour": 0})
    points = [
        waypoint("start", start_name, start[0], start[1], 0, 1, 7.0, start_name),
        waypoint("pickup", pickup_name, pickup[0], pickup[1], route_distance([start, pickup]), pickup_event["day"], pickup_event["arrival_hour"], pickup_name),
        waypoint("dropoff", dropoff_name, dropoff[0], dropoff[1], total_distance, dropoff_event["day"], dropoff_event["arrival_hour"], dropoff_name),
    ]
    for event in events:
        if event["type"] in {"pickup", "dropoff"}:
            continue
        lat, lng = point_at_mile(polyline, event["mile"], total_distance)
        points.append(waypoint(event["type"], event["name"], lat, lng, event["mile"], event["day"], event["arrival_hour"], event.get("location") or nearest_city(event["mile"])))
    return sorted(points, key=lambda item: item["cumulative_miles"])


def waypoint(kind, name, lat, lng, miles, day, hour, location):
    return {
        "type": "rest" if kind == "break" else kind,
        "name": name,
        "location": location,
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "arrival_time": f"Day {day}, {format_hour(hour)}",
        "cumulative_miles": round(miles, 1),
    }


def point_at_mile(polyline, target_mile, total_distance):
    if not polyline:
        return (39.8283, -98.5795)
    if len(polyline) == 1 or total_distance <= 0:
        return tuple(polyline[0])
    traveled = 0.0
    for index in range(len(polyline) - 1):
        start = polyline[index]
        end = polyline[index + 1]
        segment = route_distance([start, end])
        if traveled + segment >= target_mile:
            ratio = (target_mile - traveled) / segment if segment else 0
            return (start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio)
        traveled += segment
    return tuple(polyline[-1])


def route_distance(points):
    total = 0.0
    for index in range(len(points) - 1):
        total += haversine_miles(points[index][0], points[index][1], points[index + 1][0], points[index + 1][1])
    return total


def haversine_miles(lat1, lon1, lat2, lon2):
    radius = 3958.8
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def format_hour(hour):
    hour = hour or 0
    h = int(hour)
    m = int(round((hour - h) * 60))
    suffix = "AM" if h < 12 else "PM"
    display = h % 12 or 12
    return f"{display}:{m:02d} {suffix}"
