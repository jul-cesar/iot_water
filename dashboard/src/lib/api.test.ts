/// <reference types="node" />

import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import {
  getLatestMeasurement,
  getMeasurements,
  getNodes,
} from "./api.ts"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("nodes preserves an empty API result", async () => {
  globalThis.fetch = async () => Response.json([])

  assert.deepEqual(await getNodes(), [])
})

test("latest returns null when the device has no measurements", async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 })

  assert.equal(await getLatestMeasurement("SinDatos"), null)
})

test("latest throws an HTTP error for server failures", async () => {
  globalThis.fetch = async () => new Response(null, { status: 500 })

  await assert.rejects(
    getLatestMeasurement("Nodo_01_Agua"),
    /HTTP 500/
  )
})

test("measurements serializes every supported filter", async () => {
  let requestedUrl = ""
  globalThis.fetch = async (input) => {
    requestedUrl = String(input)
    return Response.json([])
  }

  await getMeasurements({
    nodeId: "Nodo_01_Agua",
    fromDate: "2026-10-05T00:00:00.000Z",
    toDate: "2026-10-06T00:00:00.000Z",
    limit: 20,
    offset: 40,
  })

  const url = new URL(requestedUrl)
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    node_id: "Nodo_01_Agua",
    from_date: "2026-10-05T00:00:00.000Z",
    to_date: "2026-10-06T00:00:00.000Z",
    limit: "20",
    offset: "40",
  })
})
