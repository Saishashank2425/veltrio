import { NextResponse } from "next/server";

/** Persistent mandate, decision, and spend history is intentionally not resettable from a public endpoint. */
export async function POST() {
  return NextResponse.json({ error: "Persistent authorization and spend history cannot be reset through the public demo API." }, { status: 410 });
}
