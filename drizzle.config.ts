import type { Config } from 'drizzle-kit';

export default {
  schema: './electron/database/schema/*.js',
  out: './electron/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './flowforge.db',
  },
} satisfies Config;
