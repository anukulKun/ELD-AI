"""
URL configuration for eld_trip_planner project.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from django.views.generic import TemplateView


def healthz(_request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('healthz/', healthz),
    path('api/', include('api.urls')),
    path('', TemplateView.as_view(template_name='index.html'), name='app'),
    path('<path:path>', TemplateView.as_view(template_name='index.html'), name='app-catchall'),
]
