import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon } from "@hugeicons/core-free-icons"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
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

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})
const helper = createColumnHelper<typeof features, Measurement>()

const numeric = (key: "temperature" | "ph" | "turbidity" | "tds" | "level", header: string, decimals: number) =>
  helper.accessor(key, {
    header,
    sortFn: sortFn_basic,
    cell: (info) => info.getValue().toFixed(decimals),
    meta: { numeric: true },
  })

const columns = helper.columns([
  helper.accessor((row) => Date.parse(row.created_at), {
    id: "created_at",
    header: "Fecha y hora",
    sortFn: sortFn_basic,
    cell: (info) => formatLocalDate(info.row.original.created_at),
  }),
  numeric("temperature", "Temp. (°C)", 1),
  numeric("ph", "pH", 2),
  numeric("turbidity", "Turbidez (NTU)", 1),
  numeric("tds", "TDS (ppm)", 0),
  numeric("level", "Nivel (cm)", 1),
  helper.accessor("water_status", {
    header: "Estado",
    enableSorting: false,
    cell: (info) => {
      const badge = STATUS_BADGE[info.getValue()]
      return (
        <Badge variant="outline" className={cn("border-transparent", badge?.className)}>
          {badge?.label ?? info.getValue()}
        </Badge>
      )
    },
  }),
])

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
  const table = useTable({ features, columns, data: rows, getRowId: (row) => String(row.id) })

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const numericCol = Boolean((header.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric)
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id} className={cn(numericCol && "text-right")}>
                      {header.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          className={cn("-mx-2", numericCol && "flex-row-reverse")}
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Ordenar por ${String(header.column.columnDef.header)}`}
                        >
                          <table.FlexRender header={header} />
                          <HugeiconsIcon
                            icon={sorted === "asc" ? ArrowUp01Icon : sorted === "desc" ? ArrowDown01Icon : ArrowUpDownIcon}
                            className={cn(!sorted && "opacity-40")}
                            aria-hidden
                          />
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      (cell.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric &&
                        "text-right font-mono tabular-nums",
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{rows.length} mediciones cargadas</span>
        {hasMore && (
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "Cargando…" : "Cargar más"}
          </Button>
        )}
      </div>
    </div>
  )
}
