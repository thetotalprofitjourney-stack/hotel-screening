import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT ?? 3001),
  DB_HOST: process.env.DB_HOST!,
  DB_PORT: Number(process.env.DB_PORT ?? 3306),
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DB_NAME: process.env.DB_NAME!,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*'
};
