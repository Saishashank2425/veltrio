import { NextRequest, NextResponse } from "next/server";

type ParsedMandate = {
  name: string;
  purpose: string;
  maxPerTransaction: number | null;
  monthlyBudget: number | null;
  currency: "INR" | "USD";
  allowedMerchants: string[];
  blockedMerchants: string[];
  categories: string[];
  approvalAbove: number | null;
  expiresInDays: number | null;
  confidence: "high" | "medium" | "low";
  needsClarification: string[];
};


function parseMandate(raw: string): ParsedMandate {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const currency: "INR" | "USD" = /\$|\busd\b|\bdollars?\b/i.test(text) && !/₹|\binr\b|\brupees?\b/i.test(text) ? "USD" : "INR";

  const allAmounts = [...text.matchAll(/(?:₹|rs\.?\s*|inr\s*|\$\s*)([\d,]+(?:\.\d+)?)|\b([\d,]+(?:\.\d+)?)\s*(?:rupees|inr|rs\b|dollars?|usd)\b/gi)]
    .map(m => Number((m[1] || m[2]).replace(/,/g, "")))
    .filter(n => Number.isFinite(n) && n > 0);
  const first = allAmounts[0] ?? null;
  const approvalMatch = text.match(/(?:approval|approve|ask me|confirm|escalat\w*)[^₹$\d]{0,35}(?:₹|rs\.?\s*|inr\s*|\$\s*)?([\d,]+(?:\.\d+)?)/i)
    || text.match(/(?:above|over|more than|exceed(?:s|ing)?)\s*(?:₹|rs\.?\s*|inr\s*|\$\s*)?([\d,]+(?:\.\d+)?)/i);
  const approvalAbove = approvalMatch ? Number((approvalMatch[1]).replace(/,/g, "")) : null;
  const monthlyMatch = text.match(/(?:monthly|per month|each month|month(?:ly)? budget)[^₹$\d]{0,25}(?:₹|rs\.?\s*|inr\s*|\$\s*)?([\d,]+(?:\.\d+)?)/i);
  const monthlyBudget = monthlyMatch ? Number(monthlyMatch[1].replace(/,/g, "")) : null;
  const capMatch = text.match(/(?:per transaction|per purchase|single purchase|each purchase|one purchase|transaction cap|purchase limit|limit(?: of)?|up to|under|below|less than|maximum|max(?:imum)?)[^₹$\d]{0,28}(?:₹|rs\.?\s*|inr\s*|\$\s*)?([\d,]+(?:\.\d+)?)/i);
  const trailingCapMatch = text.match(/(?:₹|rs\.?\s*|inr\s*|\$\s*)([\d,]+(?:\.\d+)?)\s*(?:per transaction|per purchase|each purchase|single purchase)/i);
  const maxPerTransaction = capMatch ? Number(capMatch[1].replace(/,/g, "")) : trailingCapMatch ? Number(trailingCapMatch[1].replace(/,/g, "")) : (allAmounts.length === 1 && !monthlyMatch && !approvalMatch ? first : null);
  const expiresMatch = text.match(/(?:expire|expires|valid for|for)\s*(\d+)\s*(day|days|week|weeks|month|months)/i);
  const expiresInDays = expiresMatch ? Number(expiresMatch[1]) * (/week/i.test(expiresMatch[2]) ? 7 : /month/i.test(expiresMatch[2]) ? 30 : 1) : null;

  const knownCategories = ["electronics", "groceries", "food", "travel", "fashion", "health", "subscriptions", "software", "home", "entertainment"];
  const categories = knownCategories.filter(category => lower.includes(category));
  const merchantMatch = text.match(/(?:only at|only from|allow(?:ed)? merchants?|allowlist|approved stores?)\s*[:=]?\s*([^.;\n]+)/i);
  const blockedMatch = text.match(/(?:never at|block(?:ed)? merchants?|do not buy from|exclude stores?)\s*[:=]?\s*([^.;\n]+)/i);
  const splitNames = (s?: string) => s ? s.split(/,|\band\b/i).map(x => x.trim()).filter(Boolean).slice(0, 12) : [];
  const allowedMerchants = splitNames(merchantMatch?.[1]);
  const blockedMerchants = splitNames(blockedMatch?.[1]);
  const name = text.length > 54 ? text.slice(0, 51).trimEnd() + "…" : text;

  const needsClarification: string[] = [];
  if (!maxPerTransaction && !monthlyBudget) needsClarification.push("Set a maximum per-purchase amount or a monthly budget.");
  if (/only|allowlist|approved merchants?|never at|block merchants?/i.test(text) && !allowedMerchants.length && !blockedMerchants.length) needsClarification.push("Specify the exact merchant names for your store restrictions.");
  if (currency === "USD" && /₹|inr|rupees?/i.test(text)) needsClarification.push("Confirm the currency; the request contains mixed currency cues.");

  const confidence = needsClarification.length ? "low" : (categories.length || allowedMerchants.length || blockedMerchants.length || approvalAbove || expiresInDays) ? "high" : "medium";
  return {
    name: name || "Shopping mandate",
    purpose: text,
    maxPerTransaction,
    monthlyBudget,
    currency,
    allowedMerchants,
    blockedMerchants,
    categories,
    approvalAbove: approvalAbove && Number.isFinite(approvalAbove) ? approvalAbove : null,
    expiresInDays,
    confidence,
    needsClarification,
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send a valid JSON object." }, { status: 400 }); }
  if (!body || typeof body !== "object" || typeof (body as { text?: unknown }).text !== "string") {
    return NextResponse.json({ error: "A text field is required." }, { status: 422 });
  }
  const text = (body as { text: string }).text.trim();
  if (text.length < 8 || text.length > 1200) return NextResponse.json({ error: "Mandate description must be between 8 and 1,200 characters." }, { status: 422 });
  return NextResponse.json({ mandate: parseMandate(text), parser: "deterministic-v1", requiresReview: true });
}
