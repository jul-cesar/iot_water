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

test("measurements serializes filters and sends history authorization", async () => {
  let requestedUrl = ""
  let requestedInit: RequestInit | undefined
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedInit = init
    return Response.json([])
  }

  await getMeasurements(
    {
      nodeId: "Nodo_01_Agua",
      fromDate: "2026-10-05T00:00:00.000Z",
      toDate: "2026-10-06T00:00:00.000Z",
      limit: 20,
      offset: 40,
    },
    { authorization: "Basic credential" }
  )

  const url = new URL(requestedUrl)
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    node_id: "Nodo_01_Agua",
    from_date: "2026-10-05T00:00:00.000Z",
    to_date: "2026-10-06T00:00:00.000Z",
    limit: "20",
    offset: "40",
  })
  assert.equal(
    new Headers(requestedInit?.headers).get("Authorization"),
    "Basic credential"
  )
})


test("CSV export sends range authorization and returns a Blob", async () => {
  const { getMeasurementsCsv } = await import("./api.ts")
  let requestedUrl = ""
  let requestedInit: RequestInit | undefined
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedInit = init
    return new Response("csv-content", { headers: { "Content-Type": "text/csv" } })
  }

  const blob = await getMeasurementsCsv(
    {
      nodeId: "Nodo_01_Agua",
      fromDate: "2026-10-05T00:00:00.000Z",
      toDate: "2026-10-06T00:00:00.000Z",
    },
    { authorization: "Basic credential" }
  )

  assert.equal(await blob.text(), "csv-content")
  assert.deepEqual(Object.fromEntries(new URL(requestedUrl).searchParams), {
    node_id: "Nodo_01_Agua",
    from_date: "2026-10-05T00:00:00.000Z",
    to_date: "2026-10-06T00:00:00.000Z",
  })
  assert.equal(
    new Headers(requestedInit?.headers).get("Authorization"),
    "Basic credential"
  )
})


test("protected API failures expose the HTTP status", async () => {
  const { HttpError } = await import("./api.ts")
  globalThis.fetch = async () => new Response(null, { status: 401 })

  await assert.rejects(
    getMeasurements({}, { authorization: "Basic wrong" }),
    (error: unknown) => error instanceof HttpError && error.status === 401
  )
})

test("queries never retry unauthorized requests", async () => {
  const { HttpError, shouldRetryRequest } = await import("./api.ts")

  assert.equal(shouldRetryRequest(0, new HttpError(401)), false)
  assert.equal(shouldRetryRequest(0, new HttpError(500)), true)
  assert.equal(shouldRetryRequest(3, new HttpError(500)), false)
})


test("next offset continues only after a full page", async () => {
  const { getNextOffset } = await import("./api.ts")
  const page = (n: number) => Array.from({ length: n })
  assert.equal(getNextOffset(page(20), [page(20)]), 20)
  assert.equal(getNextOffset(page(20), [page(20), page(20)]), 40)
  assert.equal(getNextOffset(page(7), [page(20), page(7)]), undefined)
  assert.equal(getNextOffset(page(0), [page(0)]), undefined)
})
