CREATE TABLE IF NOT EXISTS finance_records (
  owner_id uuid NOT NULL,
  id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('transaction','subscription','card','emi','bill')),
  record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);
CREATE INDEX IF NOT EXISTS finance_records_owner_kind_idx ON finance_records (owner_id, kind, updated_at DESC);
