import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { Store } from './store.mjs';
import { createApp } from './app.mjs';
import { seed } from './seed.mjs';
process.umask(0o077);
const file = process.env.ONLYIDEAS_CONFIG || resolve(homedir(), '.config/onlyideas/config.json');
let config;
try {
  if (statSync(file).mode & 0o077) throw new Error('OnlyIdeas config must have mode 600.');
  config = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
  config = { origin: 'http://127.0.0.1:4182', development: true, dataDir: '.runtime/data' };
}
const store = new Store(resolve(config.dataDir || '.runtime/data')); seed(store);
config.webRoot = resolve(config.webRoot || 'dist');
const server = createApp(store, config);
server.listen(config.port || 18628, '127.0.0.1', () => console.log(`OnlyIdeas API listening on 127.0.0.1:${config.port || 18628}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
