'use strict';

const path = require('node:path');
const { JsonlEventRepository } = require('./repository');
const { createService } = require('./service');

const base = Date.parse('2026-08-10T09:00:00.000Z');
const at = (seconds) => new Date(base + seconds * 1000).toISOString();

async function main() {
  const repository = new JsonlEventRepository(
    path.join(__dirname, '..', 'data', 'demo-events.jsonl')
  );
  const service = await createService(repository);
  await service.ingest([
    { eventId: 'demo-1', sessionId: 's-demo', mediaId: 'architecture-101', type: 'play', occurredAt: at(0), positionSec: 0, durationSec: 600 },
    { eventId: 'demo-2', sessionId: 's-demo', mediaId: 'architecture-101', type: 'progress', occurredAt: at(60), positionSec: 60, durationSec: 600 },
    { eventId: 'demo-3', sessionId: 's-demo', mediaId: 'architecture-101', type: 'buffer_start', occurredAt: at(60), positionSec: 60, durationSec: 600 },
    { eventId: 'demo-4', sessionId: 's-demo', mediaId: 'architecture-101', type: 'buffer_end', occurredAt: at(72), positionSec: 60, durationSec: 600 },
    { eventId: 'demo-5', sessionId: 's-demo', mediaId: 'architecture-101', type: 'progress', occurredAt: at(180), positionSec: 180, durationSec: 600 },
    { eventId: 'demo-6', sessionId: 's-demo', mediaId: 'architecture-101', type: 'ended', occurredAt: at(600), positionSec: 600, durationSec: 600 }
  ]);
  console.log(JSON.stringify(service.getSession('s-demo'), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
