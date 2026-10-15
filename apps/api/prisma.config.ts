import {config} from 'dotenv';
import {defineConfig} from 'prisma/config';

config({path: '../../.env'});
config();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
// Prisma 6 reads migration connections from schema.prisma, not config.datasource.
// Keep the direct URL optional for local development.
process.env.DIRECT_URL = process.env.DIRECT_URL?.trim() || databaseUrl;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {path: 'prisma/migrations', seed: 'tsx prisma/seed.ts'},
});
