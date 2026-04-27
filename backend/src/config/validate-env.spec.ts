import { validateEnv } from './validate-env';

describe('validateEnv', () => {
  it('maps DB_USER to DB_USERNAME for backward compatibility', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
      DB_USER: 'legacy-user',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'cinemaflow',
    });

    expect(env.DB_USERNAME).toBe('legacy-user');
  });

  it('requires production secrets', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        DB_HOST: 'db',
        DB_PORT: '5432',
        DB_NAME: 'cinemaflow',
        DB_USERNAME: 'cinemaflow',
        DB_PASSWORD: 'super-secret-password',
      }),
    ).toThrow('ADMIN_SIGNUP_KEY is required in production');
  });

  it('accepts DATABASE_URL instead of individual database fields', () => {
    const env = validateEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://postgres:postgres@db:5432/cinemaflow',
      DB_PASSWORD: 'super-secret-password',
      ADMIN_SIGNUP_KEY: 'very-long-signup-key',
      ADMIN_TOKEN_SECRET: 'very-long-token-secret-for-production',
    });

    expect(env.DATABASE_URL).toBe('postgres://postgres:postgres@db:5432/cinemaflow');
    expect(env.PORT).toBe('3000');
  });
});
