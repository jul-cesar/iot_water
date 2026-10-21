import type { WaterStatus } from "./api.ts"
import type { ConnectionState } from "./water.ts"

export function downloadBlob(blob: Blob, filename: string) {
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
