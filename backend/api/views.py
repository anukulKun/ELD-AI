from uuid import uuid4

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from hos_calculator import HOSCalculator, normalize_ruleset
from route_calculator.route_calculator import get_osrm_route

from .geo import build_waypoints, geocode, route_distance, route_polyline
from .models import Trip
from .planning import aware_datetime, build_compliance, build_summary, validate_plan_input
from .serializers import TripSerializer


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer

    @action(detail=False, methods=["post"], url_path="plan")
    def plan(self, request):
        current_location = request.data.get("current_location") or request.data.get("start_location")
        pickup_location = request.data.get("pickup_location")
        dropoff_location = request.data.get("dropoff_location") or request.data.get("end_location")
        validation_error = validate_plan_input(request.data, current_location, pickup_location, dropoff_location)
        if validation_error:
            return Response(validation_error, status=status.HTTP_400_BAD_REQUEST)

        current_cycle_hours = float(request.data.get("current_cycle_hours") or request.data.get("cycle_hours_used") or 0)
        driver_name = request.data.get("driver_name") or "Driver"
        hos_rules = normalize_ruleset(request.data.get("hos_rules") or "70-hour/8-day")
        start_time = request.data.get("start_time") or timezone.now().isoformat()

        start, pickup, dropoff = geocode(current_location), geocode(pickup_location), geocode(dropoff_location)
        for field, value, coords in [
            ("start_location", current_location, start),
            ("pickup_location", pickup_location, pickup),
            ("dropoff_location", dropoff_location, dropoff),
        ]:
            if coords is None:
                return Response({
                    "error": "location_not_found",
                    "field": field,
                    "message": f"Could not geocode '{value}' - please use a city and state format like 'Chicago, IL'",
                }, status=status.HTTP_400_BAD_REQUEST)

        route = get_osrm_route([(start[1], start[0]), (pickup[1], pickup[0]), (dropoff[1], dropoff[0])])
        polyline = route_polyline(route, [start, pickup, dropoff])
        total_distance_miles = route["distance"] / 1609.344 if route else route_distance(polyline)
        pickup_mile = route["legs"][0]["distance"] / 1609.344 if route and route.get("legs") else route_distance([start, pickup])

        calculator = HOSCalculator(hos_rules)
        daily_logs, planned_events = calculator.plan_trip(
            total_distance_miles=total_distance_miles,
            current_cycle_hours=current_cycle_hours,
            pickup_mile=pickup_mile,
            dropoff_mile=total_distance_miles,
            start_time=start_time,
            start_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
        )
        for log in daily_logs:
            log["driver_name"] = driver_name

        waypoints = build_waypoints(current_location, pickup_location, dropoff_location, start, pickup, dropoff, planned_events, polyline, total_distance_miles)
        total_on_duty = sum(log["hos_summary"]["on_duty_hours"] for log in daily_logs)
        total_driving_hours = total_distance_miles / HOSCalculator.AVG_SPEED_MPH
        summary = build_summary(daily_logs, planned_events, total_distance_miles, current_cycle_hours, start_time, calculator)
        response = self._plan_response(
            current_location, pickup_location, dropoff_location, driver_name, start_time,
            hos_rules, calculator, total_distance_miles, total_driving_hours,
            total_on_duty, current_cycle_hours, polyline, waypoints, route, daily_logs,
            summary, build_compliance(daily_logs, summary),
        )
        trip = self._save_trip(response, current_location, pickup_location, dropoff_location, start_time, hos_rules, current_cycle_hours, driver_name)
        response["trip_id"] = trip.id
        return Response(response)

    @action(detail=False, methods=["get"])
    def recent(self, request):
        recent_trips = Trip.objects.all()[:5]
        serializer = self.get_serializer(recent_trips, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def details(self, request, pk=None):
        trip = self.get_object()
        serializer = self.get_serializer(trip)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="logs")
    def logs(self, request, pk=None):
        return Response(self.get_object().daily_logs)

    @action(detail=False, methods=["post"], url_path="save-trail")
    def save_trail(self, request):
        trail = request.data.get("trail", [])
        if not isinstance(trail, list):
            return Response({"error": "invalid_trail", "message": "Trail must be an array of GPS points."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"saved": len(trail), "trip_id": request.data.get("trip_id")})

    def _plan_response(self, current_location, pickup_location, dropoff_location, driver_name, start_time, hos_rules, calculator, total_distance_miles, total_driving_hours, total_on_duty, current_cycle_hours, polyline, waypoints, route, daily_logs, summary, compliance):
        return {
            "trip_id": str(uuid4()),
            "trip_title": f"{current_location} \u2192 {pickup_location} \u2192 {dropoff_location}",
            "timezone": "UTC",
            "driver_name": driver_name,
            "start_location": current_location,
            "pickup_location": pickup_location,
            "dropoff_location": dropoff_location,
            "start_time": start_time,
            "hos_rules": hos_rules,
            "ruleset_config": calculator.config,
            "total_distance_miles": round(total_distance_miles, 1),
            "total_driving_hours": round(total_driving_hours, 2),
            "total_on_duty_hours": round(total_on_duty, 2),
            "total_days": len(daily_logs),
            "current_cycle_hours": current_cycle_hours,
            "remaining_cycle_hours": round(max(0, calculator.cycle_limit - current_cycle_hours - total_on_duty), 2),
            "route": {
                "polyline": polyline,
                "waypoints": waypoints,
                "estimated": bool(route.get("estimated")) if route else True,
                "label": f"Route: {current_location} \u2192 {pickup_location} \u2192 {dropoff_location} via I-55/I-40 | {'Estimated' if route and route.get('estimated') else 'OSRM'}",
            },
            "daily_logs": daily_logs,
            "summary": summary,
            **compliance,
        }

    def _save_trip(self, response, current_location, pickup_location, dropoff_location, start_time, hos_rules, current_cycle_hours, driver_name):
        return Trip.objects.create(
            driver_name=driver_name,
            start_location=current_location,
            pickup_location=pickup_location,
            end_location=dropoff_location,
            start_time=aware_datetime(start_time),
            hos_rules=hos_rules,
            cycle_hours_used=current_cycle_hours,
            total_distance_miles=response["total_distance_miles"],
            total_driving_hours=response["total_driving_hours"],
            route_plan=response["route"],
            daily_logs=response["daily_logs"],
        )
