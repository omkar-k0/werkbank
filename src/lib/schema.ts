// Idempotent schema, applied on first connection. Every tenant-owned
// table carries shop_id, and every query in src/lib/repo.ts filters on it.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'trial',
    strictness TEXT NOT NULL DEFAULT 'balanced',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS workshops (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capabilities TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner','workshop')),
    workshop_id TEXT REFERENCES workshops(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    item TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE,
    expected_date DATE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done')),
    workshop_id TEXT REFERENCES workshops(id) ON DELETE SET NULL,
    capability TEXT,
    secondary TEXT,
    gate TEXT NOT NULL,
    confidence REAL NOT NULL,
    source TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '[]',
    probabilities JSONB NOT NULL DEFAULT '{}',
    llm_quote TEXT,
    job_type TEXT NOT NULL,
    urgency TEXT NOT NULL,
    effort TEXT NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    UNIQUE (shop_id, number)
  )`,
  `CREATE INDEX IF NOT EXISTS orders_shop_idx ON orders (shop_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS orders_ws_idx ON orders (shop_id, workshop_id)`,
  // Only orders split across two workshops have rows here. Each part carries its own
  // progress; orders.status / expected_date / completed_at then hold the overall result.
  `CREATE TABLE IF NOT EXISTS order_parts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    workshop_id TEXT NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    capability TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','done')),
    expected_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (order_id, workshop_id)
  )`,
  `CREATE INDEX IF NOT EXISTS order_parts_ws_idx ON order_parts (shop_id, workshop_id)`,
  `CREATE TABLE IF NOT EXISTS order_events (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    kind TEXT NOT NULL,
    detail TEXT NOT NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS corrections (
    id SERIAL PRIMARY KEY,
    shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    order_id TEXT,
    text TEXT NOT NULL,
    from_capability TEXT,
    to_capability TEXT NOT NULL,
    job_type TEXT,
    at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];
