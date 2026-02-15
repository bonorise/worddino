import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { InvalidSlugError, normalizeSlug } from "@/lib/slug";
import { getWordBySlug, upsertVote } from "@/lib/word/repository";
import {
  createFingerprint,
  getOrCreateVisitorId,
  getVisitorCookieName,
} from "@/lib/vote/fingerprint";

const voteBodySchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = normalizeSlug(rawSlug);
    const body = voteBodySchema.parse(await request.json());

    const cookiesStore = await cookies();
    const headersStore = await headers();
    const visitorId = getOrCreateVisitorId(cookiesStore);
    const userAgent = headersStore.get("user-agent") ?? "unknown";
    const fingerprint = createFingerprint(visitorId, userAgent);

    const current = await getWordBySlug(slug, fingerprint);
    if (!current) {
      return NextResponse.json({ message: "word not found" }, { status: 404 });
    }

    const voted = await upsertVote(slug, body.value, fingerprint);
    const response = NextResponse.json(voted);
    response.cookies.set(getVisitorCookieName(), visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof InvalidSlugError) {
      return NextResponse.json({ message: "invalid slug" }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "invalid vote body" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ message: "internal error" }, { status: 500 });
  }
}
