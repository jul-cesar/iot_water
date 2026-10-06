import { useEffect, useState } from "react"

import { HistoryCharts } from "@/components/dashboard/history-charts"
import { TimeRangeFilter } from "@/components/dashboard/time-range-filter"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SensorCard } from "@/components/dashboard/sensor-card"
import { StateMessage } from "@/components/dashboard/state-message"
import { WaterStatusPanel } from "@/components/dashboard/water-status-panel"
import {
  HISTORY_LIMIT,
  useHistoricalMeasurements,
  useLatestMeasurement,
  useNodes,
} from "@/hooks/use-telemetry"
import { SENSORS } from "@/lib/sensors"
import type { TimePreset, TimeRange } from "@/lib/time-range"
import { getAlertReasons, getConnectionState, getSensorSeverity } from "@/lib/water"

function useNow(intervalMs = 1_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function HistorySection({ nodeId }: { nodeId: string }) {
  const [preset, setPreset] = useState<TimePreset>("1h")
  const [customRange, setCustomRange] = useState<TimeRange>()
  const history = useHistoricalMeasurements(nodeId, preset, customRange)
  const rows = history.data?.rows ?? []

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="history-title" className="font-heading text-lg font-semibold">Histórico</h2>
          <p className="text-xs text-muted-foreground">
            {`${rows.length} mediciones en el periodo`}
            {history.data?.truncated && ` · se muestran las ${HISTORY_LIMIT} más recientes`}
            {history.isFetching && " · actualizando…"}
          </p>
        </div>
        <TimeRangeFilter
          preset={preset}
          customRange={customRange}
          onChange={(nextPreset, range) => {
            setPreset(nextPreset)
            if (range) setCustomRange(range)
          }}
        />
      </div>
      {history.isPending ? (
        <StateMessage title="Cargando histórico…" />
      ) : history.isError && !rows.length ? (
        <StateMessage tone="error" title="No se pudo obtener el histórico." onRetry={() => history.refetch()} />
      ) : !rows.length ? (
        <StateMessage title="No existen mediciones en el periodo seleccionado." />
      ) : (
        <HistoryCharts rows={rows} />
      )}
    </section>
  )
}

export function App() {
  const now = useNow()
  const nodesQuery = useNodes()
  const nodes = nodesQuery.data ?? []
  const [chosenNode, setChosenNode] = useState<string>()
  // Only real API nodes are selectable; fall back to the first one.
  const selectedNode = chosenNode && nodes.includes(chosenNode) ? chosenNode : nodes[0]

  const latestQuery = useLatestMeasurement(selectedNode)
  const measurement = latestQuery.data ?? null
  const connection = getConnectionState({
    measurement,
    error: nodesQuery.isError || latestQuery.isError,
    now,
  })

  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader
        nodes={nodes}
        selectedNode={selectedNode}
        onSelectNode={setChosenNode}
        connection={connection}
        lastTimestamp={measurement?.created_at}
        now={now}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        {nodesQuery.isPending ? (
          <StateMessage title="Conectando con el sistema de monitoreo…" />
        ) : nodesQuery.isError && !nodes.length ? (
          <StateMessage
            tone="error"
            title="No se pudieron obtener las mediciones."
            description="Verifique la conexión con el servidor de monitoreo."
            onRetry={() => nodesQuery.refetch()}
          />
        ) : !nodes.length ? (
          <StateMessage title="No existen dispositivos disponibles." />
        ) : latestQuery.isPending ? (
          <StateMessage title="Conectando con el sistema de monitoreo…" />
        ) : latestQuery.isError && !measurement ? (
          <StateMessage
            tone="error"
            title="No se pudieron obtener las mediciones."
            onRetry={() => latestQuery.refetch()}
          />
        ) : !measurement ? (
          <StateMessage title="No existen mediciones para este dispositivo." />
        ) : (
          <>
            <WaterStatusPanel measurement={measurement} reasons={getAlertReasons(measurement)} now={now} />
            <section aria-label="Mediciones actuales" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {SENSORS.map((sensor) => (
                <SensorCard
                  key={sensor.key}
                  label={sensor.label}
                  value={measurement[sensor.key]}
                  unit={sensor.unit}
                  decimals={sensor.decimals}
                  timestamp={measurement.created_at}
                  severity={getSensorSeverity(sensor.key, measurement[sensor.key])}
                  now={now}
                />
              ))}
            </section>
          </>
        )}
        {selectedNode && measurement && <HistorySection nodeId={selectedNode} />}
      </main>
    </div>
  )
}

export default App
