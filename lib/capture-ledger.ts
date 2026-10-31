import type { PoolClient } from "pg";

export interface CaptureEntry {
  orderId: string;
  captureId: string;
  category: string;
  amount: number;
  currency: "USD";
  authorizationId?: string | null;
}

export async function recordCaptureOnce(client: Pick<PoolClient, "query">, ownerId: string, input: CaptureEntry) {
  const inserted = await client.query(
    `INSERT INTO spend_entries (owner_id, idempotency_key, source, external_order_id, capture_id, category, amount, currency, authorization_id)
     VALUES ($1, $2, 'paypal_capture', $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING RETURNING id`,
    [ownerId, `paypal-capture:${input.captureId}`, input.orderId, input.captureId, input.category, input.amount, input.currency, input.authorizationId ?? null],
  );
  if (inserted.rowCount) return { alreadyRecorded: false };
  const existing = await client.query<{ category: string; amount: string; currency: string }>(
    "SELECT category, amount::text AS amount, currency FROM spend_entries WHERE owner_id = $1 AND (external_order_id = $2 OR capture_id = $3)",
    [ownerId, input.orderId, input.captureId],
  );
  const row = existing.rows[0];
  if (!row) throw new Error("The PayPal capture conflicts with another spend record.");
  if (row.category !== input.category || Number(row.amount) !== input.amount || row.currency.trim() !== input.currency) {
    throw new Error("The repeated PayPal capture does not match its original spend record.");
  }
  return { alreadyRecorded: true };
}
