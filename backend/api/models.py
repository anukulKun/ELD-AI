from django.db import models


class Trip(models.Model):
    driver_name = models.CharField(max_length=255)
    start_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255, blank=True, null=True)
    end_location = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    hos_rules = models.CharField(max_length=50, default='70-hour-8-day')
    cycle_hours_used = models.FloatField(default=0.0)
    total_distance_miles = models.FloatField(default=0.0)
    total_driving_hours = models.FloatField(default=0.0)
    route_plan = models.JSONField(default=dict, blank=True)
    daily_logs = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Trip: {self.driver_name} from {self.start_location} to {self.end_location}"

    class Meta:
        ordering = ['-created_at']
