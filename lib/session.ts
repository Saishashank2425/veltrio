import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "veltrio_session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getSessionId(request: NextRequest): { id: string; isNew: boolean } {
  const value = request.cookies.get(COOKIE_NAME)?.value;
  return value && UUID_PATTERN.test(value) ? { id: value, isNew: false } : { id: randomUUID(), isNew: true };
}

export function setSessionCookie(response: NextResponse, session: { id: string; isNew: boolean }): NextResponse {
  if (session.isNew) response.cookies.set(COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
