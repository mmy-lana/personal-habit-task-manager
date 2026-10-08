import { Pool } from '@neondatabase/serverless';

/**
 * Default development identity (SEC-01).
 *
 * In non-auth development mode every repository write is attributed to this user,
 * so all `user_id` foreign keys must resolve against it. The seed is idempotent:
 * `ON CONFLICT (id) DO NOTHING` makes it safe to run on every migration/bootstrap.
 */
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';
export const DEV_USER_EMAIL = 'dev@local.internal';

/**
 * Placeholder password hash for the non-login dev identity. The account is never
 * authenticated against; the column is NOT NULL in the schema, so a syntactically
 * valid bcrypt digest is seeded to satisfy the constraint.
 */
const DEV_USER_PASSWORD_HASH = '$2b$10$devlocaldevelopmentidentityonly0000000000000000000000000000000';

/**
 * Seeds the default development user row.
 *
 * Accepts either a connection string (manages its own single-connection pool) or
 * an existing Drizzle database client, so the migration runner can invoke it on
 * the same session without opening extra connections.
 */
export async function seedDevUser(
  target: string | { execute: (query: { sql: string; params: unknown[] }) => Promise<unknown> },
): Promise<void> {
  const statement = {
    sql: `INSERT INTO users (id, email, password_hash, first_name, last_name)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING`,
    params: [DEV_USER_ID, DEV_USER_EMAIL, DEV_USER_PASSWORD_HASH, 'Local', 'Developer'],
  };

  if (typeof target === 'string') {
    const pool = new Pool({ connectionString: target, max: 1, allowExitOnIdle: true });
    try {
      await pool.query(statement.sql, statement.params);
    } finally {
      await pool.end();
    }
    return;
  }

  await target.execute(statement);
}
