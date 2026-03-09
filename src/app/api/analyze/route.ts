import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWord } from "@/lib/services/analyzer";
import type { AnalyzeErrorResponse, AnalyzeSuccessResponse } from "@/types";

const requestSchema = z.object({
  word: z.string().trim().min(1),
  locale: z.enum(["zh-CN", "en"]),
});

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const payload = requestSchema.parse(json);
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
          message: "Invalid request: word is required",
        },
        { status: 400 },
      );
    }

    return NextResponse.json<AnalyzeErrorResponse>(
      {
        ok: false,
        message: "Analyze failed, please try again later",
      },
      { status: 500 },
    );
  }
}
