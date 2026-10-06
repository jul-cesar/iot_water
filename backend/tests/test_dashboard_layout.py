from pathlib import Path


def test_dashboard_is_directly_deployable() -> None:
    root = Path(__file__).resolve().parents[2]
    dashboard = root / "dashboard"

    for relative_path in (
        "package.json",
        "package-lock.json",
        "vite.config.ts",
        "src/App.tsx",
        "components.json",
    ):
        assert (dashboard / relative_path).exists()

    nested_dashboard = dashboard / "iot-water-dashboard"
    assert not nested_dashboard.exists() or not any(nested_dashboard.iterdir())
    assert not (dashboard / ".gitignore").exists()
