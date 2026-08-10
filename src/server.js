'use strict';

const http = require('node:http');
const path = require('node:path');
const { JsonlEventRepository } = require('./repository');
const { createService } = require('./service');
const { createApiHandler } = require('./api');

async function createServer(options = {}) {
  const dataFile = options.dataFile || process.env.DATA_FILE ||
    path.join(__dirname, '..', 'data', 'events.jsonl');
  const repository = new JsonlEventRepository(dataFile);
  const service = await createService(repository);
  const server = http.createServer(createApiHandler(service));
  server.service = service;
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  createServer()
    .then((server) => server.listen(port, () => {
      console.log(`player-session-analyzer listening on http://localhost:${port}`);
    }))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = { createServer };
