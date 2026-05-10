"""
WSGI config for eld_trip_planner project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eld_trip_planner.settings')

application = get_wsgi_application()
