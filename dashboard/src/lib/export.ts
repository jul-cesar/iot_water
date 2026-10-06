import type { Measurement, WaterStatus } from "./api.ts"
import type { ConnectionState } from "./water.ts"

const COLUMNS = [
  "created_at",
  "node_id",
  "temperature",
  "ph",
  "turbidity",
  "tds",
  "level",
  "water_status",
] as const satisfies readonly (keyof Measurement)[]

const cell = (value: unknown) => {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(rows: Measurement[]): string {
  return [
    COLUMNS.join(","),
    ...rows.map((row) => COLUMNS.map((key) => cell(row[key])).join(",")),
  ]
    .join("\r\n")
    .concat("\r\n")
}

export function downloadCsv(rows: Measurement[], filename: string) {
  // BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(["\uFEFF", toCsv(rows)], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  })
  link.click()
  URL.revokeObjectURL(url)
}

const STATUS_TITLE: Record<WaterStatus, string> = {
  CRITICAL: "⚠ CRÍTICO",
  WARNING: "ADVERTENCIA",
  OPTIMAL: "Óptimo",
}

export function getDocumentTitle(
  connection: ConnectionState,
  status?: WaterStatus
): string {
  const prefix =
    connection === "ERROR"
      ? "SIN CONEXIÓN"
      : connection === "NO_DATA"
        ? "SIN DATOS"
        : status
          ? STATUS_TITLE[status]
          : "Conectando"
  return `${prefix} · AquaMonitor`
}
