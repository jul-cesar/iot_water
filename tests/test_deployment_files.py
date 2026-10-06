from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_dockerfile_runs_as_non_root_with_healthcheck() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")

    assert "FROM python:3.12-slim" in dockerfile
    assert "USER app" in dockerfile
    assert "HEALTHCHECK" in dockerfile
    assert (
        'CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]'
        in dockerfile
    )


def test_example_environment_has_required_settings_without_real_credentials() -> None:
    example = (ROOT / ".env.example").read_text(encoding="utf-8")

    for key in ("DATABASE_URL", "APP_NAME", "APP_ENV", "API_PREFIX", "CORS_ORIGINS"):
        assert f"{key}=" in example
    assert "CHANGE_ME" in example
    assert "secret" not in example.lower()


def test_readme_documents_operation_and_schema_policy() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    for required in (
        "python -m venv",
        "uvicorn app.main:app",
        "/docs",
        "curl -X POST",
        "docker build",
        "docker run",
        "metadata.create_all",
        "Alembic",
        "CORS_ORIGINS",
    ):
        assert required in readme


def test_lockfile_matches_project() -> None:
    lockfile = (ROOT / "uv.lock").read_text(encoding="utf-8")

    for dependency in ("sqlalchemy", "psycopg", "pydantic-settings"):
        assert f'name = "{dependency}"' in lockfile
