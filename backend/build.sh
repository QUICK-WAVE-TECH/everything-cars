#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

# collectstatic with production settings
export DJANGO_SETTINGS_MODULE=config.settings.production
python manage.py collectstatic --noinput
python manage.py migrate
