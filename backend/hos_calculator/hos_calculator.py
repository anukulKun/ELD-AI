from datetime import date, datetime, time, timedelta

from .daily_logs import DailyLogBuilderMixin
from .rules import RULESET_CONFIG, nearest_city, normalize_ruleset


class HOSCalculator(DailyLogBuilderMixin):
    BREAK_AFTER = 8.0
    BREAK_DURATION = 0.5
    PICKUP_TIME = 1.0
    DROPOFF_TIME = 1.0
    FUEL_STOP_TIME = 0.5
    FUEL_INTERVAL_MILES = 1000
    AVG_SPEED_MPH = 58
    PRETRIP_TIME = 0.5

    def __init__(self, ruleset="70-hour/8-day"):
        self.ruleset = normalize_ruleset(ruleset)
        self.config = RULESET_CONFIG[self.ruleset]
        self.driving_limit = self.config["drive"]
        self.duty_window = self.config["window"]
        self.rest_required = self.config["reset"]
        self.cycle_limit = self.config["cycle"]

    def plan_trip(self, total_distance_miles, current_cycle_hours, pickup_mile, dropoff_mile, start_time=None, start_location="Current location", pickup_location="Pickup", dropoff_location="Dropoff"):
        start_dt = self._parse_start_time(start_time)
        total_distance = float(total_distance_miles)
        state = self._initial_state(current_cycle_hours)
        raw_segments, stop_events = [], []
        pending_events = self._build_events(total_distance, pickup_mile, dropoff_mile)

        def add_segment(status, duration, location, notes, miles):
            if duration <= 0:
                return
            event_time = start_dt + timedelta(hours=state["abs_hour"])
            shift_start_dt = start_dt + timedelta(hours=state["duty_start"])
            window_expires_dt = shift_start_dt + timedelta(hours=self.duty_window)
            raw_segments.append({
                "status": status,
                "abs_start": round(state["abs_hour"], 4),
                "abs_end": round(state["abs_hour"] + duration, 4),
                "location": location,
                "notes": notes,
                "miles": self._clamped_miles(miles, total_distance),
                "odometer_miles": self._clamped_miles(miles, total_distance),
                "shift_start": shift_start_dt.isoformat(),
                "window_expires": window_expires_dt.isoformat(),
                "window_remaining_hours": round(max(0, (window_expires_dt - event_time).total_seconds() / 3600), 2),
                "shift_id": round(state["duty_start"], 4),
            })
            state["abs_hour"] += duration

        def start_new_duty_period():
            state.update({"duty_start": state["abs_hour"], "duty_drive": 0.0, "driving_since_break": 0.0})
            location = start_location if state["current_mile"] < 1 else nearest_city(state["current_mile"])
            add_segment("ON_DUTY_NOT_DRIVING", self.PRETRIP_TIME, location, "Pre-trip inspection", state["current_mile"])
            state["cycle_used"] += self.PRETRIP_TIME

        start_new_duty_period()
        while state["current_mile"] < total_distance - 0.05 and len(raw_segments) < 500:
            if self._needs_cycle_restart(state):
                self._add_reset(stop_events, add_segment, state, "34-Hour Restart", 34.0, reset_cycle=True)
                start_new_duty_period()
                continue
            if self._needs_shift_reset(state):
                self._add_reset(stop_events, add_segment, state, "10-Hour Reset", self.rest_required)
                start_new_duty_period()
                continue
            if state["driving_since_break"] >= self.BREAK_AFTER:
                self._add_break(stop_events, add_segment, state)
                continue

            next_event = pending_events[0] if pending_events else None
            drive_hours = self._drive_hours_until_limit(state, total_distance, next_event)
            if drive_hours <= 0.001:
                self._add_reset(stop_events, add_segment, state, "10-Hour Reset", self.rest_required)
                start_new_duty_period()
                continue

            self._add_driving(add_segment, state, drive_hours)
            if next_event and state["current_mile"] >= next_event["mile"] - 0.05:
                if self._event_needs_reset(state, next_event):
                    self._add_reset(stop_events, add_segment, state, "10-Hour Reset", self.rest_required)
                    start_new_duty_period()
                    continue
                self._add_route_event(stop_events, add_segment, state, pending_events, next_event, pickup_location, dropoff_location)

        return self._build_daily_logs(start_dt, raw_segments, current_cycle_hours), self._decorate_stop_events(start_dt, stop_events)

    def _initial_state(self, current_cycle_hours):
        return {"current_mile": 0.0, "abs_hour": 0.0, "cycle_used": float(current_cycle_hours or 0), "duty_start": 0.0, "duty_drive": 0.0, "driving_since_break": 0.0}

    def _clamped_miles(self, miles, total_distance):
        return round(max(0.0, min(float(miles or 0), total_distance)), 1)

    def _needs_cycle_restart(self, state):
        return state["cycle_used"] >= self.cycle_limit

    def _needs_shift_reset(self, state):
        return state["duty_drive"] >= self.driving_limit or state["abs_hour"] - state["duty_start"] >= self.duty_window

    def _add_reset(self, stop_events, add_segment, state, name, duration, reset_cycle=False):
        stop_events.append(self._stop_event("rest", name, state["current_mile"], state["abs_hour"], duration))
        notes = "34-hour restart" if reset_cycle else f"{self.rest_required:g}-hour mandatory rest"
        add_segment("OFF_DUTY" if reset_cycle else "SLEEPER_BERTH", duration, nearest_city(state["current_mile"]), notes, state["current_mile"])
        if reset_cycle:
            state["cycle_used"] = 0.0

    def _add_break(self, stop_events, add_segment, state):
        stop_events.append(self._stop_event("break", "30-Minute Break", state["current_mile"], state["abs_hour"], self.BREAK_DURATION))
        add_segment("OFF_DUTY", self.BREAK_DURATION, nearest_city(state["current_mile"]), "30-minute mandatory break", state["current_mile"])
        state["driving_since_break"] = 0.0

    def _drive_hours_until_limit(self, state, total_distance, next_event):
        miles_to_event = max(0.0, next_event["mile"] - state["current_mile"]) if next_event else total_distance - state["current_mile"]
        return min(
            self.driving_limit - state["duty_drive"],
            self.duty_window - (state["abs_hour"] - state["duty_start"]),
            self.BREAK_AFTER - state["driving_since_break"],
            self.cycle_limit - state["cycle_used"],
            (total_distance - state["current_mile"]) / self.AVG_SPEED_MPH,
            miles_to_event / self.AVG_SPEED_MPH,
        )

    def _add_driving(self, add_segment, state, drive_hours):
        state["current_mile"] += drive_hours * self.AVG_SPEED_MPH
        add_segment("DRIVING", drive_hours, nearest_city(state["current_mile"]), "Driving", state["current_mile"])
        state["duty_drive"] += drive_hours
        state["driving_since_break"] += drive_hours
        state["cycle_used"] += drive_hours

    def _event_needs_reset(self, state, next_event):
        duration = next_event["duration"]
        return state["abs_hour"] - state["duty_start"] + duration > self.duty_window or state["cycle_used"] + duration > self.cycle_limit

    def _add_route_event(self, stop_events, add_segment, state, pending_events, next_event, pickup_location, dropoff_location):
        stop_events.append(self._stop_event(next_event["type"], next_event["name"], next_event["mile"], state["abs_hour"], next_event["duration"]))
        event_location = pickup_location if next_event["type"] == "pickup" else dropoff_location if next_event["type"] == "dropoff" else nearest_city(next_event["mile"])
        add_segment("ON_DUTY_NOT_DRIVING", next_event["duration"], event_location, next_event["notes"], next_event["mile"])
        state["cycle_used"] += next_event["duration"]
        if next_event["duration"] >= self.BREAK_DURATION:
            state["driving_since_break"] = 0.0
        pending_events.pop(0)

    def _build_events(self, total_distance, pickup_mile, dropoff_mile):
        events = [
            {"type": "pickup", "mile": float(pickup_mile), "duration": self.PICKUP_TIME, "name": "Pickup", "notes": "Pickup - 1 hour"},
            {"type": "dropoff", "mile": float(dropoff_mile), "duration": self.DROPOFF_TIME, "name": "Dropoff", "notes": "Dropoff - 1 hour"},
        ]
        fuel_mile, fuel_index = self.FUEL_INTERVAL_MILES, 1
        while fuel_mile < total_distance:
            events.append({"type": "fuel", "mile": float(fuel_mile), "duration": self.FUEL_STOP_TIME, "name": f"Fuel Stop #{fuel_index}", "notes": "Fuel stop - 0.5 hour"})
            fuel_index += 1
            fuel_mile += self.FUEL_INTERVAL_MILES
        return sorted(events, key=lambda event: event["mile"])

    def _stop_event(self, kind, name, mile, abs_hour, duration):
        return {"type": kind, "name": name, "mile": float(mile), "abs_hour": float(abs_hour), "duration_hours": duration, "location": nearest_city(mile)}

    def _decorate_stop_events(self, start_dt, events):
        decorated = []
        for event in events:
            event_dt = start_dt + timedelta(hours=event["abs_hour"])
            decorated.append({**event, "day": (event_dt.date() - start_dt.date()).days + 1, "arrival_hour": self._hour_of_day(event_dt), "arrival_datetime": event_dt.isoformat()})
        return decorated

    def _sum_status(self, schedule, status):
        return sum(segment["end_hour"] - segment["start_hour"] for segment in schedule if segment["status"] == status)

    def _driving_miles(self, schedule):
        return round(self._sum_status(schedule, "DRIVING") * self.AVG_SPEED_MPH, 1)

    def _hour_of_day(self, value):
        return round(value.hour + value.minute / 60 + value.second / 3600, 2)

    def _fmt_hour(self, hour):
        h = int(hour)
        m = int(round((hour - h) * 60))
        if m == 60:
            h += 1
            m = 0
        return f"{h:02d}:{m:02d}"

    def _parse_start_time(self, start_time):
        if isinstance(start_time, datetime):
            return start_time.replace(tzinfo=None)
        if isinstance(start_time, str) and start_time:
            try:
                return datetime.fromisoformat(start_time.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                pass
        return datetime.combine(date.today(), time(hour=7))
