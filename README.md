# RouteGuard ELD Trip Planner

RouteGuard is a full-stack trip planning app for commercial drivers. It combines a Django REST API with a React dashboard to plan pickup/dropoff routes, calculate FMCSA hours-of-service windows, and render daily log sheets.

## Features

- Trip planning with current, pickup, and dropoff locations
- HOS calculations for 70-hour/8-day style rulesets
- Route summaries, stop timelines, and compliance warnings
- Daily log sheet generation
- React dashboard with planner, live tracking, and trip history views

## Tech Stack

- Backend: Django, Django REST Framework, django-cors-headers
- Frontend: React, Axios, Leaflet, React Leaflet
- Routing/geocoding helpers: OSRM-compatible route calculation with local fallback behavior

## Setup

Create a Python environment and install backend dependencies:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Install and run the frontend:

```powershell
cd frontend
npm install
npm start
```

The frontend defaults to `http://127.0.0.1:8000/api`. To override it, set `REACT_APP_API_URL` before starting React.

## Environment

Copy `.env.example` to `.env` for local values. Keep `.env`, local SQLite databases, virtual environments, build output, and walkthrough recordings out of source control.
