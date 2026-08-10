'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

class JsonlEventRepository {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async load() {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, index) => {
          try {
            return JSON.parse(line);
          } catch (error) {
            throw new Error(`invalid event log at line ${index + 1}: ${error.message}`);
          }
        });
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async append(events) {
    if (events.length === 0) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const payload = events.map((event) => JSON.stringify(event)).join('\n') + '\n';
    await fs.appendFile(this.filePath, payload, 'utf8');
  }
}

module.exports = { JsonlEventRepository };
