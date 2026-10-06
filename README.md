# Water IoT API

Backend FastAPI para recibir, validar y almacenar mediciones de calidad y nivel de agua procedentes de nodos IoT.

```text
Arduino + sensores
        ↓
      XBee
        ↓
Python Collector en Mac
        ↓ POST HTTPS
FastAPI en VPS
        ↓
PostgreSQL existente
        ↓
Dashboard futuro
```

El collector se comunica únicamente con esta API. No debe conectarse directamente a PostgreSQL.

## Requisitos

- Python 3.12 o superior.
- Una base PostgreSQL existente y accesible.
- Docker, solo si se ejecutará en contenedor.

## Ejecución local

### 1. Crear el entorno virtual

```bash
python -m venv .venv
```

Activarlo:

```bash
# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

### 2. Instalar dependencias

```bash
pip install -e ".[dev]"
```

También puede usarse `uv`:

```bash
uv sync --extra dev
```

### 3. Configurar variables

```bash
cp .env.example .env
```

Edite `.env` y configure la conexión real:

```dotenv
DATABASE_URL=postgresql+psycopg://usuario:password@host:5432/database
APP_NAME=Water IoT API
APP_ENV=development
API_PREFIX=/api
CORS_ORIGINS=*
```

No agregue `.env` al repositorio. La aplicación no registra `DATABASE_URL` ni credenciales.

### 4. Iniciar la API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

La documentación Swagger estará en:

- <http://localhost:8000/docs>
- OpenAPI JSON: <http://localhost:8000/openapi.json>

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Comprueba la API y ejecuta `SELECT 1` en PostgreSQL |
| POST | `/api/measurements` | Guarda una medición |
| GET | `/api/measurements` | Lista y filtra mediciones |
| GET | `/api/measurements/latest` | Devuelve la medición más reciente |
| GET | `/api/measurements/{id}` | Busca una medición por ID |
| GET | `/api/nodes` | Lista los nodos conocidos |

La lista admite `node_id`, `from_date`, `to_date`, `limit` (1–1000) y `offset`.

## Ejemplos curl

### Crear una medición

```bash
curl -X POST http://localhost:8000/api/measurements \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "Nodo_01_Agua",
    "temperature": 30.7,
    "ph": 3.95,
    "turbidity": 8.6,
    "tds": 73,
    "level": 0
  }'
```

La respuesta incluye `id`, `created_at` y `water_status`. Un pH bajo o una turbidez alta se almacenan porque pueden representar una alerta real.

### Consultar mediciones

```bash
curl "http://localhost:8000/api/measurements?node_id=Nodo_01_Agua&limit=50"
curl "http://localhost:8000/api/measurements/latest?node_id=Nodo_01_Agua"
curl http://localhost:8000/api/nodes
curl http://localhost:8000/health
```

## Estado del agua

`water_status` se calcula al responder y no se almacena:

- `CRITICAL`: turbidez mayor que 8, pH menor que 5.5 o pH mayor que 9.5.
- `WARNING`: turbidez mayor que 5, pH menor que 6.5 o pH mayor que 8.5.
- `OPTIMAL`: cualquier otro caso.

## Esquema de base de datos

Durante el arranque, el lifespan de FastAPI verifica PostgreSQL y ejecuta `Base.metadata.create_all(bind=engine)`. Esto crea la tabla `measurements` y sus índices si no existen; nunca borra ni recrea tablas existentes.

`metadata.create_all()` es apropiado para esta primera versión, pero no modifica de forma segura tablas ya creadas. Use **Alembic** para cualquier cambio futuro del esquema.

Si PostgreSQL no está disponible, la aplicación falla durante el arranque con un mensaje genérico y sin exponer credenciales.

## CORS

`CORS_ORIGINS=*` facilita el desarrollo. En producción, use únicamente los dominios autorizados, separados por comas:

```dotenv
CORS_ORIGINS=https://dashboard.example.com,https://admin.example.com
```

## Pruebas

```bash
pytest -v
# o
uv run pytest -v
```

Las pruebas usan SQLite de forma aislada. La aplicación desplegada usa PostgreSQL mediante psycopg 3.

## Docker

### Construir

```bash
docker build -t water-iot-api .
```

### Ejecutar

Cuando PostgreSQL corre fuera del contenedor, `localhost` dentro del contenedor no apunta al host. Configure en `.env` el hostname o IP accesible de la VPS.

```bash
docker run -d \
  --name water-iot-api \
  --restart unless-stopped \
  --env-file .env \
  -p 8000:8000 \
  water-iot-api
```

Comprobar:

```bash
docker logs water-iot-api
docker inspect --format='{{json .State.Health}}' water-iot-api
curl http://localhost:8000/health
```

El contenedor ejecuta Uvicorn como usuario no root e incluye un healthcheck.

## Despliegue básico en una VPS

1. Instale Docker y copie o clone este proyecto.
2. Confirme que PostgreSQL acepta conexiones desde el contenedor y que el usuario solo tiene los permisos necesarios sobre la base elegida.
3. Copie `.env.example` a `.env`, configure `DATABASE_URL` y restrinja el archivo: `chmod 600 .env`.
4. Configure `CORS_ORIGINS` con los dominios reales del dashboard.
5. Ejecute `docker build -t water-iot-api .`.
6. Inicie el contenedor con el comando anterior y revise `/health` y `/docs`.
7. Coloque Nginx, Caddy o el proxy de la VPS delante del puerto 8000 para publicar HTTPS.
8. Permita en el firewall únicamente los puertos públicos necesarios. PostgreSQL no debe exponerse públicamente para el collector.
9. Configure copias de seguridad de PostgreSQL y supervise el healthcheck del contenedor.

Para actualizar, construya una nueva imagen, detenga el contenedor anterior y ejecútelo de nuevo con el mismo `.env`.

## Extensiones futuras

La separación entre rutas, services y repositories permite incorporar más nodos, dashboard React, estadísticas, alertas, WebSockets y autenticación sin cambiar el protocolo actual del collector. Estas funciones no se incluyen hasta que sean necesarias.
