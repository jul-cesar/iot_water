import { useEffect, useState } from "react"

import { MeasurementsTable } from "@/components/dashboard/measurements-table"
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
  useRecentMeasurements,
} from "@/hooks/use-telemetry"
import { Button } from "@/components/ui/button"
import { downloadCsv, getDocumentTitle } from "@/lib/export"
import { SENSORS } from "@/lib/sensors"
import type { TimePreset, TimeRange } from "@/lib/time-range"
import {
  getAlertReasons,
  getConnectionState,
  getSensorSeverity,
} from "@/lib/water"

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
          <h2 id="history-title" className="font-heading text-lg font-semibold">
            Histórico
          </h2>
          <p className="text-xs text-muted-foreground">
            {`${rows.length} mediciones en el periodo`}
            {history.data?.truncated &&
              ` · se muestran las ${HISTORY_LIMIT} más recientes`}
            {history.isFetching && " · actualizando…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeRangeFilter
            preset={preset}
            customRange={customRange}
            onChange={(nextPreset, range) => {
              setPreset(nextPreset)
              if (range) setCustomRange(range)
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                rows,
                `${nodeId}_${preset}_${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.csv`
              )
            }
          >
            Exportar CSV
          </Button>
        </div>
      </div>
      {history.isPending ? (
        <StateMessage title="Cargando histórico…" />
      ) : history.isError && !rows.length ? (
        <StateMessage
          tone="error"
          title="No se pudo obtener el histórico."
          onRetry={() => history.refetch()}
        />
      ) : !rows.length ? (
        <StateMessage title="No existen mediciones en el periodo seleccionado." />
      ) : (
        <HistoryCharts rows={rows} />
      )}
    </section>
  )
}

function RecentSection({ nodeId }: { nodeId: string }) {
  const recent = useRecentMeasurements(nodeId)
  const rows = recent.data?.pages.flat() ?? []
  // Pages shift as new readings arrive; drop duplicates by id.
  const seen = new Set<number>()
  const unique = rows.filter(
    (row) => !seen.has(row.id) && Boolean(seen.add(row.id))
  )

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-4">
      <h2 id="recent-title" className="font-heading text-lg font-semibold">
        Mediciones recientes
      </h2>
      {recent.isPending ? (
        <StateMessage title="Cargando mediciones…" />
      ) : recent.isError && !unique.length ? (
        <StateMessage
          tone="error"
          title="No se pudieron obtener las mediciones."
          onRetry={() => recent.refetch()}
        />
      ) : !unique.length ? (
        <StateMessage title="No existen mediciones para este dispositivo." />
      ) : (
        <MeasurementsTable
          rows={unique}
          hasMore={recent.hasNextPage}
          loadingMore={recent.isFetchingNextPage}
          onLoadMore={() => recent.fetchNextPage()}
        />
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
  const selectedNode =
    chosenNode && nodes.includes(chosenNode) ? chosenNode : nodes[0]

  const latestQuery = useLatestMeasurement(selectedNode)
  const measurement = latestQuery.data ?? null
  const connection = getConnectionState({
    measurement,
    error: nodesQuery.isError || latestQuery.isError,
    now,
  })

  const title = nodesQuery.isPending
    ? "AquaMonitor · Monitoreo de agua"
    : getDocumentTitle(connection, measurement?.water_status)
  useEffect(() => {
    document.title = title
  }, [title])

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
            <WaterStatusPanel
              measurement={measurement}
              reasons={getAlertReasons(measurement)}
              now={now}
            />
            <section
              aria-label="Mediciones actuales"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
              {SENSORS.map((sensor) => (
                <SensorCard
                  key={sensor.key}
                  label={sensor.label}
                  value={measurement[sensor.key]}
                  unit={sensor.unit}
                  decimals={sensor.decimals}
                  timestamp={measurement.created_at}
                  severity={getSensorSeverity(
                    sensor.key,
                    measurement[sensor.key]
                  )}
                  now={now}
                />
              ))}
            </section>
          </>
        )}
        {selectedNode && measurement && (
          <>
            <HistorySection nodeId={selectedNode} />
            <RecentSection nodeId={selectedNode} />
          </>
        )}
      </main>
    </div>
  )
}

export default App
