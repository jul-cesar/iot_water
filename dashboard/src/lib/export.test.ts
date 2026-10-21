/// <reference types="node" />

import assert from "node:assert/strict"
import { test } from "node:test"

import { getDocumentTitle } from "./export.ts"

test("download blob clicks a temporary link and revokes its URL", async () => {
  const { downloadBlob } = await import("./export.ts")
  const originalDocument = globalThis.document
  const originalCreateObjectUrl = URL.createObjectURL
  const originalRevokeObjectUrl = URL.revokeObjectURL
  let clicked = false
  let revoked = ""
  const link = {
    click: () => {
      clicked = true
    },
  }

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => link },
  })
  URL.createObjectURL = () => "blob:test"
  URL.revokeObjectURL = (url) => {
    revoked = url
  }

  try {
    downloadBlob(new Blob(["csv"]), "history.csv")
    assert.equal(clicked, true)
    assert.equal(Reflect.get(link, "href"), "blob:test")
    assert.equal(Reflect.get(link, "download"), "history.csv")
    assert.equal(revoked, "blob:test")
  } finally {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    })
    URL.createObjectURL = originalCreateObjectUrl
    URL.revokeObjectURL = originalRevokeObjectUrl
  }
})

test("document title reflects connection before water status", () => {
  assert.equal(
    getDocumentTitle("ERROR", "OPTIMAL"),
    "SIN CONEXIÓN · AquaMonitor"
  )
  assert.equal(
    getDocumentTitle("NO_DATA", "CRITICAL"),
    "SIN DATOS · AquaMonitor"
  )
  assert.equal(
    getDocumentTitle("ONLINE", "CRITICAL"),
    "⚠ CRÍTICO · AquaMonitor"
  )
  assert.equal(
    getDocumentTitle("ONLINE", "WARNING"),
    "ADVERTENCIA · AquaMonitor"
  )
  assert.equal(getDocumentTitle("ONLINE", "OPTIMAL"), "Óptimo · AquaMonitor")
  assert.equal(getDocumentTitle("NO_DATA"), "SIN DATOS · AquaMonitor")
})
