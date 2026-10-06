import { cn } from "cn"

import type { Measurement, WaterStatus } from "@/lib/api"
import { formatLocalDate, formatRelativeTime } from "@/lib/water"

const STATUS: Record<WaterStatus, { title: string; description: string; tone: string }> = {
  OPTIMAL: {
    title: "ESTADO ÓPTIMO",
    description: "Los parámetros del agua están dentro de los rangos esperados.",
    tone: "border-success bg-success/10 text-success",
  },
  WARNING: {
    title: "ADVERTENCIA",
    description: "Algunos parámetros requieren atención.",
    tone: "border-warning bg-warning/10 text-warning",
  },
  CRITICAL: {
    title: "ESTADO CRÍTICO",
    description: "El agua presenta condiciones críticas.",
    tone: "border-destructive bg-destructive/10 text-destructive",
  },
}

export function WaterStatusPanel({
  measurement,
  reasons,
  now,
}: {
  measurement: Measurement
  reasons: string[]
  now: Date
}) {
  const status = STATUS[measurement.water_status] ?? STATUS.WARNING

  return (
    <section
      aria-labelledby="water-status-title"
      className={cn("grid gap-4 border-l-4 bg-card p-5 ring-1 ring-foreground/10 md:grid-cols-[1fr_auto]", status.tone)}
    >
      <div className="flex flex-col gap-2">
        <h2 id="water-status-title" className="text-xs font-medium text-muted-foreground">
          Estado general del agua
        </h2>
        <p className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {status.title}
        </p>
        <p className="text-sm text-foreground">{status.description}</p>
        {reasons.length > 0 && (
          <div className="text-sm text-foreground">
            <p className="font-medium">Motivos:</p>
            <ul className="list-disc pl-5">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="text-xs text-foreground md:text-right">
        <p className="text-muted-foreground">Última lectura</p>
        <p className="font-mono text-sm tabular-nums">{formatLocalDate(measurement.created_at)}</p>
        <p className="text-muted-foreground">{formatRelativeTime(measurement.created_at, now)}</p>
      </div>
    </section>
  )
}
