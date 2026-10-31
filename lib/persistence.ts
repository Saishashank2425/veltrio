import type { PoolClient } from "pg";
import { authorize, monthlySpend, type AuthorizationResult, type PurchaseMandate, type PurchaseProposal } from "@/lib/gateway";
import { ensureSchema, getPool, withTransaction } from "@/lib/db";
import { recordCaptureOnce } from "@/lib/capture-ledger";

const BASELINE = { Travel: 1340, "Operating Expenses": 4780 } as const;
const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};

async function loadSpend(client: PoolClient, ownerId: string) {
  const start = monthStart();
  const month = start.toISOString().slice(0, 7);
  for (const [category, amount] of Object.entries(BASELINE)) {
    await client.query(
      `INSERT INTO spend_entries (owner_id, idempotency_key, source, category, amount, currency, created_at)
       VALUES ($1, $2, 'baseline', $3, $4, 'USD', $5) ON CONFLICT (owner_id, idempotency_key) DO NOTHING`,
      [ownerId, `baseline:${month}:${category}`, category, amount, start],
    );
  }
  const result = await client.query<{ category: string; total: string }>(
    "SELECT category, SUM(amount)::text AS total FROM spend_entries WHERE owner_id = $1 AND created_at >= $2 GROUP BY category",
    [ownerId, start],
  );
  for (const key of Object.keys(monthlySpend)) delete monthlySpend[key];
  for (const row of result.rows) monthlySpend[row.category] = Number(row.total);
}

async function activeMandate(client: PoolClient, ownerId: string): Promise<PurchaseMandate | null> {
  const result = await client.query<{
    id: string; name: string; purpose: string; rules: Record<string, unknown>; currency: "USD" | "INR"; expires_at: Date | null;
  }>("SELECT id, name, purpose, rules, currency, expires_at FROM mandates WHERE owner_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1", [ownerId]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    currency: row.currency,
    expiresAt: row.expires_at?.toISOString() ?? null,
    maxPerTransaction: row.rules.maxPerTransaction as number | null,
    monthlyBudget: row.rules.monthlyBudget as number | null,
    allowedMerchants: row.rules.allowedMerchants as string[],
    blockedMerchants: row.rules.blockedMerchants as string[],
    categories: row.rules.categories as string[],
    blockedCategories: row.rules.blockedCategories as string[],
    approvalAbove: row.rules.approvalAbove as number | null,
  };
}

export async function authorizePersisted(ownerId: string, proposal: PurchaseProposal, options: { recordSpend?: boolean } = {}): Promise<AuthorizationResult> {
  return withTransaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('veltrio-authorization'))");
    await loadSpend(client, ownerId);
    const mandate = await activeMandate(client, ownerId);
    const result = authorize(proposal, { recordSpend: false, mandate });
    await client.query(
      `INSERT INTO authorization_decisions (owner_id, audit_id, mandate_id, decision, proposal, rules_evaluated, triggering_rule, duration_ms, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)`,
      [ownerId, result.auditId, mandate?.id ?? null, result.decision, JSON.stringify(result.proposal), JSON.stringify(result.rulesEvaluated), JSON.stringify(result.triggeringRule), result.durationMs, result.timestamp],
    );
    if (options.recordSpend && result.decision === "ALLOW") {
      await client.query(
        `INSERT INTO spend_entries (owner_id, idempotency_key, source, category, amount, currency, authorization_id, created_at)
         VALUES ($1, $2, 'authorization', $3, $4, $5, $6, $7)`,
        [ownerId, `authorization:${result.auditId}`, proposal.category, proposal.amount, proposal.currency ?? "USD", result.auditId, result.timestamp],
      );
    }
    return result;
  });
}

export async function listMandates(ownerId: string) {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT id, name, purpose, rules, currency, active, created_at AS "createdAt", expires_at AS "expiresAt"
     FROM mandates WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 100`, [ownerId],
  );
  return result.rows.map(row => ({ ...row, ...(row.rules as object) }));
}

export async function saveMandate(ownerId: string, input: {
  id: string; name: string; purpose: string; currency: "USD" | "INR";
  maxPerTransaction: number | null; monthlyBudget: number | null; allowedMerchants: string[]; blockedMerchants: string[];
  categories: string[]; blockedCategories: string[]; approvalAbove: number | null; expiresInDays: number | null;
  confidence: "high" | "medium" | "low"; needsClarification: string[];
}) {
  const expiresAt = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86_400_000) : null;
  await withTransaction(async client => {
    await client.query("UPDATE mandates SET active = false, updated_at = now() WHERE owner_id = $1 AND active = true", [ownerId]);
    await client.query(
      `INSERT INTO mandates (owner_id, id, name, purpose, rules, currency, active, expires_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, true, $7)`,
      [ownerId, input.id, input.name, input.purpose, JSON.stringify({
        maxPerTransaction: input.maxPerTransaction, monthlyBudget: input.monthlyBudget,
        allowedMerchants: input.allowedMerchants, blockedMerchants: input.blockedMerchants,
        categories: input.categories, blockedCategories: input.blockedCategories,
        approvalAbove: input.approvalAbove, expiresInDays: input.expiresInDays,
        confidence: input.confidence, needsClarification: input.needsClarification,
      }), input.currency, expiresAt],
    );
  });
  const mandates = await listMandates(ownerId);
  return mandates.find(mandate => mandate.id === input.id);
}

export async function deleteMandate(ownerId: string, id: string) {
  await withTransaction(async client => {
    await client.query("DELETE FROM mandates WHERE owner_id = $1 AND id = $2", [ownerId, id]);
  });
}

export async function listAuditHistory(ownerId: string) {
  await ensureSchema();
  const [count, entries] = await Promise.all([
    getPool().query<{ count: string }>("SELECT COUNT(*)::text AS count FROM authorization_decisions WHERE owner_id = $1", [ownerId]),
    getPool().query(
      `SELECT decision, proposal, rules_evaluated AS "rulesEvaluated", triggering_rule AS "triggeringRule",
       audit_id AS "auditId", created_at AS timestamp, duration_ms AS "durationMs"
       FROM authorization_decisions WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 100`, [ownerId],
    ),
  ]);
  return { count: Number(count.rows[0]?.count ?? 0), entries: entries.rows };
}

export async function ownsAuthorization(ownerId: string, auditId: string) {
  await ensureSchema();
  const result = await getPool().query(
    "SELECT 1 FROM authorization_decisions WHERE owner_id = $1 AND audit_id = $2 LIMIT 1",
    [ownerId, auditId],
  );
  return result.rowCount === 1;
}

export async function getMonthlySpend(ownerId: string) {
  await ensureSchema();
  return withTransaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('veltrio-authorization'))");
    await loadSpend(client, ownerId);
    return { ...monthlySpend };
  });
}

export async function recordPayPalCapture(ownerId: string, input: {
  orderId: string; captureId: string; category: string; amount: number; currency: "USD"; authorizationId?: string | null;
}) {
  return withTransaction(client => recordCaptureOnce(client, ownerId, input));
}

