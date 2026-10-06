/// <reference types="node" />

import assert from "node:assert/strict"
import { test } from "node:test"

import { getPresetRange, validateTimeRange } from "./time-range.ts"

const now = new Date("2026-10-06T12:00:00.000Z")
const HOUR = 3_600_000

test("preset ranges end now and span the exact duration", () => {
  for (const [preset, hours] of [["1h", 1], ["6h", 6], ["24h", 24], ["7d", 168]] as const) {
    const range = getPresetRange(preset, now)
    assert.equal(range.to, now.toISOString())
    assert.equal(Date.parse(range.to) - Date.parse(range.from), hours * HOUR)
  }
})

test("range validation rejects missing or reversed dates", () => {
  assert.equal(validateTimeRange({ from: "", to: now.toISOString() }), false)
  assert.equal(validateTimeRange({ from: "invalid", to: now.toISOString() }), false)
  assert.equal(
    validateTimeRange({ from: now.toISOString(), to: "2026-10-05T00:00:00.000Z" }),
    false,
  )
})

test("range validation accepts equal or ordered dates", () => {
  assert.equal(validateTimeRange({ from: now.toISOString(), to: now.toISOString() }), true)
  assert.equal(
    validateTimeRange({ from: "2026-10-05T00:00:00.000Z", to: now.toISOString() }),
    true,
  )
})
