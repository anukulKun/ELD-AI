from django.contrib import admin
from .models import Trip

@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ('driver_name', 'start_location', 'end_location', 'start_time', 'created_at')
    search_fields = ('driver_name', 'start_location', 'end_location')
    list_filter = ('created_at',)
