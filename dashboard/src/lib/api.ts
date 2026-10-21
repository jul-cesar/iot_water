export type WaterStatus = "OPTIMAL" | "WARNING" | "CRITICAL"

export interface Measurement {
  id: number
  node_id: string
  temperature: number
  ph: number
  turbidity: number
  tds: number
  level: number
  created_at: string
  water_status: WaterStatus
}

export interface MeasurementsParams {
  nodeId?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}

const API_BASE_URL =
  import.meta.env?.VITE_API_URL ?? "https://iot.julcesar.xyz"

export interface RequestOptions {
  authorization?: string
  signal?: AbortSignal
}

export class HttpError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`HTTP ${status}`)
    this.name = "HttpError"
    this.status = status
  }
}

export function isUnauthorized(error: unknown): error is HttpError {
  return error instanceof HttpError && error.status === 401
}

export function shouldRetryRequest(
  failureCount: number,
  error: unknown
): boolean {
  return !isUnauthorized(error) && failureCount < 3
}

const requestInit = ({ authorization, signal }: RequestOptions): RequestInit => ({
  signal,
  headers: authorization ? { Authorization: authorization } : undefined,
})

async function requestJson<T>(
  url: URL,
  options: RequestOptions = {}
): Promise<T> {
  const response = await fetch(url, requestInit(options))
  if (!response.ok) throw new HttpError(response.status)
  return response.json() as Promise<T>
}

export function getNodes(signal?: AbortSignal) {
  return requestJson<string[]>(new URL("/api/nodes", API_BASE_URL), { signal })
}

export async function getLatestMeasurement(
  nodeId: string,
  signal?: AbortSignal
): Promise<Measurement | null> {
  const url = new URL("/api/measurements/latest", API_BASE_URL)
  url.searchParams.set("node_id", nodeId)

  const response = await fetch(url, { signal })
  if (response.status === 404) return null
  if (!response.ok) throw new HttpError(response.status)
  return response.json() as Promise<Measurement>
}

export function getMeasurements(
  { nodeId, fromDate, toDate, limit, offset }: MeasurementsParams,
  options: RequestOptions = {}
) {
  const url = new URL("/api/measurements", API_BASE_URL)
  if (nodeId) url.searchParams.set("node_id", nodeId)
  if (fromDate) url.searchParams.set("from_date", fromDate)
  if (toDate) url.searchParams.set("to_date", toDate)
  if (limit !== undefined) url.searchParams.set("limit", String(limit))
  if (offset !== undefined) url.searchParams.set("offset", String(offset))
  return requestJson<Measurement[]>(url, options)
}

export async function getMeasurementsCsv(
  { nodeId, fromDate, toDate }: MeasurementsParams,
  options: RequestOptions = {}
): Promise<Blob> {
  const url = new URL("/api/measurements/export.csv", API_BASE_URL)
  if (nodeId) url.searchParams.set("node_id", nodeId)
  if (fromDate) url.searchParams.set("from_date", fromDate)
  if (toDate) url.searchParams.set("to_date", toDate)

  const response = await fetch(url, requestInit(options))
  if (!response.ok) throw new HttpError(response.status)
  return response.blob()
}

export const PAGE_SIZE = 20

export function getNextOffset(lastPage: unknown[], pages: unknown[][]) {
  // ponytail: a full last page may be the final one; costs one empty request.
  return lastPage.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE
}
