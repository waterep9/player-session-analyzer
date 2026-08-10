'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSessionReport, normalizeEvent } = require('../src/domain');

const event = (overrides = {}) => normalizeEvent({
  eventId: 'e-1',
  sessionId: 's-1',
  mediaId: 'm-1',
  type: 'progress',
  occurredAt: '2026-08-10T00:00:00.000Z',
  positionSec: 10,
  durationSec: 100,
  ...overrides
});

test('normalizes valid events and rejects unsafe values', () => {
  assert.equal(event().occurredAt, '2026-08-10T00:00:00.000Z');
  assert.throws(() => event({ type: 'admin_command' }), /unsupported event type/);
  assert.throws(() => event({ positionSec: 101 }), /cannot exceed/);
});

test('builds a completed report with buffering and playback metrics', () => {
  const report = buildSessionReport([
    event({ eventId: 'e-2', type: 'play', positionSec: 0 }),
    event({ eventId: 'e-3', type: 'progress', occurredAt: '2026-08-10T00:01:00.000Z', positionSec: 60 }),
    event({ eventId: 'e-4', type: 'buffer_start', occurredAt: '2026-08-10T00:01:00.000Z', positionSec: 60 }),
    event({ eventId: 'e-5', type: 'buffer_end', occurredAt: '2026-08-10T00:01:12.000Z', positionSec: 60 }),
    event({ eventId: 'e-6', type: 'ended', occurredAt: '2026-08-10T00:01:40.000Z', positionSec: 100 })
  ]);

  assert.equal(report.status, 'completed');
  assert.equal(report.completionRatio, 1);
  assert.equal(report.bufferingSec, 12);
  assert.equal(report.watchTimeSec, 100);
  assert.deepEqual(report.flags, ['long_buffering']);
});
