from rest_framework import serializers
from .models import Trip


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = [
            'id',
            'driver_name',
            'start_location',
            'pickup_location',
            'end_location',
            'start_time',
            'hos_rules',
            'cycle_hours_used',
            'total_distance_miles',
            'total_driving_hours',
            'route_plan',
            'daily_logs',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_driver_name(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Driver name cannot be empty.")
        return value

    def validate_start_location(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Start location cannot be empty.")
        return value

    def validate_end_location(self, value):
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("End location cannot be empty.")
        return value
