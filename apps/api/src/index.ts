import { createApp } from './app.js';
import { resolveDataDirectory } from './config/dataDirectory.js';
import { getDatabasePath } from './repositories/importSessionRepository.js';

const app = createApp();
const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log('API server running on http://localhost:%d', port);
  console.log('ENEX viewer data directory: %s', resolveDataDirectory());
  console.log('SQLite database path: %s', getDatabasePath());
});
