import { NextResponse } from "next/server";
import { resetDemoState } from "@/lib/gateway";

/** Reset only in-memory demo counters and audit history; not a production control. */
export async function POST() {
  resetDemoState();
  return NextResponse.json({ ok: true, message: "Demo state reset." });
}
