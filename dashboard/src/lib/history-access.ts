import type { QueryClient } from "@tanstack/react-query"

export interface HistoryAccessState {
  authorization: string | null
  dialogOpen: boolean
  error: string | null
}

export type HistoryAccessEvent =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SUBMIT"; username: string; password: string }
  | { type: "UNAUTHORIZED" }

export const initialHistoryAccessState: HistoryAccessState = {
  authorization: null,
  dialogOpen: false,
  error: null,
}

export function clearProtectedHistoryQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ["history"] })
  queryClient.removeQueries({ queryKey: ["recent"] })
}

export function historyAccessReducer(
  state: HistoryAccessState,
  event: HistoryAccessEvent
): HistoryAccessState {
  switch (event.type) {
    case "OPEN":
      return { ...state, dialogOpen: true, error: null }
    case "CLOSE":
      return { ...state, dialogOpen: false }
    case "SUBMIT":
      return {
        authorization: `Basic ${btoa(`${event.username}:${event.password}`)}`,
        dialogOpen: false,
        error: null,
      }
    case "UNAUTHORIZED":
      return {
        authorization: null,
        dialogOpen: true,
        error: "Usuario o contraseña incorrectos.",
      }
    default:
      return state
  }
}
