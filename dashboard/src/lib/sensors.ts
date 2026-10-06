import type { SensorKey } from "./water.ts"

export const SENSORS: {
  key: SensorKey
  label: string
  unit: string
  decimals: number
  color: string
}[] = [
  { key: "temperature", label: "Temperatura", unit: "°C", decimals: 1, color: "var(--chart-1)" },
  { key: "ph", label: "pH", unit: "", decimals: 2, color: "var(--chart-2)" },
  { key: "turbidity", label: "Turbidez", unit: "NTU", decimals: 1, color: "var(--chart-3)" },
  { key: "tds", label: "TDS", unit: "ppm", decimals: 0, color: "var(--chart-4)" },
  { key: "level", label: "Nivel de agua", unit: "cm", decimals: 1, color: "var(--chart-5)" },
]
