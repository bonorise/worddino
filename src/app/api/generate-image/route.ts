import { NextResponse } from "next/server";
import { z } from "zod";

const imageRequestSchema = z.object({
  prompt: z.string().trim().min(6),
  locale: z.enum(["zh-CN", "en"]).optional(),
});

interface GenerateImageResponse {
  ok: boolean;
  status: "placeholder" | "disabled";
  message: string;
  prompt?: string;
  imageUrl?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = imageRequestSchema.parse((await request.json()) as unknown);

    return NextResponse.json<GenerateImageResponse>(
      {
        ok: false,
        status: "disabled",
        message: "Image generation is not enabled in this launch version.",
        prompt: body.prompt,
        imageUrl: null,
      },
      { status: 501 },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<GenerateImageResponse>(
        {
          ok: false,
          status: "disabled",
          message: "Invalid request: prompt must be at least 6 characters.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json<GenerateImageResponse>(
      {
        ok: false,
        status: "disabled",
        message: "Image API is unavailable.",
      },
      { status: 500 },
    );
  }
}
