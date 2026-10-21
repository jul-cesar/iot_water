/// <reference types="node" />

import assert from "node:assert/strict"
import { test } from "node:test"

test("submit keeps only an in-memory Basic authorization value", async () => {
  const { historyAccessReducer, initialHistoryAccessState } =
    await import("./history-access.ts")

  const state = historyAccessReducer(initialHistoryAccessState, {
    type: "SUBMIT",
    username: "admin",
    password: "secret",
  })

  assert.deepEqual(state, {
    authorization: `Basic ${btoa("admin:secret")}`,
    dialogOpen: false,
    error: null,
  })
  assert.equal("username" in state, false)
  assert.equal("password" in state, false)
})

test("clearing access removes protected cache but keeps public telemetry", async () => {
  const { QueryClient } = await import("@tanstack/react-query")
  const { clearProtectedHistoryQueries } = await import("./history-access.ts")
  const queryClient = new QueryClient()
  queryClient.setQueryData(["history", "Nodo_01_Agua"], ["secret history"])
  queryClient.setQueryData(["recent", "Nodo_01_Agua"], ["secret recent"])
  queryClient.setQueryData(["latest", "Nodo_01_Agua"], ["public latest"])

  clearProtectedHistoryQueries(queryClient)

  assert.equal(queryClient.getQueryData(["history", "Nodo_01_Agua"]), undefined)
  assert.equal(queryClient.getQueryData(["recent", "Nodo_01_Agua"]), undefined)
  assert.deepEqual(queryClient.getQueryData(["latest", "Nodo_01_Agua"]), [
    "public latest",
  ])
})

test("unauthorized clears access and reopens the dialog", async () => {
  const { historyAccessReducer } = await import("./history-access.ts")

  const state = historyAccessReducer(
    {
      authorization: "Basic saved",
      dialogOpen: false,
      error: null,
    },
    { type: "UNAUTHORIZED" }
  )

  assert.deepEqual(state, {
    authorization: null,
    dialogOpen: true,
    error: "Usuario o contraseña incorrectos.",
  })
})
