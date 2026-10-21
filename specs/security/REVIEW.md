# Security Review

- Generated: 2026-10-20T22:50:23-05:00
- Scope: `origin/main..aa6d791`
- Verdict: PASS

## Findings

No unresolved HIGH findings with confidence 8/10 or greater.

## Evidence

- Stored-history list, detail, and CSV export routes require `require_history_access`.
- IoT ingestion, latest measurement, and node discovery remain intentionally public.
- Username and password comparisons use `secrets.compare_digest`.
- Empty environment credentials fail closed.
- Missing, malformed, and incorrect credentials return the same generic `401` response.
- Responses omit `WWW-Authenticate`, preventing the browser's native Basic-auth prompt while preserving backend authorization.
- Tests cover valid, invalid, malformed, missing, and empty credentials.
- No credential values are committed or logged.

## Accepted deployment requirements

- `HISTORY_USERNAME` and `HISTORY_PASSWORD` must be supplied as deployment secrets.
- HTTPS is mandatory because HTTP Basic encodes credentials but does not encrypt them.
- Authentication rate limiting remains a reverse-proxy responsibility.
