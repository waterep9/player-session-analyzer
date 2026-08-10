# Player Session Analyzer

An append-only playback telemetry service for local development and owned test environments.

## Why this project

The existing workspace contains player debugging notes and a local-only userscript. This project turns that context into a small, auditable observability service:

```text
player client -> POST /api/events -> JSONL event log -> replayable session aggregate -> query API
```

The event log is the source of truth. Reports are derived by replaying events, so the business model is independent from the storage implementation.

## Features

- Strict event validation with a fixed event type allowlist.
- Idempotency by `eventId`.
- Append-only JSONL persistence with startup replay.
- Session metrics: completion, watch time, buffering, errors and interaction counts.
- Simple anomaly flags for high errors, long buffering and early drop-off.
- HTTP API built only with Node.js standard library.
- Unit and API tests using the built-in `node:test` runner.

## Run

Requires Node.js 18 or newer.

```powershell
npm test
npm run demo
npm start
```

The server listens on `http://localhost:8787` by default. Use `PORT` and `DATA_FILE` to override the defaults.

## API

Ingest one event or a batch:

```powershell
curl.exe -X POST http://localhost:8787/api/events `
  -H "content-type: application/json" `
  -d '{"events":[{"eventId":"e-1","sessionId":"s-1","mediaId":"m-1","type":"ended","occurredAt":"2026-08-10T00:00:00Z","positionSec":120,"durationSec":120}]}'
```

Query endpoints:

- `GET /api/health`
- `GET /api/sessions?mediaId=m-1&status=completed&limit=50`
- `GET /api/sessions/:sessionId`

Supported event types: `play`, `pause`, `seek`, `progress`, `buffer_start`, `buffer_end`, `ended`, `error`.

## Architecture notes

`src/domain.js` owns validation, ordering and report rules. `src/service.js` owns idempotent ingestion and session indexing. `src/repository.js` is the persistence boundary. `src/api.js` adapts HTTP requests to the service. This keeps the high-risk rules testable without starting a server.

## GitHub upload

This directory is a standalone Git repository. Configure a remote before pushing:

```powershell
git remote add origin <your-github-repository-url>
git push -u origin main
```
