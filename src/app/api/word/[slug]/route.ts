import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { InvalidSlugError, normalizeSlug } from "@/lib/slug";
import { getWordBySlug } from "@/lib/word/repository";
import {
  createFingerprint,
  getOrCreateVisitorId,
  getVisitorCookieName,
} from "@/lib/vote/fingerprint";
import type { WordApiResponse } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = normalizeSlug(rawSlug);
    const cookiesStore = await cookies();
    const headersStore = await headers();
    const visitorId = getOrCreateVisitorId(cookiesStore);
    const userAgent = headersStore.get("user-agent") ?? "unknown";
    const fingerprint = createFingerprint(visitorId, userAgent);
    const word = await getWordBySlug(slug, fingerprint);

    const response: WordApiResponse = !word
      ? { status: "not_found" }
      : word.status === "ready"
        ? { status: "ready", word }
        : word.status === "generating"
          ? { status: "generating", word }
          : word.status === "error"
            ? { status: "error", word }
            : { status: "not_found" };

    const nextResponse = NextResponse.json(response);
    nextResponse.cookies.set(getVisitorCookieName(), visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return nextResponse;
  } catch (error: unknown) {
    if (error instanceof InvalidSlugError) {
      return NextResponse.json<WordApiResponse>(
        {
          status: "not_found",
        },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json<WordApiResponse>(
      {
        status: "error",
      },
      { status: 500 },
    );
  }
}
