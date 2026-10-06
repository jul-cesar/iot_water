import { cn } from "cn"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Severity } from "@/lib/water"
import { formatRelativeTime } from "@/lib/water"

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-success/15 text-success" },
  warning: { label: "Advertencia", className: "bg-warning/15 text-warning" },
  critical: { label: "Crítico", className: "bg-destructive/15 text-destructive" },
}

export function SensorCard({
  label,
  value,
  unit,
  decimals = 1,
  timestamp,
  severity,
  now,
}: {
  label: string
  value: number
  unit: string
  decimals?: number
  timestamp: string
  severity: Severity | null
  now: Date
}) {
  const badge = severity ? SEVERITY[severity] : null

  return (
    <Card className={cn(severity === "critical" && "ring-destructive/50", severity === "warning" && "ring-warning/50")}>
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle className="text-muted-foreground">{label}</CardTitle>
        {badge && (
          <span className={cn("px-2 py-0.5 text-[0.7rem] font-semibold", badge.className)}>
            {badge.label}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="font-heading text-3xl font-semibold tabular-nums">
          {Number.isFinite(value) ? value.toFixed(decimals) : "—"}
          {unit && <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>}
        </p>
        <p className="text-muted-foreground">Actualizado {formatRelativeTime(timestamp, now).toLowerCase()}</p>
      </CardContent>
    </Card>
  )
}
