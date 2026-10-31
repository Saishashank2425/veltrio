CREATE TABLE mandates (
  owner_id uuid NOT NULL,
  id uuid PRIMARY KEY,
  name text NOT NULL,
  purpose text NOT NULL,
  rules jsonb NOT NULL,
  currency char(3) NOT NULL CHECK (currency IN ('USD', 'INR')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX mandates_active_created_idx ON mandates (owner_id, active, created_at DESC);

CREATE TABLE authorization_decisions (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  audit_id text NOT NULL UNIQUE,
  mandate_id uuid REFERENCES mandates(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('ALLOW', 'BLOCK', 'ESCALATE')),
  proposal jsonb NOT NULL,
  rules_evaluated jsonb NOT NULL,
  triggering_rule jsonb,
  duration_ms integer NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX authorization_decisions_created_idx ON authorization_decisions (owner_id, created_at DESC);

CREATE TABLE spend_entries (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  source text NOT NULL CHECK (source IN ('baseline', 'authorization', 'paypal_capture')),
  external_order_id text,
  capture_id text,
  category text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency char(3) NOT NULL CHECK (currency IN ('USD', 'INR')),
  authorization_id text REFERENCES authorization_decisions(audit_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX spend_entries_idempotency_idx ON spend_entries (owner_id, idempotency_key);
CREATE UNIQUE INDEX spend_entries_order_idx ON spend_entries (owner_id, external_order_id) WHERE external_order_id IS NOT NULL;
CREATE UNIQUE INDEX spend_entries_capture_idx ON spend_entries (owner_id, capture_id) WHERE capture_id IS NOT NULL;
CREATE INDEX spend_entries_category_created_idx ON spend_entries (owner_id, category, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
