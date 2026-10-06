from pathlib import Path


def repository_root() -> Path:
    tests_dir = Path(__file__).resolve().parent
    return (
        tests_dir.parent.parent
        if tests_dir.parent.name == "backend"
        else tests_dir.parent
    )


def test_backend_is_self_contained() -> None:
    root = repository_root()
    backend = root / "backend"

    for relative_path in (
        "app/main.py",
        "pyproject.toml",
        "uv.lock",
        "Dockerfile",
        "nixpacks.toml",
    ):
        assert (backend / relative_path).exists()

    for root_artifact in (
        "app",
        "tests",
        "pyproject.toml",
        "uv.lock",
        "Dockerfile",
        "nixpacks.toml",
    ):
        assert not (root / root_artifact).exists()

    docker_ignores = (backend / ".dockerignore").read_text(encoding="utf-8")
    assert "uv.lock" not in docker_ignores.splitlines()
