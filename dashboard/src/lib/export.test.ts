/// <reference types="node" />

import assert from "node:assert/strict"
import { test } from "node:test"

import type { Measurement } from "./api.ts"
import { getDocumentTitle, toCsv } from "./export.ts"

const row: Measurement = {
  id: 1,
  node_id: "Nodo_01_Agua",
  temperature: 30.4,
  ph: 3.76,
  turbidity: 8.6,
  tds: 75,
  level: 0,
  created_at: "2026-10-06T03:16:38.443705Z",
  water_status: "CRITICAL",
}

test("csv has a header and one line per measurement in UTC ISO", () => {
  const lines = toCsv([row]).trim().split("\r\n")
  assert.equal(lines[0], "created_at,node_id,temperature,ph,turbidity,tds,level,water_status")
  assert.equal(lines[1], "2026-10-06T03:16:38.443705Z,Nodo_01_Agua,30.4,3.76,8.6,75,0,CRITICAL")
  assert.equal(lines.length, 2)
})

test("csv quotes values containing commas or quotes", () => {
  const line = toCsv([{ ...row, node_id: 'Nodo "A", 2' }]).trim().split("\r\n")[1]
  assert.match(line, /,"Nodo ""A"", 2",/)
})

test("document title reflects connection before water status", () => {
  assert.equal(getDocumentTitle("ERROR", "OPTIMAL"), "SIN CONEXIÓN · AquaMonitor")
  assert.equal(getDocumentTitle("NO_DATA", "CRITICAL"), "SIN DATOS · AquaMonitor")
  assert.equal(getDocumentTitle("ONLINE", "CRITICAL"), "⚠ CRÍTICO · AquaMonitor")
  assert.equal(getDocumentTitle("ONLINE", "WARNING"), "ADVERTENCIA · AquaMonitor")
  assert.equal(getDocumentTitle("ONLINE", "OPTIMAL"), "Óptimo · AquaMonitor")
  assert.equal(getDocumentTitle("NO_DATA"), "SIN DATOS · AquaMonitor")
})
