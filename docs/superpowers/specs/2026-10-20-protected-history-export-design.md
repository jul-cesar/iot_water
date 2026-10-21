# Protected history export design

## Goal

Allow one shared administrator account to read stored measurement history and export it as a CSV file that opens in Excel. Live measurements remain public.

## Scope

### Included

- Protect stored-history API reads with HTTP Basic authentication.
- Add a server-side CSV export for a selected node and date range.
- Accept ranges of at most 31 days and exports of at most 50,000 rows.
- Ask for credentials in the dashboard and keep them only in memory until the page reloads.
- Clear credentials and ask again after an unauthorized response.

### Excluded

- User registration, multiple accounts, roles, password recovery, and persistent sessions.
- Native `.xlsx` generation.
- Authentication for IoT ingestion, node discovery, or the latest-measurement endpoint.

## Backend design

Use FastAPI's HTTP Basic security dependency. Configure the shared username and a password hash through environment variables. Compare credentials without revealing whether the username or password was incorrect.

Require authentication on:

- `GET /api/measurements`
- `GET /api/measurements/{id}`
- `GET /api/measurements/export.csv`

Keep these routes public:

- `POST /api/measurements`
- `GET /api/measurements/latest`
- `GET /api/nodes`

The export endpoint accepts `node_id`, `from_date`, and `to_date`. Both dates are required. It rejects reversed ranges and ranges longer than 31 days. It returns UTF-8 CSV with a byte-order mark and a `Content-Disposition` filename. It rejects results above 50,000 rows instead of silently truncating them.

Rate limiting for failed authentication attempts belongs at the deployment proxy because an in-process limiter would not work reliably across multiple workers. HTTPS is mandatory because HTTP Basic credentials are encoded, not encrypted.

## Dashboard design

The recent table, historical charts, and export action share one in-memory credential value. When a protected request has no credentials, the history area shows an access prompt. A successful request unlocks the history area until the page reloads. A `401` response clears the credentials and shows the prompt again.

The dashboard sends the `Authorization` header only to protected history and export requests. It never writes credentials to local storage, session storage, cookies, URLs, or logs.

Export calls the backend endpoint directly instead of converting the 1,000 currently loaded rows in the browser. Existing range controls provide the requested dates.

## Error handling

- Missing or invalid credentials: `401` with a generic message and `WWW-Authenticate` header.
- Missing, reversed, or excessive date range: `422` with a clear validation message.
- More than 50,000 matching rows: `413` with guidance to select a shorter range.
- Database or streaming failure: existing generic server-error behavior; no partial file is presented as successful.

## Verification

Backend tests cover unauthorized access, incorrect credentials, authorized history reads, valid CSV output, CSV escaping, reversed dates, ranges longer than 31 days, and the row cap.

Dashboard tests cover authorization header creation, credentials remaining memory-only, re-prompting after `401`, and downloading the server response with the selected range.

## Security boundary

This protects stored history and official exports. The public latest-measurement endpoint can still be sampled over time, so this design does not promise complete measurement confidentiality.
