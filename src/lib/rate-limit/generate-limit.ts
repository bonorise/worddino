import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitResult {
  success: boolean;
  reason?: "minute" | "day";
}

const redisReady =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = redisReady
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const minuteLimiter =
  redis !== null
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        prefix: "worddino:gen:min",
      })
    : null;

const dayLimiter =
  redis !== null
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, "1 d"),
        prefix: "worddino:gen:day",
      })
    : null;

const memoryMinuteStore = new Map<string, number[]>();
const memoryDayStore = new Map<string, number[]>();

function pruneAndCount(
  store: Map<string, number[]>,
  key: string,
  windowMs: number,
  limit: number,
): boolean {
  const now = Date.now();
  const list = store.get(key) ?? [];
  const pruned = list.filter((time) => now - time <= windowMs);
  const allowed = pruned.length < limit;
  if (allowed) {
    pruned.push(now);
  }
  store.set(key, pruned);
  return allowed;
}

export async function checkGenerateLimit(
  fingerprint: string,
  slug: string,
): Promise<RateLimitResult> {
  const key = `${fingerprint}:${slug}`;

  if (minuteLimiter && dayLimiter) {
    const [minute, day] = await Promise.all([
      minuteLimiter.limit(key),
      dayLimiter.limit(fingerprint),
    ]);
    if (!minute.success) {
      return { success: false, reason: "minute" };
    }
    if (!day.success) {
      return { success: false, reason: "day" };
    }
    return { success: true };
  }

  const minuteAllowed = pruneAndCount(memoryMinuteStore, key, 60_000, 5);
  if (!minuteAllowed) {
    return { success: false, reason: "minute" };
  }
  const dayAllowed = pruneAndCount(memoryDayStore, fingerprint, 24 * 60 * 60_000, 50);
  if (!dayAllowed) {
    return { success: false, reason: "day" };
  }

  return { success: true };
}
