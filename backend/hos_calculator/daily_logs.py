from datetime import date, datetime, time, timedelta

from .rules import nearest_city


class DailyLogBuilderMixin:
    def _build_daily_logs(self, start_dt, raw_segments, starting_cycle):
        split_by_date = self._split_segments_by_date(start_dt, raw_segments)
        logs = []
        cumulative_cycle = float(starting_cycle or 0)
        for index, day in enumerate(sorted(split_by_date.keys()), start=1):
            schedule = self._fill_off_duty(split_by_date[day])
            driving_hours = self._sum_status(schedule, "DRIVING")
            on_not_driving = self._sum_status(schedule, "ON_DUTY_NOT_DRIVING")
            on_duty = driving_hours + on_not_driving
            off_duty = self._sum_status(schedule, "OFF_DUTY")
            sleeper = self._sum_status(schedule, "SLEEPER_BERTH")
            cumulative_cycle += on_duty
            logs.append(self._daily_log(index, day, schedule, driving_hours, on_not_driving, on_duty, off_duty, sleeper, cumulative_cycle))
        return logs

    def _split_segments_by_date(self, start_dt, raw_segments):
        split_by_date = {}
        for segment in raw_segments:
            segment_start = start_dt + timedelta(hours=segment["abs_start"])
            segment_end = start_dt + timedelta(hours=segment["abs_end"])
            cursor = segment_start
            while cursor < segment_end:
                next_midnight = datetime.combine(cursor.date() + timedelta(days=1), time.min)
                slice_end = min(segment_end, next_midnight)
                day = cursor.date().isoformat()
                split_by_date.setdefault(day, []).append({
                    "status": segment["status"],
                    "start_hour": self._hour_of_day(cursor),
                    "end_hour": self._hour_of_day(slice_end) if slice_end.date() == cursor.date() else 24.0,
                    "location": segment["location"],
                    "notes": segment["notes"],
                    "miles": segment["miles"],
                    "odometer_miles": segment["odometer_miles"],
                    "shift_start": segment["shift_start"],
                    "window_expires": segment["window_expires"],
                    "window_remaining_hours": segment["window_remaining_hours"],
                    "shift_id": segment["shift_id"],
                })
                cursor = slice_end
        if not split_by_date:
            split_by_date[start_dt.date().isoformat()] = []
        return split_by_date

    def _daily_log(self, index, day, schedule, driving_hours, on_not_driving, on_duty, off_duty, sleeper, cumulative_cycle):
        total_mileage = self._end_odometer(schedule)
        return {
            "day": index,
            "date": day,
            "timezone": "UTC",
            "co_driver": "",
            "carrier": "RouteGuard ELD",
            "main_office": "123 Dispatch Ave, Chicago, IL 60601",
            "main_office_address": "123 Dispatch Ave, Chicago, IL 60601",
            "home_terminal": "Home Terminal, New York, NY 10001",
            "tractor": "TRK-1042",
            "trailer": "TRL-2208",
            "shipping_documents": "BOL-2026-001",
            "from": self._first_location(schedule),
            "to": self._last_location(schedule),
            "start_location": self._first_location(schedule),
            "end_location": self._last_location(schedule),
            "total_miles": total_mileage,
            "total_mileage": total_mileage,
            "daily_miles": self._driving_miles(schedule),
            "total_hours": round(sum(seg["end_hour"] - seg["start_hour"] for seg in schedule), 2),
            "totals": self._totals(off_duty, sleeper, driving_hours, on_not_driving),
            "events": self._log_events(day, schedule),
            "shift_drive_breakdown": self._shift_drive_breakdown(schedule),
            "shift_start": self._first_shift_value(schedule, "shift_start"),
            "window_expires": self._first_shift_value(schedule, "window_expires"),
            "window_remaining_hours": self._min_window_remaining(schedule),
            "schedule": schedule,
            "remarks": self._log_remarks(schedule),
            "recap": self._recap(on_duty, cumulative_cycle),
            "violations": [],
            "hos_summary": self._hos_summary(driving_hours, on_duty, off_duty, sleeper, cumulative_cycle),
        }

    def _fill_off_duty(self, segments):
        ordered = sorted(segments, key=lambda item: item["start_hour"])
        filled = []
        cursor = 0.0
        for segment in ordered:
            start = round(max(0, min(24, segment["start_hour"])), 2)
            end = round(max(0, min(24, segment["end_hour"])), 2)
            if start > cursor:
                filled.append(self._off_duty_padding(cursor, start, segment))
            if end > start:
                filled.append({**segment, "start_hour": start, "end_hour": end})
                cursor = end
        if cursor < 24:
            filled.append(self._off_duty_padding(cursor, 24.0, ordered[-1] if ordered else {}))
        return self._merge_adjacent(filled)

    def _off_duty_padding(self, start, end, source):
        return {
            "status": "OFF_DUTY",
            "start_hour": start,
            "end_hour": end,
            "location": source.get("location", "Off duty"),
            "notes": "Off duty",
            "miles": source.get("miles", 0),
            "odometer_miles": source.get("odometer_miles", 0),
            "shift_start": source.get("shift_start"),
            "window_expires": source.get("window_expires"),
            "window_remaining_hours": source.get("window_remaining_hours", 0),
            "shift_id": source.get("shift_id"),
        }

    def _merge_adjacent(self, segments):
        merged = []
        for segment in segments:
            if merged and merged[-1]["status"] == segment["status"] and merged[-1]["location"] == segment["location"] and merged[-1]["notes"] == segment["notes"]:
                merged[-1]["end_hour"] = segment["end_hour"]
                merged[-1]["miles"] = segment.get("miles", merged[-1].get("miles", 0))
            else:
                merged.append(segment)
        return merged

    def _totals(self, off_duty, sleeper, driving_hours, on_not_driving):
        return {
            "off_duty": round(off_duty, 2),
            "sleeper": round(sleeper, 2),
            "driving": round(driving_hours, 2),
            "on_duty": round(on_not_driving, 2),
        }

    def _recap(self, on_duty, cumulative_cycle):
        return {
            "on_duty_today": round(on_duty, 2),
            "available_tomorrow": round(max(0, self.cycle_limit - cumulative_cycle), 2),
            "cycle_used": round(cumulative_cycle, 2),
            "cycle_label": f"{int(self.cycle_limit)}-Hour / {self.config['days']}-Day",
        }

    def _hos_summary(self, driving_hours, on_duty, off_duty, sleeper, cumulative_cycle):
        return {
            "driving_hours": round(driving_hours, 2),
            "on_duty_hours": round(on_duty, 2),
            "off_duty_hours": round(off_duty + sleeper, 2),
            "cycle_hours_used_today": round(on_duty, 2),
            "cumulative_cycle_hours": round(cumulative_cycle, 2),
            "available_tomorrow": round(max(0, self.cycle_limit - cumulative_cycle), 2),
        }

    def _end_odometer(self, schedule):
        values = [float(segment.get("odometer_miles") or segment.get("miles") or 0) for segment in schedule]
        return round(max(values) if values else 0, 1)

    def _log_events(self, day, schedule):
        status_map = {"OFF_DUTY": "off_duty", "SLEEPER_BERTH": "sleeper", "DRIVING": "driving", "ON_DUTY_NOT_DRIVING": "on_duty"}
        return [{**self._log_row(day, segment), "status": status_map.get(segment["status"], "off_duty")} for segment in schedule]

    def _log_remarks(self, schedule):
        return [self._remark_row(segment) for segment in schedule if segment.get("notes")]

    def _log_row(self, day, segment):
        return {
            "start": self._iso_for_day_hour(day, segment["start_hour"]),
            "end": self._iso_for_day_hour(day, segment["end_hour"]),
            "duration_hours": round(segment["end_hour"] - segment["start_hour"], 2),
            "location": segment.get("location") or nearest_city(segment.get("miles", 0)),
            "time": self._fmt_hour(segment["start_hour"]),
            "text": segment.get("notes") or self._status_text(segment["status"]),
            "odometer_miles": round(float(segment.get("odometer_miles") or segment.get("miles") or 0), 1),
            "shift_start": segment.get("shift_start"),
            "window_expires": segment.get("window_expires"),
            "window_remaining_hours": segment.get("window_remaining_hours"),
        }

    def _remark_row(self, segment):
        return {
            "time": self._fmt_hour(segment["start_hour"]),
            "location": segment.get("location") or nearest_city(segment.get("miles", 0)),
            "text": segment.get("notes") or self._status_text(segment["status"]),
            "odometer_miles": round(float(segment.get("odometer_miles") or segment.get("miles") or 0), 1),
        }

    def _iso_for_day_hour(self, day, hour):
        base = datetime.combine(date.fromisoformat(day), time.min)
        return (base + timedelta(hours=float(hour or 0))).isoformat() + "Z"

    def _status_text(self, status):
        return {
            "OFF_DUTY": "Off duty",
            "SLEEPER_BERTH": "Sleeper berth",
            "DRIVING": "Driving",
            "ON_DUTY_NOT_DRIVING": "On duty not driving",
        }.get(status, status)

    def _shift_drive_breakdown(self, schedule):
        shifts = {}
        for segment in schedule:
            if segment["status"] == "DRIVING":
                shifts.setdefault(segment.get("shift_id", "shift"), 0)
                shifts[segment.get("shift_id", "shift")] += segment["end_hour"] - segment["start_hour"]
        return [round(hours, 2) for hours in shifts.values()]

    def _first_shift_value(self, schedule, key):
        for segment in schedule:
            if segment.get(key):
                return segment.get(key)
        return None

    def _min_window_remaining(self, schedule):
        values = [segment.get("window_remaining_hours", 0) for segment in schedule if segment.get("window_remaining_hours") is not None]
        return round(min(values), 2) if values else 0

    def _first_location(self, schedule):
        for segment in schedule:
            if segment["status"] != "OFF_DUTY" or segment["location"] != "Off duty":
                return segment["location"]
        return "Off duty"

    def _last_location(self, schedule):
        for segment in reversed(schedule):
            if segment["status"] != "OFF_DUTY" or segment["location"] != "Off duty":
                return segment["location"]
        return "Off duty"
