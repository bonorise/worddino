import crypto from "node:crypto";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";

const COOKIE_NAME = "wd_vid";

export function getOrCreateVisitorId(cookiesStore: RequestCookies): string {
  const existing = cookiesStore.get(COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }
  return crypto.randomUUID();
}

export function createFingerprint(visitorId: string, userAgent: string): string {
  const salt = process.env.VOTE_HASH_SALT ?? "worddino-default-salt";
  return crypto
    .createHash("sha256")
    .update(`${visitorId}:${userAgent}:${salt}`)
    .digest("hex");
}

export function getVisitorCookieName() {
  return COOKIE_NAME;
}
