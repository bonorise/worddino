import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWord } from "@/lib/services/analyzer";
import { isAnalyzeServiceError } from "@/lib/services/analyze-errors";
import type { AnalyzeErrorResponse, AnalyzeSuccessResponse } from "@/types";

const requestSchema = z.object({
  word: z.string().trim().min(1),
  locale: z.enum(["zh-CN", "en"]),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof requestSchema> | null = null;

  try {
    const json = (await request.json()) as unknown;
    payload = requestSchema.parse(json);
    const data = await analyzeWord(payload.word, payload.locale);

    return NextResponse.json<AnalyzeSuccessResponse>({
      ok: true,
      data,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<AnalyzeErrorResponse>(
        {
          ok: false,
          code: "INVALID_REQUEST",
          message: "Invalid request: word is required",
          retryable: false,
        },
        { status: 400 },
      );
    }

    if (isAnalyzeServiceError(error)) {
      console.error("analyze_failed", {
        word: payload?.word ?? null,
        locale: payload?.locale ?? null,
        code: error.code,
        status: error.status,
        upstreamStatus: error.upstreamStatus ?? null,
        retryable: error.retryable,
      });

      return NextResponse.json<AnalyzeErrorResponse>(
        {
          ok: false,
          code: error.code,
          message: error.publicMessage,
          retryable: error.retryable,
        },
        { status: error.status },
      );
    }

    return NextResponse.json<AnalyzeErrorResponse>(
      {
        ok: false,
        code: "AI_UPSTREAM_ERROR",
        message: "AI 服务暂时不可用，请稍后重试",
        retryable: true,
      },
      { status: 500 },
    );
  }
}
