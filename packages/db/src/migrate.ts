import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pino from 'pino';

const logger = pino({ level: 'info' });

async function runMigrations() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);

  logger.info('Running migrations...');
  await migrate(db, { migrationsFolder: './src/migrations' });
  logger.info('Migrations complete.');

  await client.end();
}

runMigrations().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
