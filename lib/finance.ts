export type RecordKind = "transaction" | "subscription" | "card" | "emi" | "bill";
export type RecordSource = "manual" | "csv";
export type RecordStatus = "pending" | "completed" | "failed" | "cancelled" | "active" | "paused" | "trial" | "upcoming" | "due" | "paid" | "overdue";

export interface FinancialRecord {
  id: string;
  kind: RecordKind;
  name: string;
  amount: number;
  currency: string;
  date?: string;
  category?: string;
  transactionType?: "income" | "expense" | "refund" | "transfer";
  description?: string;
  status: RecordStatus;
  source: RecordSource;
  frequency?: "weekly" | "monthly" | "quarterly" | "yearly" | "one-time";
  nextDate?: string;
  provider?: string;
  issuer?: string;
  lastFour?: string;
  creditLimit?: number;
  outstanding?: number;
  statementBalance?: number;
  minimumDue?: number;
  statementDate?: string;
  dueDate?: string;
  principal?: number;
  interestRate?: number;
  installmentsTotal?: number;
  installmentsRemaining?: number;
  autopay?: "enabled" | "disabled" | "unknown";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const STORAGE_KEY = "veltrio-finance-v1";

export const CATEGORIES = [
  "Shopping", "Food & dining", "Transportation", "Housing", "Utilities",
  "Healthcare", "Entertainment", "Subscriptions", "Education", "EMI & loans",
  "Credit card payment", "Income", "Refund", "Transfer", "Other",
] as const;

export const KIND_LABELS: Record<RecordKind, string> = {
  transaction: "Transaction",
  subscription: "Subscription",
  card: "Credit card",
  emi: "EMI / loan",
  bill: "Bill / autopay",
};

export function formatINR(value: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function monthlyEquivalent(amount: number, frequency?: FinancialRecord["frequency"]): number {
  switch (frequency) {
    case "weekly": return amount * 52 / 12;
    case "quarterly": return amount / 3;
    case "yearly": return amount / 12;
    case "one-time": return 0;
    case "monthly":
    default: return amount;
  }
}

export function annualEquivalent(amount: number, frequency?: FinancialRecord["frequency"]): number {
  switch (frequency) {
    case "weekly": return amount * 52;
    case "quarterly": return amount * 4;
    case "yearly": return amount;
    case "one-time": return amount;
    case "monthly":
    default: return amount * 12;
  }
}

export function isFutureDate(date?: string): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const value = new Date(date + "T00:00:00");
  return !Number.isNaN(value.getTime()) && value >= today;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((part) => part.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some((part) => part.length > 0)) rows.push(row);
  }
  return rows;
}

export function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[\s_-]+/g, "");
}

export function parseTransactionCsv(text: string): {
  records: Omit<FinancialRecord, "id" | "createdAt" | "updatedAt">[];
  errors: string[];
} {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("The CSV needs a header row and at least one transaction.");
  if (rows.length > 5001) throw new Error("Please import no more than 5,000 rows at a time.");

  const headers = rows[0].map(normalizeHeader);
  const findColumn = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const dateCol = findColumn("date", "transactiondate", "posteddate");
  const descCol = findColumn("description", "details", "merchant", "payee", "name", "narration");
  const amountCol = findColumn("amount", "transactionamount", "value");
  const debitCol = findColumn("debit", "withdrawal", "withdrawals");
  const creditCol = findColumn("credit", "deposit", "deposits");
  const categoryCol = findColumn("category", "type");
  const currencyCol = findColumn("currency", "ccy");

  if (dateCol < 0 || descCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) {
    throw new Error("Required columns not found. Include date, description, and amount (or debit/credit columns).");
  }

  const records: Omit<FinancialRecord, "id" | "createdAt" | "updatedAt">[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((row, index) => {
    const line = index + 2;
    const dateRaw = row[dateCol] ?? "";
    const description = row[descCol]?.trim() ?? "";
    const amountRaw = amountCol >= 0 ? row[amountCol] : "";
    const debitRaw = debitCol >= 0 ? row[debitCol] : "";
    const creditRaw = creditCol >= 0 ? row[creditCol] : "";
    const cleanNumber = (value: string) => Number(value.replace(/[₹$,\s]/g, "").replace(/^\((.*)\)$/, "-$1"));
    const debit = debitRaw ? cleanNumber(debitRaw) : 0;
    const credit = creditRaw ? cleanNumber(creditRaw) : 0;
    const raw = amountCol >= 0 ? cleanNumber(amountRaw) : (credit > 0 ? credit : -Math.abs(debit));
    const date = new Date(dateRaw);
    if (!description || !dateRaw || Number.isNaN(date.getTime()) || !Number.isFinite(raw) || (amountCol >= 0 && !amountRaw)) {
      errors.push(`Row ${line}: missing description/date or invalid amount/date.`);
      return;
    }
    const amount = Math.abs(raw);
    const transactionType = credit > 0 && debitCol >= 0 ? "income" : raw < 0 || debit > 0 ? "expense" : "expense";
    const categoryValue = categoryCol >= 0 ? row[categoryCol]?.trim() : "";
    records.push({
      kind: "transaction",
      name: description,
      description,
      amount,
      currency: (currencyCol >= 0 ? row[currencyCol]?.trim() : "") || "INR",
      date: Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10),
      category: categoryValue || "Other",
      transactionType,
      status: "completed",
      source: "csv",
    });
  });
  return { records, errors };
}

export function isLikelyDuplicate(a: FinancialRecord, b: Pick<FinancialRecord, "name" | "amount" | "date" | "transactionType">): boolean {
  return a.kind === "transaction"
    && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
    && Math.abs(a.amount - b.amount) < 0.005
    && a.date === b.date
    && a.transactionType === b.transactionType;
}
