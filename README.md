# Water IoT

Monorepo para monitorear calidad y nivel de agua desde nodos IoT.

```text
Arduino + sensores
        ↓
      XBee
        ↓
Python Collector en Mac
        ↓ POST HTTPS
FastAPI en VPS
        ↓
PostgreSQL
        ↓
Dashboard React
```

## Aplicaciones

| Directorio | Aplicación | Documentación |
| --- | --- | --- |
| [`backend/`](backend/) | API FastAPI y persistencia PostgreSQL | [`backend/README.md`](backend/README.md) |
| [`dashboard/`](dashboard/) | Dashboard React, Vite y TypeScript | [`dashboard/README.md`](dashboard/README.md) |

## Desarrollo local

### Backend

```bash
cd backend
cp .env.example .env
uv sync --extra dev
uv run uvicorn app.main:app --reload
```

API: <http://localhost:8000> · Swagger: <http://localhost:8000/docs>

### Dashboard

```bash
cd dashboard
npm ci
npm run dev
```

Vite mostrará la URL local del dashboard.

## Despliegue en Dokploy

Cree dos aplicaciones desde este mismo repositorio:

| Aplicación | Directorio base | Build |
| --- | --- | --- |
| Backend | `backend` | Nixpacks; usa `uv.lock` y `nixpacks.toml` |
| Dashboard | `dashboard` | Nixpacks con Node.js 22 y Vite; usa `package-lock.json` |

Configure las variables de entorno por aplicación. El backend requiere `DATABASE_URL`; no exponga PostgreSQL al collector ni al dashboard.

## Documentación técnica

Las especificaciones y planes se conservan en [`docs/`](docs/).
