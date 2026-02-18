import { startWorker } from './worker.js';

startWorker().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});
