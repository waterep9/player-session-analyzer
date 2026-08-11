'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionAnalyzerService } = require('../src/service');

class MemoryRepository {
  constructor() {
    this.saved = [];
  }

  async append(events) {
    this.saved.push(...events);
  }
}

const baseEvent = {
  sessionId: 's-1',
  mediaId: 'm-1',
  type: 'progress',
  occurredAt: '2026-08-10T00:00:00.000Z',
  positionSec: 10,
  durationSec: 100
};

test('ingest is idempotent and reports rejected events', async () => {
  const repository = new MemoryRepository();
  const service = new SessionAnalyzerService(repository);
  const result = await service.ingest([
    { ...baseEvent, eventId: 'e-1' },
    { ...baseEvent, eventId: 'e-1' },
    { ...baseEvent, eventId: 'e-2', type: 'unknown' }
  ]);

  assert.equal(result.accepted, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.rejected.length, 1);
  assert.equal(repository.saved.length, 1);
  assert.equal(service.health().sessionCount, 1);
});

test('filters and sorts session reports', async () => {
  const service = new SessionAnalyzerService(new MemoryRepository());
  await service.ingest([
    { ...baseEvent, eventId: 'e-1', sessionId: 's-old', mediaId: 'm-1' },
    { ...baseEvent, eventId: 'e-2', sessionId: 's-new', mediaId: 'm-2', occurredAt: '2026-08-10T00:01:00.000Z' }
  ]);

  const sessions = service.listSessions({ mediaId: 'm-2' });
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].sessionId, 's-new');
  assert.equal(service.getSession('missing'), null);
});

test('returns bilingual session reports when requested', async () => {
  const service = new SessionAnalyzerService(new MemoryRepository());
  await service.ingest([
    { ...baseEvent, eventId: 'e-1', type: 'play', positionSec: 0 },
    { ...baseEvent, eventId: 'e-2', type: 'ended', positionSec: 100 }
  ]);

  const report = service.getSession('s-1', { language: 'bilingual' });
  assert.equal(report.language, 'bilingual');
  assert.equal(report.statusLabel.en, 'Completed');
  assert.equal(report.statusLabel.zh, '已完成');
  assert.equal(typeof report.summary.en, 'string');
  assert.equal(typeof report.summary.zh, 'string');
});
