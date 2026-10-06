import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { getLatestMeasurement, getNodes } from "@/lib/api"

export const telemetryKeys = {
  nodes: ["nodes"] as const,
  latest: (nodeId: string) => ["latest", nodeId] as const,
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
