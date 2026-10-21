import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://water_user:test@localhost:5432/water_iot_test",
)
os.environ.setdefault("HISTORY_USERNAME", "admin")
os.environ.setdefault("HISTORY_PASSWORD", "test-password")
