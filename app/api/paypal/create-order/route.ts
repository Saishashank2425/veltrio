import { NextRequest, NextResponse } from "next/server";
import { validateProposal, type PurchaseProposal } from "@/lib/gateway";
import { authorizePersisted } from "@/lib/persistence";
import { getSessionId, setSessionCookie } from "@/lib/session";
import { getPayPalAccessToken, paypalConfigured, paypalRequest } from "@/lib/paypal";

type PayPalOrder = {
  id?: string;
  status?: string;
  links?: Array<{ rel?: string; href?: string; method?: string }>;
};

export async function POST(request: NextRequest) {
  const session = getSessionId(request);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid JSON body." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const validation = validateProposal(record.proposal);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 422 });

  const proposal: PurchaseProposal = validation.proposal;
  if (proposal.currency && proposal.currency !== "USD") {
    return NextResponse.json({ error: "The PayPal sandbox demo currently accepts USD proposals only." }, { status: 422 });
  }
  if (proposal.amount > 500) {
    return NextResponse.json({ error: "The sandbox demo caps order amounts at $500." }, { status: 422 });
  }

  // Always evaluate policy first. The spend counter is updated only after capture succeeds.
  let decision;
  try { decision = await authorizePersisted(session.id, proposal, { recordSpend: false }); }
  catch (error) {
    console.error("Checkout authorization persistence failed:", error instanceof Error ? error.message : "unknown error");
    return setSessionCookie(NextResponse.json({ error: "Authorization is temporarily unavailable. No PayPal order was created." }, { status: 503 }), session);
  }
  if (decision.decision !== "ALLOW") {
    return setSessionCookie(NextResponse.json({
      configured: paypalConfigured(),
      decision: decision.decision,
      authorization: decision,
      message: decision.decision === "BLOCK"
        ? "Veltrio blocked this proposal. No PayPal order was created."
        : "Veltrio requires human review. No PayPal order was created.",
    }, { status: 200 }), session);
  }

  if (!paypalConfigured()) {
    return setSessionCookie(NextResponse.json({
      configured: false,
      decision: decision.decision,
      authorization: decision,
      message: "The policy allowed this proposal, but PayPal sandbox is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Render to enable checkout.",
    }, { status: 200 }), session);
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const itemName = typeof record.itemName === "string" ? record.itemName.trim().slice(0, 120) : proposal.description;
    const category = proposal.category.replace(/[^a-zA-Z0-9 &_-]/g, "").slice(0, 60) || "Operating Expenses";
    const order = await paypalRequest<PayPalOrder>("/v2/checkout/orders", accessToken, {
      method: "POST",
      headers: { "PayPal-Request-Id": `veltrio-${crypto.randomUUID()}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: "veltrio-policy-approved-demo",
          custom_id: `veltrio-demo|${category}|${decision.auditId}`,
          description: itemName || "Veltrio sandbox demo purchase",
          amount: {
            currency_code: "USD",
            value: proposal.amount.toFixed(2),
          },
        }],
        application_context: {
          brand_name: "Veltrio Sandbox Demo",
          user_action: "PAY_NOW",
          return_url: `${origin}/checkout?flow=return`,
          cancel_url: `${origin}/checkout?flow=cancelled`,
        },
      }),
    });

    const approvalUrl = order.links?.find((link) => link.rel === "approve" && link.href)?.href;
    if (!order.id || !approvalUrl) {
      return setSessionCookie(NextResponse.json({ error: "PayPal created an order without an approval link. Please retry." }, { status: 502 }), session);
    }

    return setSessionCookie(NextResponse.json({
      configured: true,
      decision: "ALLOW",
      authorization: decision,
      orderId: order.id,
      approvalUrl,
      message: "Policy allowed this proposal. Continue to PayPal's sandbox approval page; this does not use real money.",
    }), session);
  } catch (error) {
    return setSessionCookie(NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to create a PayPal sandbox order.",
      authorization: decision,
    }, { status: 502 }), session);
  }
}
