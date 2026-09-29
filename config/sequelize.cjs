const { existsSync } = require('node:fs');
const path = require('node:path');

const envFile = path.resolve(__dirname, '../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Keep these connection defaults aligned with src/config/database.config.ts.
// Explicit environment variables take precedence over values from .env.
const connection = {
  dialect: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'keycloak',
  password: process.env.DB_PASSWORD ?? 'keycloak',
  database: process.env.DB_NAME ?? 'chat_db',
  logging: false,
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',
};

module.exports = {
  development: { ...connection },
  test: { ...connection },
  production: { ...connection },
};
