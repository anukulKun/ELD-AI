"""
CORS middleware configuration for eld_trip_planner project.
"""

import os

from decouple import Csv, config


DEFAULT_CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

CORS_ALLOWED_ORIGINS = config(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    default=",".join(DEFAULT_CORS_ALLOWED_ORIGINS),
    cast=Csv(),
)
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    render_origin = f"https://{RENDER_EXTERNAL_HOSTNAME}"
    if render_origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(render_origin)

CORS_ALLOW_CREDENTIALS = config("DJANGO_CORS_ALLOW_CREDENTIALS", default=True, cast=bool)
