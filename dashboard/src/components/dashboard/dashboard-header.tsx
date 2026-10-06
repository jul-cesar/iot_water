import { HugeiconsIcon } from "@hugeicons/react"
import { DropletIcon, Router01Icon } from "@hugeicons/core-free-icons"
import { cn } from "cn"

import type { ConnectionState } from "@/lib/water"
import { formatRelativeTime } from "@/lib/water"

const CONNECTION = {
  ONLINE: { label: "En línea", tone: "bg-success/10 text-success ring-success/30", dot: "bg-success" },
  NO_DATA: { label: "Sin datos", tone: "bg-warning/10 text-warning ring-warning/30", dot: "bg-warning" },
  ERROR: { label: "Sin conexión", tone: "bg-destructive/10 text-destructive ring-destructive/30", dot: "bg-destructive" },
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
    <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center bg-primary text-primary-foreground">
            <HugeiconsIcon icon={DropletIcon} strokeWidth={2} className="size-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <h1 className="font-heading text-base font-semibold tracking-tight">AquaMonitor</h1>
            <p className="text-xs text-muted-foreground">Calidad y nivel de agua</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* The selector only earns its place once the API reports more than one node. */}
          {nodes.length > 1 ? (
            <select
              aria-label="Dispositivo"
              className="h-8 border bg-background px-2 text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              value={selectedNode}
              onChange={(event) => onSelectNode(event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node} value={node}>
                  {node}
                </option>
              ))}
            </select>
          ) : (
            selectedNode && (
              <span className="flex h-8 items-center gap-1.5 bg-muted px-2.5 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Router01Icon} strokeWidth={2} className="size-3.5" aria-hidden />
                <span className="font-mono text-foreground">{selectedNode}</span>
              </span>
            )
          )}

          <div
            role="status"
            aria-live="polite"
            className={cn("flex h-8 items-center gap-2 px-2.5 text-xs ring-1", status.tone)}
          >
            <span className="relative flex size-2">
              {connection === "ONLINE" && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
              )}
              <span className={cn("relative inline-flex size-2 rounded-full", status.dot)} />
            </span>
            <span className="font-semibold uppercase tracking-wide">{status.label}</span>
            {lastTimestamp && (
              <span className="hidden text-muted-foreground sm:inline">
                · {formatRelativeTime(lastTimestamp, now).toLowerCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
