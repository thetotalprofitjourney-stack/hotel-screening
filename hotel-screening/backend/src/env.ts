import 'dotenv/config';

// Helper para validar variables requeridas
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 3001),
  DB_HOST: requireEnv('DB_HOST'),
  DB_PORT: Number(process.env.DB_PORT ?? 3306),
  DB_USER: requireEnv('DB_USER'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),
  DB_NAME: requireEnv('DB_NAME'),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*'
};

// Log de configuración (sin mostrar contraseñas)
console.log('[ENV] Configuration loaded:', {
  PORT: env.PORT,
  DB_HOST: env.DB_HOST,
  DB_PORT: env.DB_PORT,
  DB_USER: env.DB_USER,
  DB_NAME: env.DB_NAME,
  CORS_ORIGIN: env.CORS_ORIGIN
});
