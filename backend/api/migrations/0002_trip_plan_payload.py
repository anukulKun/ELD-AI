from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="trip",
            name="daily_logs",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="trip",
            name="route_plan",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="trip",
            name="total_distance_miles",
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name="trip",
            name="total_driving_hours",
            field=models.FloatField(default=0.0),
        ),
    ]
