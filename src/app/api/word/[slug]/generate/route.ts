import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { InvalidSlugError, normalizeSlug } from "@/lib/slug";
import { checkGenerateLimit } from "@/lib/rate-limit/generate-limit";
import { generateWordIfNeeded } from "@/lib/word/service";
import {
  createFingerprint,
  getOrCreateVisitorId,
  getVisitorCookieName,
} from "@/lib/vote/fingerprint";
import type { GenerateResponse } from "@/lib/types";

export async function POST(
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

    const limit = await checkGenerateLimit(fingerprint, slug);
    if (!limit.success) {
      const response = NextResponse.json<GenerateResponse>(
        {
          status: "error",
        },
        { status: 429 },
      );
      response.cookies.set(getVisitorCookieName(), visitorId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }

    const result = await generateWordIfNeeded(slug);
    const statusCode = result.status === "generating" ? 202 : 200;
    const response = NextResponse.json<GenerateResponse>(
      result.status === "ready"
        ? { status: "ready", word: result.word }
        : { status: result.status },
      { status: statusCode },
    );

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
      return NextResponse.json<GenerateResponse>(
        {
          status: "error",
        },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json<GenerateResponse>(
      {
        status: "error",
      },
      { status: 500 },
    );
  }
}
