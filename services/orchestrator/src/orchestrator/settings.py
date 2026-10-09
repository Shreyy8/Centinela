ERROR:    [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8080): [winerror 10048] only one usage of each socket address (protocol/network address/port) is normally permitted"""Django settings for the CENTINELA orchestrator service."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-change-in-production")
DEBUG = os.environ.get("DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "corsheaders",
    "orchestrator.app",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "orchestrator.urls"

DATABASES = {}  # MongoDB via motor — no Django ORM

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# MongoDB
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.environ.get("MONGODB_DB", "centinela")

# JWT
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-insecure-secret-change-in-production")
JWT_ALGORITHM = "HS256"

# Budget
CENTINELA_MAX_API_CALLS = int(os.environ.get("CENTINELA_MAX_API_CALLS", "50"))
CENTINELA_MAX_BUDGET_USD = float(os.environ.get("CENTINELA_MAX_BUDGET_USD", "5.0"))

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True
# In dev, allow all origins for easier local development
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
