# Diseño del dashboard IoT de agua

## Objetivo

Construir un dashboard web responsive que permita comprender rápidamente el estado del sistema IoT, observar telemetría real en actualización automática y consultar el histórico de cada variable. El MVP consumirá la API existente y no utilizará datos ficticios.

## Alcance del MVP

Incluye:

- encabezado con nombre del sistema, selector de nodo y conexión;
- estado general del agua y motivos asociados;
- tarjetas para temperatura, pH, turbidez, TDS y nivel;
- cinco gráficas históricas independientes;
- filtros de una hora, seis horas, 24 horas, siete días y rango personalizado;
- tabla paginada de mediciones recientes;
- actualización automática cada dos segundos;
- estados de carga, ausencia de datos, telemetría detenida y error;
- presentación de fechas UTC en la zona horaria local del usuario.

Alertas, estadísticas agregadas, exportación y notificaciones quedan fuera del MVP.

## API

URL predeterminada: `https://iot.julcesar.xyz`.

La URL se configurará mediante `VITE_API_URL` para permitir otros entornos.

Endpoints:

- `GET /api/nodes`: devuelve un arreglo de identificadores de nodo.
- `GET /api/measurements/latest?node_id=...`: devuelve la última medición o `404` cuando el nodo no tiene datos.
- `GET /api/measurements`: devuelve un arreglo de mediciones y acepta `node_id`, `from_date`, `to_date`, `limit` y `offset`.

Cada medición contiene `id`, `node_id`, `temperature`, `ph`, `turbidity`, `tds`, `level`, `created_at` y `water_status`.

## Arquitectura

La aplicación seguirá siendo una SPA de React, TypeScript y Vite. Se añadirá `@tanstack/react-query` para administrar caché, reintentos, actualización en segundo plano y conservación de datos durante cambios de filtro.

Un proveedor de React Query envolverá la aplicación. La capa `src/lib/api.ts` contendrá los tipos y las peticiones con `fetch`. El hook `src/hooks/use-telemetry.ts` compondrá las consultas para nodos, última lectura e histórico. Los componentes del dashboard solo recibirán datos y callbacks de presentación.

No se añadirá un backend intermedio, WebSocket ni estado global adicional. La API ya permite CORS y el polling satisface la frecuencia actual de la telemetría.

## Flujo de datos

1. Al iniciar, se consultan los nodos reales.
2. Si existe al menos uno, se selecciona el primero. No se crean nodos ficticios.
3. La última lectura del nodo seleccionado se consulta cada dos segundos.
4. El histórico se consulta según nodo y periodo. Al cambiar filtros se conserva la información anterior hasta recibir la nueva respuesta.
5. Al cambiar de nodo se actualizan última lectura, estado, tarjetas, gráficas y tabla.
6. La tabla carga 20 filas inicialmente. “Cargar más” incrementa el `offset`; si una página contiene menos de 20 filas, no se ofrece otra carga.

## Estado del agua

`water_status` entregado por el backend es la fuente única del estado general y se muestra como `OPTIMAL`, `WARNING` o `CRITICAL`.

El frontend no recalcula ese estado. Solo produce razones visuales con las reglas conocidas:

- turbidez mayor que 8: nivel crítico;
- pH menor que 5.5 o mayor que 9.5: nivel crítico;
- turbidez mayor que 5: advertencia;
- pH menor que 6.5 o mayor que 8.5: advertencia.

Las razones explican los valores presentes sin reemplazar ni contradecir `water_status`. Si el backend devuelve un estado de alerta sin una razón derivable, la interfaz indicará que el estado fue determinado por el sistema de monitoreo.

## Estado de conexión

- `EN LÍNEA`: la API responde y la lectura tiene como máximo 15 segundos.
- `SIN DATOS`: no existe lectura o su antigüedad supera 15 segundos.
- `ERROR`: la consulta a la API falla.

La antigüedad se recalcula localmente cada segundo sin solicitar datos adicionales. Las diferencias de reloj futuras se limitan visualmente a cero segundos.

## Interfaz

La jerarquía será:

1. encabezado con nombre “AquaMonitor”, nodo y conexión;
2. panel destacado con estado general, última lectura y motivos;
3. cinco tarjetas de mediciones actuales;
4. filtros y cinco gráficas históricas independientes;
5. tabla de mediciones recientes.

Se reutilizarán los tokens existentes en `src/index.css`: `background`, `card`, `primary`, `muted`, `border`, `chart-*` y `destructive`. Solo se incorporarán los mínimos tokens semánticos necesarios para distinguir advertencia y crítico. La interfaz evitará colores decorativos ajenos al tema.

En pantallas grandes, tarjetas y gráficas usarán cuadrículas. En móvil se organizarán en una columna; la tabla conservará todas sus columnas mediante desplazamiento horizontal.

## Fechas y filtros

Las fechas ISO en UTC se convertirán con las APIs nativas `Date` e `Intl.DateTimeFormat`. Los filtros predefinidos calcularán `from_date` desde el reloj local y enviarán valores ISO. El rango personalizado empleará los componentes de calendario existentes y validará que la fecha inicial no sea posterior a la final.

Las gráficas usarán Recharts, una escala por variable, tooltip con fecha local, valor y unidad. Cada consulta solicitará como máximo 2.000 registros para mantener el navegador responsive; la interfaz indicará cuando el periodo contenga más datos que ese límite. La API deberá aportar agregación si en el futuro se requiere representar íntegramente grandes volúmenes de siete días.

## Estados de interfaz

- Carga inicial: “Conectando con el sistema de monitoreo…”.
- API inaccesible: “No se pudieron obtener las mediciones.” con reintento.
- Sin nodos: “No existen dispositivos disponibles.”
- Nodo sin mediciones: “No existen mediciones para este dispositivo.”
- Datos antiguos: conserva la última lectura visible y marca `SIN DATOS`.

Una actualización fallida no borrará inmediatamente los últimos datos válidos.

## Organización prevista

- `src/lib/api.ts`: tipos, URL configurable y peticiones.
- `src/lib/water.ts`: razones, formato temporal y conexión.
- `src/hooks/use-telemetry.ts`: consultas React Query.
- `src/components/dashboard/`: encabezado, estado, tarjetas, filtros, gráficas y tabla.
- `src/App.tsx`: composición y nodo seleccionado.

## Verificación

- Pruebas con `node:test` para razones de alerta, antigüedad y conexión, sin otro framework.
- `npm run typecheck`.
- `npm run lint`.
- `npm run build`.
- Verificación en navegador contra la API real: carga, polling, cambio de filtros, nodo sin datos, error de red y layouts de escritorio y móvil.

## Mejoras futuras

Alertas persistentes, estadísticas, exportación, notificaciones y nuevos tipos de nodo se añadirán cuando exista un requisito concreto. El selector y la clave de caché por `node_id` dejan preparado el MVP para múltiples dispositivos sin construir infraestructura anticipada.
