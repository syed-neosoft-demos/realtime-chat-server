import { registerAs } from '@nestjs/config';
import type { SequelizeModuleOptions } from '@nestjs/sequelize';

export default registerAs('database', (): SequelizeModuleOptions => ({
  dialect: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'keycloak',
  password: process.env.DB_PASSWORD ?? 'keycloak',
  database: process.env.DB_NAME ?? 'chat_db',
  autoLoadModels: true,
  synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNCHRONIZE === 'true',
  logging: false,
  define: { underscored: true },
}));
