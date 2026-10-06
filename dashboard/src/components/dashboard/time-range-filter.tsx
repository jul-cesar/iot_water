import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  PRESET_LABELS,
  validateTimeRange,
  type TimePreset,
  type TimeRange,
} from "@/lib/time-range"

const PRESETS: Exclude<TimePreset, "custom">[] = ["1h", "6h", "24h", "7d"]

// datetime-local works in local time; convert to/from ISO UTC for the API.
const toInput = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const fromInput = (value: string) => (value ? new Date(value).toISOString() : "")

export function TimeRangeFilter({
  preset,
  customRange,
  onChange,
}: {
  preset: TimePreset
  customRange?: TimeRange
  onChange: (preset: TimePreset, range?: TimeRange) => void
}) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(() => toInput(customRange?.from ?? new Date(Date.now() - 86_400_000).toISOString()))
  const [to, setTo] = useState(() => toInput(customRange?.to ?? new Date().toISOString()))
  const draft = { from: from && fromInput(from), to: to && fromInput(to) }
  const valid = Boolean(from && to) && validateTimeRange(draft)

  return (
    <div role="group" aria-label="Periodo histórico" className="flex flex-wrap gap-2">
      {PRESETS.map((value) => (
        <Button
          key={value}
          size="sm"
          variant={preset === value ? "default" : "outline"}
          aria-pressed={preset === value}
          onClick={() => onChange(value)}
        >
          {PRESET_LABELS[value]}
        </Button>
      ))}
      <Button
        size="sm"
        variant={preset === "custom" ? "default" : "outline"}
        aria-pressed={preset === "custom"}
        onClick={() => setOpen(true)}
      >
        {PRESET_LABELS.custom}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rango personalizado</DialogTitle>
            <DialogDescription>Fechas en su hora local.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1 text-xs">
              Desde
              <input type="datetime-local" className="h-8 border bg-background px-2" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs">
              Hasta
              <input type="datetime-local" className="h-8 border bg-background px-2" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </label>
            {!valid && (
              <p role="alert" className="text-xs text-destructive">
                La fecha inicial debe ser anterior o igual a la final.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!valid}
              onClick={() => {
                onChange("custom", draft)
                setOpen(false)
              }}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
