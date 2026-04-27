type RawEnv = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireValue(env: RawEnv, key: string, message: string) {
  const value = asString(env[key]);

  if (!value) {
    throw new Error(message);
  }

  env[key] = value;
  return value;
}

export function validateEnv(config: RawEnv) {
  const env: RawEnv = { ...config };

  if (!asString(env.DB_USERNAME) && asString(env.DB_USER)) {
    env.DB_USERNAME = asString(env.DB_USER);
  }

  const nodeEnv = asString(env.NODE_ENV) || 'development';
  env.NODE_ENV = nodeEnv;

  const port = asString(env.PORT) || (nodeEnv === 'production' ? '3000' : '3001');
  const dbPort = asString(env.DB_PORT) || '5432';

  if (Number.isNaN(Number(port))) {
    throw new Error('PORT must be a valid number');
  }

  if (Number.isNaN(Number(dbPort))) {
    throw new Error('DB_PORT must be a valid number');
  }

  env.PORT = port;
  env.DB_PORT = dbPort;
  env.DB_HOST = asString(env.DB_HOST) || 'localhost';
  env.DB_NAME = asString(env.DB_NAME) || 'cinemaflow';
  env.DB_USERNAME = asString(env.DB_USERNAME) || 'postgres';
  env.DB_PASSWORD = asString(env.DB_PASSWORD);
  env.DB_RUN_MIGRATIONS = asString(env.DB_RUN_MIGRATIONS) || 'false';
  env.DB_SYNCHRONIZE = asString(env.DB_SYNCHRONIZE) || (nodeEnv === 'production' ? 'false' : 'true');
  env.FRONTEND_URL = asString(env.FRONTEND_URL);
  env.DATABASE_URL = asString(env.DATABASE_URL);

  if (!env.DATABASE_URL) {
    requireValue(env, 'DB_HOST', 'DB_HOST is required when DATABASE_URL is not provided');
    requireValue(env, 'DB_NAME', 'DB_NAME is required when DATABASE_URL is not provided');
    requireValue(env, 'DB_USERNAME', 'DB_USERNAME is required when DATABASE_URL is not provided');
  }

  if (nodeEnv === 'production') {
    if (!env.DATABASE_URL) {
      requireValue(env, 'DB_PASSWORD', 'DB_PASSWORD is required in production');
    }

    const signupKey = requireValue(
      env,
      'ADMIN_SIGNUP_KEY',
      'ADMIN_SIGNUP_KEY is required in production',
    );
    const tokenSecret = requireValue(
      env,
      'ADMIN_TOKEN_SECRET',
      'ADMIN_TOKEN_SECRET is required in production',
    );

    if (signupKey.length < 16) {
      throw new Error('ADMIN_SIGNUP_KEY must be at least 16 characters in production');
    }

    if (tokenSecret.length < 32) {
      throw new Error('ADMIN_TOKEN_SECRET must be at least 32 characters in production');
    }
  } else {
    env.ADMIN_SIGNUP_KEY =
      asString(env.ADMIN_SIGNUP_KEY) || 'cinemaflow-dev-signup-key-change-me';
    env.ADMIN_TOKEN_SECRET =
      asString(env.ADMIN_TOKEN_SECRET) || 'cinemaflow-dev-token-secret-change-me-now';
  }

  return env;
}
