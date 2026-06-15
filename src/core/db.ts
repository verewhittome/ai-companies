import pg from "pg";

/**
 * Postgres-backed store for issued API keys and per-period usage, shared across
 * all products. Keys are scoped by `product` so a key bought for one API can't
 * be used on another. If DATABASE_URL is unset the store is disabled (local dev
 * / RapidAPI-only mode).
 */

let pool: pg.Pool | null = null;

export function dbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Render Postgres TLS
      // Many services share one Postgres; keep each pool small to stay under
      // the instance connection ceiling (10 products * 3 = 30).
      max: 3,
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  if (!dbEnabled()) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id                      TEXT PRIMARY KEY,
      product                 TEXT NOT NULL DEFAULT 'webextract',
      stripe_customer_id      TEXT,
      stripe_subscription_id  TEXT UNIQUE,
      plan                    TEXT NOT NULL,
      monthly_quota           INTEGER NOT NULL,
      used_count              INTEGER NOT NULL DEFAULT 0,
      period_ym               TEXT NOT NULL,
      status                  TEXT NOT NULL DEFAULT 'active',
      email                   TEXT,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Migrate older deployments that predate the product column.
    ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS product TEXT NOT NULL DEFAULT 'webextract';
    CREATE INDEX IF NOT EXISTS api_keys_subscription_idx ON api_keys (stripe_subscription_id);
    CREATE INDEX IF NOT EXISTS api_keys_product_idx ON api_keys (product);
  `);
}

export interface ApiKeyRow {
  id: string;
  product: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  monthly_quota: number;
  used_count: number;
  period_ym: string;
  status: string;
  email: string | null;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function issueKeyForSubscription(params: {
  newKey: string;
  product: string;
  subscriptionId: string;
  customerId: string;
  plan: string;
  monthlyQuota: number;
  email: string | null;
}): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO api_keys
       (id, product, stripe_customer_id, stripe_subscription_id, plan, monthly_quota, period_ym, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (stripe_subscription_id) DO UPDATE
       SET plan = EXCLUDED.plan, monthly_quota = EXCLUDED.monthly_quota, status = 'active'
     RETURNING id`,
    [
      params.newKey,
      params.product,
      params.customerId,
      params.subscriptionId,
      params.plan,
      params.monthlyQuota,
      currentPeriod(),
      params.email,
    ],
  );
  return rows[0].id;
}

export async function findKeyBySubscription(subscriptionId: string): Promise<ApiKeyRow | null> {
  const { rows } = await getPool().query<ApiKeyRow>(
    `SELECT * FROM api_keys WHERE stripe_subscription_id = $1`,
    [subscriptionId],
  );
  return rows[0] ?? null;
}

export async function getKey(id: string): Promise<ApiKeyRow | null> {
  const { rows } = await getPool().query<ApiKeyRow>(`SELECT * FROM api_keys WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type ConsumeResult =
  | { ok: true; remaining: number; plan: string }
  | { ok: false; reason: "not_found" | "revoked" | "quota_exceeded" };

/**
 * Atomically validate a key (scoped to product) and consume one unit of quota.
 * The single UPDATE handles month rollover and the quota ceiling so concurrent
 * requests can't oversell.
 */
export async function consumeQuota(id: string, product: string): Promise<ConsumeResult> {
  const period = currentPeriod();
  const { rows } = await getPool().query<{
    used_count: number;
    monthly_quota: number;
    plan: string;
  }>(
    `UPDATE api_keys
       SET used_count = CASE WHEN period_ym = $2 THEN used_count + 1 ELSE 1 END,
           period_ym = $2
     WHERE id = $1
       AND product = $3
       AND status = 'active'
       AND (period_ym <> $2 OR used_count < monthly_quota)
     RETURNING used_count, monthly_quota, plan`,
    [id, period, product],
  );

  if (rows.length > 0) {
    const r = rows[0];
    return { ok: true, remaining: r.monthly_quota - r.used_count, plan: r.plan };
  }

  const existing = await getKey(id);
  if (!existing || existing.product !== product) return { ok: false, reason: "not_found" };
  if (existing.status !== "active") return { ok: false, reason: "revoked" };
  return { ok: false, reason: "quota_exceeded" };
}

export async function revokeBySubscription(subscriptionId: string): Promise<void> {
  await getPool().query(`UPDATE api_keys SET status = 'revoked' WHERE stripe_subscription_id = $1`, [
    subscriptionId,
  ]);
}

export async function updatePlanBySubscription(
  subscriptionId: string,
  plan: string,
  monthlyQuota: number,
): Promise<void> {
  await getPool().query(
    `UPDATE api_keys SET plan = $2, monthly_quota = $3, status = 'active'
     WHERE stripe_subscription_id = $1`,
    [subscriptionId, plan, monthlyQuota],
  );
}
