import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://water_user:test@localhost:5432/water_iot_test",
)
os.environ.setdefault("HISTORY_USERNAME", "admin")
os.environ.setdefault(
    "HISTORY_PASSWORD_HASH",
    "scrypt$30313233343536373839616263646566$"
    "3fb2ced15c9ea23345f8fccf4b4545e2d62bd0ae71c54cec93aa91b18666a9dd",
)
