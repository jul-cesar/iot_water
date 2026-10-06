/// <reference types="node" />

import assert from "node:assert/strict"
import { test } from "node:test"

import type { Measurement } from "./api.ts"
import {
  formatLocalDate,
  formatRelativeTime,
  getAlertReasons,
  getConnectionState,
  getReadingAge,
} from "./water.ts"

const reading: Measurement = {
  id: 20,
  node_id: "Nodo_01_Agua",
  temperature: 30.4,
  ph: 3.76,
  turbidity: 8.6,
  tds: 75,
  level: 0,
  created_at: "2026-10-06T03:16:38.443705Z",
  water_status: "CRITICAL",
}

test("alert reasons explain critical pH and turbidity", () => {
  assert.deepEqual(getAlertReasons(reading), [
    "pH por debajo del rango crítico.",
    "Turbidez por encima del nivel crítico.",
  ])
})

test("alert reasons use strict warning and critical thresholds", () => {
  assert.deepEqual(
    getAlertReasons({
      ...reading,
      ph: 5.5,
      turbidity: 8,
      water_status: "WARNING",
    }),
    ["pH por debajo del rango esperado.", "Turbidez elevada."],
  )
})

test("alert reasons defer to the backend for unexplained alerts", () => {
  assert.deepEqual(
    getAlertReasons({
      ...reading,
      ph: 7,
      turbidity: 2,
      water_status: "WARNING",
    }),
    ["Estado determinado por el sistema de monitoreo."],
  )
})

test("future timestamps clamp age to zero and remain online", () => {
  const now = new Date("2026-10-06T03:16:30.000Z")

  assert.equal(getReadingAge(reading.created_at, now), 0)
  assert.equal(
    getConnectionState({ measurement: reading, now }),
    "ONLINE",
  )
})

test("invalid timestamps are safe and report no data", () => {
  const invalid = { ...reading, created_at: "invalid" }

  assert.equal(getReadingAge(invalid.created_at), null)
  assert.equal(getConnectionState({ measurement: invalid }), "NO_DATA")
  assert.equal(formatRelativeTime(invalid.created_at), "Hora no disponible")
})

test("connection reports no data after fifteen seconds", () => {
  const now = new Date("2026-10-06T03:16:54.000Z")

  assert.equal(
    getConnectionState({ measurement: reading, now }),
    "NO_DATA",
  )
})

test("connection reports API errors without discarding the reading", () => {
  assert.equal(
    getConnectionState({ measurement: reading, error: true }),
    "ERROR",
  )
})

test("date formatters return readable labels", () => {
  assert.ok(formatLocalDate(reading.created_at).length > 0)
  assert.ok(
    formatRelativeTime(
      reading.created_at,
      new Date("2026-10-06T03:16:40.000Z"),
    ).length > 0,
  )
})
