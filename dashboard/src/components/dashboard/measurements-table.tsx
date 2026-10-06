import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Measurement, WaterStatus } from "@/lib/api"
import { formatLocalDate } from "@/lib/water"

const STATUS_BADGE: Record<WaterStatus, { label: string; className: string }> = {
  OPTIMAL: { label: "Óptimo", className: "bg-success/15 text-success" },
  WARNING: { label: "Advertencia", className: "bg-warning/15 text-warning" },
  CRITICAL: { label: "Crítico", className: "bg-destructive/15 text-destructive" },
}

export function MeasurementsTable({
  rows,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  rows: Measurement[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  return (
    <div className="flex flex-col gap-3 bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha y hora</TableHead>
            <TableHead>Nodo</TableHead>
            <TableHead className="text-right">Temp. (°C)</TableHead>
            <TableHead className="text-right">pH</TableHead>
            <TableHead className="text-right">Turbidez (NTU)</TableHead>
            <TableHead className="text-right">TDS (ppm)</TableHead>
            <TableHead className="text-right">Nivel (cm)</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const badge = STATUS_BADGE[row.water_status]
            return (
              <TableRow key={row.id}>
                <TableCell>{formatLocalDate(row.created_at)}</TableCell>
                <TableCell>{row.node_id}</TableCell>
                <TableCell className="text-right tabular-nums">{row.temperature.toFixed(1)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.ph.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.turbidity.toFixed(1)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.tds.toFixed(0)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.level.toFixed(1)}</TableCell>
                <TableCell>
                  <span className={cn("px-2 py-0.5 font-semibold", badge?.className)}>
                    {badge?.label ?? row.water_status}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {hasMore && (
        <div className="flex justify-center pb-3">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "Cargando…" : "Cargar más"}
          </Button>
        </div>
      )}
    </div>
  )
}
