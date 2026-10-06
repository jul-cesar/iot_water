import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"

import {
  PAGE_SIZE,
  getLatestMeasurement,
  getMeasurements,
  getNextOffset,
  getNodes,
} from "@/lib/api"
import { getPresetRange, type TimePreset, type TimeRange } from "@/lib/time-range"

export const HISTORY_LIMIT = 2_000

export const telemetryKeys = {
  nodes: ["nodes"] as const,
  latest: (nodeId: string) => ["latest", nodeId] as const,
  recent: (nodeId: string) => ["recent", nodeId] as const,
  history: (nodeId: string, preset: TimePreset, range?: TimeRange) =>
    ["history", nodeId, preset, range?.from, range?.to] as const,
}

export function useNodes() {
  return useQuery({
    queryKey: telemetryKeys.nodes,
    queryFn: ({ signal }) => getNodes(signal),
    refetchInterval: 30_000,
  })
}

export function useLatestMeasurement(nodeId: string | undefined) {
  return useQuery({
    queryKey: telemetryKeys.latest(nodeId ?? ""),
    queryFn: ({ signal }) => getLatestMeasurement(nodeId!, signal),
    enabled: Boolean(nodeId),
    refetchInterval: 2_000,
    placeholderData: keepPreviousData,
  })
}

export function useHistoricalMeasurements(
  nodeId: string | undefined,
  preset: TimePreset,
  customRange?: TimeRange,
) {
  return useQuery({
    queryKey: telemetryKeys.history(nodeId ?? "", preset, preset === "custom" ? customRange : undefined),
    queryFn: async ({ signal }) => {
      // Presets slide with the clock, so the window is computed at fetch time.
      const range = preset === "custom" ? customRange! : getPresetRange(preset)
      const rows = await getMeasurements(
        { nodeId, fromDate: range.from, toDate: range.to, limit: HISTORY_LIMIT },
        signal,
      )
      return { rows: [...rows].reverse(), truncated: rows.length >= HISTORY_LIMIT }
    },
    enabled: Boolean(nodeId) && (preset !== "custom" || Boolean(customRange)),
    refetchInterval: preset === "custom" ? false : 10_000,
    placeholderData: keepPreviousData,
  })
}

export function useRecentMeasurements(nodeId: string | undefined) {
  return useInfiniteQuery({
    queryKey: telemetryKeys.recent(nodeId ?? ""),
    queryFn: ({ pageParam, signal }) =>
      getMeasurements({ nodeId, limit: PAGE_SIZE, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: getNextOffset,
    refetchInterval: 10_000,
    enabled: Boolean(nodeId),
  })
}
