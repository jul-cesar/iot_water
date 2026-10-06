import { cn } from "cn"

import type { ConnectionState } from "@/lib/water"
import { formatLocalDate, formatRelativeTime } from "@/lib/water"

const CONNECTION = {
  ONLINE: { label: "EN LÍNEA", dot: "bg-success", text: "text-success" },
  NO_DATA: { label: "SIN DATOS", dot: "bg-warning", text: "text-warning" },
  ERROR: { label: "SIN CONEXIÓN", dot: "bg-destructive", text: "text-destructive" },
} as const

export function DashboardHeader({
  nodes,
  selectedNode,
  onSelectNode,
  connection,
  lastTimestamp,
  now,
}: {
  nodes: string[]
  selectedNode?: string
  onSelectNode: (nodeId: string) => void
  connection: ConnectionState
  lastTimestamp?: string
  now: Date
}) {
  const status = CONNECTION[connection]

  return (
    <header className="flex flex-col gap-4 border-b bg-card px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          AquaMonitor
        </h1>
        <p className="text-xs text-muted-foreground">
          Monitoreo IoT de calidad y nivel de agua
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Dispositivo:</span>
          <select
            className="h-8 min-w-40 border bg-background px-2 text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            value={selectedNode ?? ""}
            disabled={!nodes.length}
            onChange={(event) => onSelectNode(event.target.value)}
          >
            {!nodes.length && <option value="">Sin dispositivos</option>}
            {nodes.map((node) => (
              <option key={node} value={node}>
                {node}
              </option>
            ))}
          </select>
        </label>

        <div role="status" aria-live="polite" className="flex flex-col">
          <span className={cn("flex items-center gap-2 text-sm font-semibold", status.text)}>
            <span className="relative flex size-2.5">
              {connection === "ONLINE" && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
              )}
              <span className={cn("relative inline-flex size-2.5 rounded-full", status.dot)} />
            </span>
            {status.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {lastTimestamp
              ? `Última medición ${formatRelativeTime(lastTimestamp, now).toLowerCase()} · ${formatLocalDate(lastTimestamp)}`
              : "Sin mediciones recibidas"}
          </span>
        </div>
      </div>
    </header>
  )
}
