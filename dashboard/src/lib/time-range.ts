export type TimePreset = "1h" | "6h" | "24h" | "7d" | "custom"

export interface TimeRange {
  from: string
  to: string
}

const PRESET_HOURS: Record<Exclude<TimePreset, "custom">, number> = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
  "7d": 168,
}

export const PRESET_LABELS: Record<TimePreset, string> = {
  "1h": "Última hora",
  "6h": "Últimas 6 h",
  "24h": "Últimas 24 h",
  "7d": "Últimos 7 días",
  custom: "Personalizado",
}

export function getPresetRange(
  preset: Exclude<TimePreset, "custom">,
  now: Date = new Date(),
): TimeRange {
  const to = now.getTime()
  return {
    from: new Date(to - PRESET_HOURS[preset] * 3_600_000).toISOString(),
    to: new Date(to).toISOString(),
  }
}

export function validateTimeRange({ from, to }: TimeRange): boolean {
  const start = Date.parse(from)
  const end = Date.parse(to)
  return Number.isFinite(start) && Number.isFinite(end) && start <= end
}
