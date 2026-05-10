from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from hos_calculator import RULESET_CONFIG, normalize_ruleset


def validate_plan_input(data, current_location, pickup_location, dropoff_location):
    missing = []
    if not current_location:
        missing.append("current_location")
    if not pickup_location:
        missing.append("pickup_location")
    if not dropoff_location:
        missing.append("dropoff_location")
    if missing:
        return {"error": "missing_required_fields", "fields": missing, "message": "Missing required trip planning fields."}
    try:
        cycle = float(data.get("current_cycle_hours") or data.get("cycle_hours_used") or 0)
    except (TypeError, ValueError):
        return {"error": "invalid_cycle_hours", "field": "cycle_hours_used", "message": "Cycle hours used must be a number between 0 and 70."}
    if cycle < 0:
        return {"error": "invalid_cycle_hours", "field": "cycle_hours_used", "message": "Cycle hours used cannot be less than 0."}
    ruleset = normalize_ruleset(data.get("hos_rules") or "70-hour/8-day")
    cycle_limit = RULESET_CONFIG[ruleset]["cycle"]
    if cycle > cycle_limit:
        return {"error": "invalid_cycle_hours", "field": "cycle_hours_used", "message": f"Cycle hours used cannot exceed {cycle_limit:g} for this ruleset."}
    return None


def build_summary(daily_logs, events, total_distance, cycle_hours, start_time, calculator):
    breaks = [event for event in events if event["type"] == "break"]
    rests = [event for event in events if event["type"] == "rest"]
    fuels = [event for event in events if event["type"] == "fuel"]
    total_on_duty = sum(log["hos_summary"]["on_duty_hours"] for log in daily_logs)
    first_log = daily_logs[0] if daily_logs else {"hos_summary": {"driving_hours": 0, "on_duty_hours": 0}}
    next_stop = next((event for event in events if event["type"] in {"break", "rest", "fuel"}), None)
    return {
        "eta": estimate_eta(start_time, total_on_duty, rests),
        "drive_limit": calculator.driving_limit,
        "duty_window_limit": calculator.duty_window,
        "cycle_limit": calculator.cycle_limit,
        "fuel_stops": len(fuels),
        "sleeper_resets": len(rests),
        "breaks": len(breaks),
        "planned_stops": len(events),
        "drive_remaining": round(max(0, calculator.driving_limit - first_log["hos_summary"]["driving_hours"]), 1),
        "duty_window_remaining": round(max(0, calculator.duty_window - first_log["hos_summary"]["on_duty_hours"]), 1),
        "cycle_remaining": round(max(0, calculator.cycle_limit - cycle_hours - total_on_duty), 1),
        "next_stop_miles": round(next_stop["mile"], 1) if next_stop else round(total_distance, 1),
        "next_stop_type": next_stop["type"] if next_stop else "dropoff",
        "shift_start": daily_logs[0].get("shift_start") if daily_logs else None,
        "window_expires": daily_logs[0].get("window_expires") if daily_logs else None,
        "drive_remaining_in_window": round(max(0, min(
            calculator.driving_limit - first_log["hos_summary"]["driving_hours"],
            calculator.duty_window - first_log["hos_summary"]["on_duty_hours"],
        )), 1),
    }


def build_compliance(daily_logs, summary):
    violations = []
    warnings = []
    info = [f"Trip planned with {summary['sleeper_resets']} sleeper resets and {summary['breaks']} mandatory breaks"]
    for log in daily_logs:
        if max(log.get("shift_drive_breakdown") or [0]) > summary.get("drive_limit", 11) + 0.01:
            violations.append(f"{log['date']}: driving exceeded 11-hour shift limit")
        if log.get("window_remaining_hours", 0) < 0:
            violations.append(f"{log['date']}: 14-hour window exceeded")
        if log["hos_summary"]["cumulative_cycle_hours"] > summary.get("cycle_limit", 70) + 0.01:
            violations.append(f"{log['date']}: 70-hour cycle exceeded")
        if 0 <= log.get("window_remaining_hours", 99) < 2:
            warnings.append(f"{log['date']}: 14-hour window has less than 2h remaining at a planned duty event")
    if summary["cycle_remaining"] < 3:
        warnings.append(f"Critical warning: cycle hours remaining after trip: {summary['cycle_remaining']}h - near 70-hour limit")
    elif summary["cycle_remaining"] < 10:
        warnings.append(f"Cycle hours remaining after trip: {summary['cycle_remaining']}h - approaching 70-hour limit")
    return {
        "compliance_status": "VIOLATION" if violations else "COMPLIANT",
        "violations": violations,
        "warnings": warnings,
        "info": info,
    }


def estimate_eta(start_time, on_duty_hours, rests):
    start_dt = parse_datetime(start_time) or timezone.now()
    eta = start_dt + timedelta(hours=on_duty_hours + sum(rest.get("duration_hours", 10) for rest in rests))
    return eta.isoformat()


def aware_datetime(value):
    parsed = parse_datetime(value) if value else None
    if not parsed:
        return timezone.now()
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed
