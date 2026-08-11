'use strict';

const { buildSessionReport, normalizeEvent } = require('./domain');
const { localizeSessionReport } = require('./i18n');

class SessionAnalyzerService {
  constructor(repository, existingEvents = []) {
    this.repository = repository;
    this.events = [];
    this.eventIds = new Set();
    this.bySession = new Map();

    for (const rawEvent of existingEvents) {
      this.#store(normalizeEvent(rawEvent));
    }
  }

  async ingest(input) {
    const inputs = Array.isArray(input) ? input : [input];
    const accepted = [];
    const rejected = [];
    const seenIds = new Set(this.eventIds);

    for (const candidate of inputs) {
      try {
        const event = normalizeEvent(candidate);
        if (seenIds.has(event.eventId)) continue;
        seenIds.add(event.eventId);
        accepted.push(event);
      } catch (error) {
        rejected.push({ event: candidate, reason: error.message });
      }
    }

    await this.repository.append(accepted);
    for (const event of accepted) this.#store(event);

    return {
      accepted: accepted.length,
      duplicates: inputs.length - accepted.length - rejected.length,
      rejected
    };
  }

  listSessions(filters = {}) {
    const reports = [...this.bySession.values()]
      .map((events) => buildSessionReport(events))
      .filter(Boolean)
      .filter((report) => !filters.mediaId || report.mediaId === filters.mediaId)
      .filter((report) => !filters.status || report.status === filters.status)
      .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    return reports.slice(0, limit).map((report) => localizeSessionReport(report, filters.language));
  }

  getSession(sessionId, options = {}) {
    const events = this.bySession.get(sessionId);
    const report = events ? buildSessionReport(events) : null;
    return localizeSessionReport(report, options.language);
  }

  health() {
    return {
      status: 'ok',
      eventCount: this.events.length,
      sessionCount: this.bySession.size
    };
  }

  #store(event) {
    this.events.push(event);
    this.eventIds.add(event.eventId);
    const sessionEvents = this.bySession.get(event.sessionId) || [];
    sessionEvents.push(event);
    this.bySession.set(event.sessionId, sessionEvents);
  }
}

async function createService(repository) {
  const existingEvents = await repository.load();
  return new SessionAnalyzerService(repository, existingEvents);
}

module.exports = { SessionAnalyzerService, createService };
