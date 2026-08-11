'use strict';

const { URL } = require('node:url');
const { labelsFor } = require('./i18n');

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('request body must be valid JSON');
    error.statusCode = 400;
    throw error;
  }
}

function createApiHandler(service) {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && url.pathname === '/api/health') {
        return json(res, 200, { ...service.health(), language: 'zh', labels: labelsFor() });
      }

      if (req.method === 'POST' && url.pathname === '/api/events') {
        const body = await readJson(req);
        const result = await service.ingest(body.events ?? body);
        return json(res, result.rejected.length ? 207 : 202, result);
      }

      if (req.method === 'GET' && url.pathname === '/api/sessions') {
        const payload = {
          items: service.listSessions({
            mediaId: url.searchParams.get('mediaId') || undefined,
            status: url.searchParams.get('status') || undefined,
            limit: url.searchParams.get('limit') || undefined
          })
        };
        payload.language = 'zh';
        payload.labels = labelsFor();
        return json(res, 200, payload);
      }

      const match = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
      if (req.method === 'GET' && match) {
        const report = service.getSession(decodeURIComponent(match[1]));
        return report
          ? json(res, 200, report)
          : json(res, 404, { error: 'session_not_found' });
      }

      return json(res, 404, { error: 'route_not_found' });
    } catch (error) {
      return json(res, error.statusCode || 500, { error: error.message });
    }
  };
}

module.exports = { createApiHandler };
