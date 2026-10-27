import { NextRequest, NextResponse } from "next/server";
import { recordSpend } from "@/lib/gateway";
import { getPayPalAccessToken, paypalConfigured, paypalRequest } from "@/lib/paypal";

type PayPalOrder = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    custom_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: Array<{ id?: string; status?: string; amount?: { value?: string; currency_code?: string } }> };
  }>;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid JSON body." }, { status: 400 });
  }

  const orderId = body && typeof body === "object" ? (body as Record<string, unknown>).orderId : null;
  if (typeof orderId !== "string" || !/^[A-Z0-9-]{8,80}$/i.test(orderId)) {
    return NextResponse.json({ error: "A valid PayPal sandbox order ID is required." }, { status: 422 });
  }
  if (!paypalConfigured()) {
    return NextResponse.json({ configured: false, error: "PayPal sandbox is not configured." }, { status: 503 });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const existing = await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, accessToken);
    const unit = existing.purchase_units?.[0];
    if (!unit?.custom_id?.startsWith("veltrio-demo|")) {
      return NextResponse.json({ error: "This order was not created by the Veltrio demo." }, { status: 403 });
    }
    if (unit.amount?.currency_code !== "USD" || !unit.amount.value) {
      return NextResponse.json({ error: "Order currency or amount is not supported by this demo." }, { status: 422 });
    }

    // A completed order is idempotently acknowledged; never record its spend twice.
    if (existing.status === "COMPLETED") {
      return NextResponse.json({
        configured: true,
        status: "COMPLETED",
        orderId,
        amount: unit.amount.value,
        currency: "USD",
        alreadyCaptured: true,
        message: "This sandbox order was already captured.",
      });
    }
    if (existing.status !== "APPROVED") {
      return NextResponse.json({ error: `Order is not approved for capture (status: ${existing.status ?? "unknown"}).` }, { status: 409 });
    }

    const captured = await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, accessToken, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const captureUnit = captured.purchase_units?.[0];
    const capture = captureUnit?.payments?.captures?.find((item) => item.status === "COMPLETED");
    if (captured.status !== "COMPLETED" || !capture) {
      return NextResponse.json({
        status: captured.status ?? "UNKNOWN",
        orderId,
        message: "PayPal did not confirm a completed sandbox capture. Spend was not recorded.",
      }, { status: 409 });
    }

    const category = unit.custom_id.split("|").slice(1).join("|");
    const amount = Number(capture.amount?.value ?? unit.amount.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "PayPal returned an invalid captured amount." }, { status: 502 });
    }
    recordSpend(category, amount);

    return NextResponse.json({
      configured: true,
      status: "COMPLETED",
      orderId,
      captureId: capture.id ?? null,
      amount: amount.toFixed(2),
      currency: capture.amount?.currency_code ?? "USD",
      alreadyCaptured: false,
      message: "PayPal sandbox confirmed the capture. The demo spend counter has been updated.",
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to capture the PayPal sandbox order.",
    }, { status: 502 });
  }
}
