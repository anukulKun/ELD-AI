# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Trip',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('driver_name', models.CharField(max_length=255)),
                ('start_location', models.CharField(max_length=255)),
                ('pickup_location', models.CharField(blank=True, max_length=255, null=True)),
                ('end_location', models.CharField(max_length=255)),
                ('start_time', models.DateTimeField()),
                ('hos_rules', models.CharField(default='70-hour-8-day', max_length=50)),
                ('cycle_hours_used', models.FloatField(default=0.0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
