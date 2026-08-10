'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

test('HTTP API accepts events and exposes reports', async (t) => {
  const server = await createServer({ dataFile: `${process.env.TEMP || process.env.TMP}\\player-session-test-${Date.now()}.jsonl` });
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const payload = {
    events: [{
      eventId: 'api-1',
      sessionId: 'api-session',
      mediaId: 'api-media',
      type: 'ended',
      occurredAt: '2026-08-10T00:00:00.000Z',
      positionSec: 30,
      durationSec: 30
    }]
  };
  const accepted = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(accepted.status, 202);

  const report = await fetch(`${baseUrl}/api/sessions/api-session`);
  assert.equal(report.status, 200);
  assert.equal((await report.json()).status, 'completed');

  const missing = await fetch(`${baseUrl}/api/sessions/missing`);
  assert.equal(missing.status, 404);
});
