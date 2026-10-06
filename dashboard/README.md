# AquaMonitor — Dashboard IoT de agua

Dashboard web (React + Vite + TanStack Query + Recharts) que muestra en tiempo real la telemetría de calidad y nivel de agua.

## Uso

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas de dominio (node:test)
npm run lint && npm run build
```

## Configuración

| Variable       | Predeterminado             | Uso                    |
| -------------- | -------------------------- | ---------------------- |
| `VITE_API_URL` | `https://iot.julcesar.xyz` | URL base del backend   |

`VITE_API_URL` se incrusta en tiempo de **build**: cambiarla requiere reconstruir la imagen.

## Despliegue (Docker)

```bash
docker build -t iot-water-dashboard --build-arg VITE_API_URL=https://iot.julcesar.xyz .
docker run -p 8080:8080 iot-water-dashboard   # http://localhost:8080
```

- Imagen final: nginx sin root, puerto **8080**, healthcheck en `/health`.
- El build ejecuta `npm test` y falla si alguna prueba falla.
- Rutas desconocidas sirven `index.html`; `/assets/*` se cachea 1 año (nombres con hash).
- En Dokploy/Coolify: tipo *Dockerfile*, contexto `dashboard/`, puerto 8080, build arg `VITE_API_URL`.
- El backend debe permitir el origen del dashboard en `CORS_ORIGINS` (hoy `*`).

## API consumida

- `GET /api/nodes` → `string[]`
- `GET /api/measurements/latest?node_id=…` → medición, o `404` si el nodo no tiene datos
- `GET /api/measurements?node_id&from_date&to_date&limit&offset` → mediciones, más recientes primero

## Comportamiento

- Última medición: consulta cada **2 s**.
- Conexión: `EN LÍNEA` si la última lectura tiene ≤ **15 s**; `SIN DATOS` si es más antigua; `SIN CONEXIÓN` si la API falla (se conservan los últimos valores).
- Estado del agua: se usa `water_status` del backend. El frontend solo explica los motivos (pH y turbidez).
- Histórico: hasta 2.000 registros por periodo (1 h, 6 h, 24 h, 7 días o rango personalizado), una gráfica por variable.
- Tabla: 20 filas por página con “Cargar más”.
- Fechas UTC mostradas en la hora local del navegador.

## Estructura

```
src/lib/api.ts           contrato HTTP y tipos
src/lib/water.ts         motivos, severidad, conexión y formato de fechas
src/lib/time-range.ts    periodos históricos
src/lib/sensors.ts       metadatos de las cinco variables
src/hooks/use-telemetry.ts  consultas TanStack Query
src/components/dashboard/   encabezado, estado, tarjetas, gráficas, filtros y tabla
```

Alertas, estadísticas, exportación y notificaciones se agregan sobre `use-telemetry.ts` y `lib/` cuando se requieran.
