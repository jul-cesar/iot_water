import type { SensorKey } from "./water.ts"

export const SENSORS: {
  key: SensorKey
  label: string
  unit: string
  decimals: number
  color: string
  /** Normal band and alert thresholds drawn on the chart, mirroring water.ts rules. */
  normal?: [number, number]
  warningAt?: number[]
  criticalAt?: number[]
}[] = [
  {
    key: "temperature",
    label: "Temperatura",
    unit: "°C",
    decimals: 1,
    color: "var(--chart-1)",
  },
  {
    key: "ph",
    label: "pH",
    unit: "",
    decimals: 2,
    color: "var(--chart-2)",
    normal: [6.5, 8.5],
    criticalAt: [5.5, 9.5],
  },
  {
    key: "turbidity",
    label: "Turbidez",
    unit: "NTU",
    decimals: 1,
    color: "var(--chart-3)",
    normal: [0, 5],
    warningAt: [5],
    criticalAt: [8],
  },
  {
    key: "tds",
    label: "TDS",
    unit: "ppm",
    decimals: 0,
    color: "var(--chart-4)",
  },
  {
    key: "level",
    label: "Nivel de agua",
    unit: "cm",
    decimals: 1,
    color: "var(--chart-5)",
  },
]
