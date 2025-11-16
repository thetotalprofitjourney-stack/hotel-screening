import { createPool } from 'mysql2/promise';
import { env } from './env.js';

export const pool = createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: 10,
  timezone: 'Z',
  decimalNumbers: true
});
