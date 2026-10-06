import type { Measurement } from "./api.ts"

export type ConnectionState = "ONLINE" | "NO_DATA" | "ERROR"
export type Severity = "normal" | "warning" | "critical"
export type SensorKey = "temperature" | "ph" | "turbidity" | "tds" | "level"

export function getSensorSeverity(key: SensorKey, value: number): Severity | null {
  if (key === "ph") {
    if (value < 5.5 || value > 9.5) return "critical"
    if (value < 6.5 || value > 8.5) return "warning"
    return "normal"
  }
  if (key === "turbidity") {
    if (value > 8) return "critical"
    if (value > 5) return "warning"
    return "normal"
  }
  return null
}

export function getAlertReasons(measurement: Measurement): string[] {
  if (measurement.water_status === "OPTIMAL") return []

  const reasons: string[] = []
  if (measurement.ph < 5.5) reasons.push("pH por debajo del rango crítico.")
  else if (measurement.ph > 9.5)
    reasons.push("pH por encima del rango crítico.")
  else if (measurement.ph < 6.5)
    reasons.push("pH por debajo del rango esperado.")
  else if (measurement.ph > 8.5)
    reasons.push("pH por encima del rango esperado.")

  if (measurement.turbidity > 8)
    reasons.push("Turbidez por encima del nivel crítico.")
  else if (measurement.turbidity > 5) reasons.push("Turbidez elevada.")

  return reasons.length
    ? reasons
    : ["Estado determinado por el sistema de monitoreo."]
}

export function getReadingAge(
  timestamp: string,
  now: Date = new Date(),
): number | null {
  const measuredAt = new Date(timestamp).getTime()
  if (!Number.isFinite(measuredAt)) return null
  return Math.max(0, now.getTime() - measuredAt)
}

export function getConnectionState({
  measurement,
  error = false,
  now = new Date(),
  staleAfterMs = 15_000,
}: {
  measurement: Measurement | null
  error?: boolean
  now?: Date
  staleAfterMs?: number
}): ConnectionState {
  if (error) return "ERROR"
  if (!measurement) return "NO_DATA"
  const age = getReadingAge(measurement.created_at, now)
  return age !== null && age <= staleAfterMs ? "ONLINE" : "NO_DATA"
}

export function formatLocalDate(timestamp: string): string {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date)
}

export function formatRelativeTime(
  timestamp: string,
  now: Date = new Date(),
): string {
  const age = getReadingAge(timestamp, now)
  if (age === null) return "Hora no disponible"

  const seconds = Math.floor(age / 1_000)
  if (seconds < 5) return "Ahora mismo"
  if (seconds < 60) return `Hace ${seconds} segundos`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  return `Hace ${Math.floor(hours / 24)} d`
}
