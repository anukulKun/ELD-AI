# RouteGuard ELD Trip Planner

RouteGuard is a full-stack ELD trip planner for commercial drivers and dispatch teams. It combines a Django REST API with a React operations dashboard to plan multi-stop trips, calculate hours-of-service constraints, and generate driver-ready daily log sheets.

## Features

- Plan routes from current location to pickup and dropoff
- Calculate FMCSA-style HOS windows, drive limits, breaks, and cycle usage
- Generate route summaries with distance, driving hours, stop timelines, and compliance warnings
- Render daily log sheets for multi-day trips
- Track recent plans locally in the dashboard history
- Display route geometry and stop context with Leaflet maps
- Support dark and light dashboard themes

## Tech Stack

- Backend: Django, Django REST Framework, django-cors-headers
- Frontend: React, Axios, Leaflet, React Leaflet
- Planning: custom HOS calculator, route planning helpers, and geocoding utilities
- Data store: SQLite for local development

## Project Structure

```text
backend/
  api/                 Trip planning API, serializers, models, and validation
  eld_trip_planner/    Django project settings and URL routing
  hos_calculator/      HOS rules, trip planning, and log generation
  route_calculator/    Route distance and OSRM integration helpers
frontend/
  public/              React app shell
  src/                 Dashboard views, route map, log sheets, and API client
```

## Local Setup

Create a Python environment and install backend dependencies.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Install and run the frontend in another terminal.

```powershell
cd frontend
npm install
npm start
```

The React app runs at `http://localhost:3000` and calls the API at `http://127.0.0.1:8000/api` by default.

## Environment

Copy `.env.example` to `.env` for local values.

```powershell
Copy-Item .env.example .env
```

Supported variables:

- `DJANGO_SECRET_KEY`: Django signing key for the backend
- `DJANGO_DEBUG`: `True` for local development, `False` for deployed environments
- `DJANGO_ALLOWED_HOSTS`: comma-separated hostnames allowed by Django
- `REACT_APP_API_URL`: API base URL used by the React frontend

Keep `.env`, local SQLite databases, virtual environments, build output, admin helper scripts, and walkthrough recordings out of source control.

## API Overview

Primary API endpoints are exposed under `/api/trips/`.

- `POST /api/trips/plan/`: create a calculated route plan with daily logs
- `GET /api/trips/`: list stored trip plans
- `GET /api/trips/recent/`: return the latest saved trips
- `GET /api/trips/{id}/logs/`: return generated daily logs for a trip

Example planning payload:

```json
{
  "driver_name": "John Doe",
  "current_location": "New York, NY",
  "pickup_location": "Chicago, IL",
  "dropoff_location": "Los Angeles, CA",
  "start_time": "2026-05-08T18:11",
  "hos_rules": "70-hour/8-day",
  "current_cycle_hours": 14
}
```

## Verification

Useful checks before committing or deploying:

```powershell
.\.venv\Scripts\python.exe backend\manage.py check
cd frontend
npm.cmd run build
```

The frontend currently has no test files, so `npm.cmd test -- --watchAll=false` exits with React's `No tests found` message.
