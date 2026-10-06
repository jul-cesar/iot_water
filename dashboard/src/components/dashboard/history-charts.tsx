import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import type { Measurement } from "@/lib/api"
import { SENSORS } from "@/lib/sensors"
import { formatLocalDate } from "@/lib/water"

const timeTick = (t: number, spansDays: boolean) =>
  new Intl.DateTimeFormat(
    undefined,
    spansDays
      ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
      : { hour: "2-digit", minute: "2-digit", second: "2-digit" }
  ).format(t)

export function HistoryCharts({ rows }: { rows: Measurement[] }) {
  const data = rows.map((row) => ({ ...row, t: Date.parse(row.created_at) }))
  const spansDays =
    data.length > 1 && data[data.length - 1].t - data[0].t > 86_400_000

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {SENSORS.map((sensor) => (
        <Card key={sensor.key} size="sm">
          <CardHeader>
            <CardTitle>
              {sensor.label}
              {sensor.unit && (
                <span className="text-muted-foreground"> ({sensor.unit})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                [sensor.key]: { label: sensor.label, color: sensor.color },
              }}
              className="aspect-auto h-52 w-full"
              aria-label={`Gráfica histórica de ${sensor.label}`}
              role="img"
            >
              <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(t: number) => timeTick(t, spansDays)}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  width={44}
                  domain={["auto", "auto"]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v.toFixed(sensor.decimals > 1 ? 1 : 0)
                  }
                />
                {sensor.normal && (
                  <ReferenceArea
                    y1={sensor.normal[0]}
                    y2={sensor.normal[1]}
                    ifOverflow="extendDomain"
                    fill="var(--success)"
                    fillOpacity={0.08}
                    stroke="none"
                  />
                )}
                {sensor.warningAt?.map((y) => (
                  <ReferenceLine
                    key={`w${y}`}
                    y={y}
                    ifOverflow="extendDomain"
                    stroke="var(--warning)"
                    strokeDasharray="4 4"
                  />
                ))}
                {sensor.criticalAt?.map((y) => (
                  <ReferenceLine
                    key={`c${y}`}
                    y={y}
                    ifOverflow="extendDomain"
                    stroke="var(--destructive)"
                    strokeDasharray="4 4"
                  />
                ))}
                <ChartTooltip
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as
                      (Measurement & { t: number }) | undefined
                    if (!active || !row) return null
                    return (
                      <div className="grid gap-1 border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                        <span className="text-muted-foreground">
                          {formatLocalDate(row.created_at)}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {row[sensor.key].toFixed(sensor.decimals)}{" "}
                          {sensor.unit}
                        </span>
                      </div>
                    )
                  }}
                />
                <Line
                  dataKey={sensor.key}
                  type="monotone"
                  stroke={`var(--color-${sensor.key})`}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
            {sensor.normal && (
              <p className="mt-2 flex flex-wrap gap-x-3 text-[0.7rem] text-muted-foreground">
                <span>
                  <span
                    className="mr-1 inline-block size-2 bg-success/40"
                    aria-hidden
                  />
                  Rango normal {sensor.normal[0]}–{sensor.normal[1]}
                </span>
                {sensor.warningAt && (
                  <span>
                    <span
                      className="mr-1 inline-block h-0.5 w-3 bg-warning align-middle"
                      aria-hidden
                    />
                    Advertencia
                  </span>
                )}
                <span>
                  <span
                    className="mr-1 inline-block h-0.5 w-3 bg-destructive align-middle"
                    aria-hidden
                  />
                  Crítico
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
