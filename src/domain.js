'use strict';

const EVENT_TYPES = new Set([
  'play',
  'pause',
  'seek',
  'progress',
  'buffer_start',
  'buffer_end',
  'ended',
  'error'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asIsoDate(value, fieldName) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} must be an ISO-8601 timestamp`);
  }
  return new Date(value).toISOString();
}

function asNonNegativeNumber(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return value;
}

function normalizeEvent(input) {
  if (!isPlainObject(input)) {
    throw new Error('event must be an object');
  }

  for (const fieldName of ['eventId', 'sessionId', 'mediaId', 'type']) {
    if (typeof input[fieldName] !== 'string' || input[fieldName].trim() === '') {
      throw new Error(`${fieldName} is required`);
    }
  }
  if (!EVENT_TYPES.has(input.type)) {
    throw new Error(`unsupported event type: ${input.type}`);
  }

  const event = {
    eventId: input.eventId.trim(),
    sessionId: input.sessionId.trim(),
    mediaId: input.mediaId.trim(),
    type: input.type,
    occurredAt: asIsoDate(input.occurredAt, 'occurredAt'),
    positionSec: asNonNegativeNumber(input.positionSec ?? 0, 'positionSec'),
    durationSec: input.durationSec == null
      ? null
      : asNonNegativeNumber(input.durationSec, 'durationSec'),
    metadata: isPlainObject(input.metadata) ? input.metadata : {}
  };

  if (event.durationSec !== null && event.positionSec > event.durationSec) {
    throw new Error('positionSec cannot exceed durationSec');
  }
  return event;
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const time = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
    return time || a.eventId.localeCompare(b.eventId);
  });
}

function clampRatio(value) {
  return Math.max(0, Math.min(1, value));
}

function buildSessionReport(events) {
  const ordered = sortEvents(events);
  if (ordered.length === 0) {
    return null;
  }

  const first = ordered[0];
  const report = {
    sessionId: first.sessionId,
    mediaId: first.mediaId,
    startedAt: first.occurredAt,
    lastSeenAt: first.occurredAt,
    durationSec: first.durationSec,
    maxPositionSec: first.positionSec,
    watchTimeSec: 0,
    bufferingSec: 0,
    bufferEvents: 0,
    errorCount: 0,
    playCount: 0,
    pauseCount: 0,
    seekCount: 0,
    eventCount: ordered.length,
    status: 'active',
    completionRatio: 0,
    flags: []
  };

  let previousPosition = first.positionSec;
  let previousProgressAt = Date.parse(first.occurredAt);
  let bufferStartedAt = null;

  for (const event of ordered) {
    report.lastSeenAt = event.occurredAt;
    report.durationSec = event.durationSec ?? report.durationSec;
    report.maxPositionSec = Math.max(report.maxPositionSec, event.positionSec);

    if (event.type === 'play') report.playCount += 1;
    if (event.type === 'pause') report.pauseCount += 1;
    if (event.type === 'seek') report.seekCount += 1;
    if (event.type === 'error') report.errorCount += 1;

    if (event.type === 'progress' || event.type === 'ended') {
      const delta = event.positionSec - previousPosition;
      const elapsed = Math.max(0, (Date.parse(event.occurredAt) - previousProgressAt) / 1000);
      report.watchTimeSec += Math.min(Math.max(0, delta), elapsed || Math.max(0, delta));
      previousPosition = event.positionSec;
      previousProgressAt = Date.parse(event.occurredAt);
    }

    if (event.type === 'buffer_start' && bufferStartedAt === null) {
      bufferStartedAt = Date.parse(event.occurredAt);
      report.bufferEvents += 1;
    }
    if (event.type === 'buffer_end' && bufferStartedAt !== null) {
      report.bufferingSec += Math.max(0, (Date.parse(event.occurredAt) - bufferStartedAt) / 1000);
      bufferStartedAt = null;
    }

    if (event.type === 'ended' && report.durationSec !== null) {
      report.maxPositionSec = Math.max(report.maxPositionSec, report.durationSec);
    }
  }

  if (bufferStartedAt !== null) {
    report.bufferingSec += Math.max(0, (Date.parse(report.lastSeenAt) - bufferStartedAt) / 1000);
  }

  if (report.durationSec) {
    report.completionRatio = clampRatio(report.maxPositionSec / report.durationSec);
  }
  if (ordered.some((event) => event.type === 'ended') || report.completionRatio >= 0.95) {
    report.status = 'completed';
  } else if (report.errorCount >= 3) {
    report.status = 'failed';
  }

  if (report.errorCount >= 3) report.flags.push('high_error_rate');
  if (report.bufferingSec >= 10) report.flags.push('long_buffering');
  if (report.status !== 'completed' && report.durationSec && report.completionRatio < 0.25) {
    report.flags.push('early_dropoff');
  }

  report.watchTimeSec = Math.round(report.watchTimeSec * 100) / 100;
  report.bufferingSec = Math.round(report.bufferingSec * 100) / 100;
  report.completionRatio = Math.round(report.completionRatio * 1000) / 1000;
  return report;
}

module.exports = {
  EVENT_TYPES,
  normalizeEvent,
  sortEvents,
  buildSessionReport
};
