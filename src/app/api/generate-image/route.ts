import { NextResponse } from "next/server";
import { z } from "zod";

const imageRequestSchema = z.object({
  prompt: z.string().trim().min(6),
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json<GenerateImageResponse>(
        {
          ok: false,
          status: "disabled",
          message:
            "Image generation is disabled. Set OPENAI_API_KEY in .env to enable later.",
        },
        { status: 501 },
      );
    }

    return NextResponse.json<GenerateImageResponse>({
      ok: true,
      status: "placeholder",
      message: "Image API skeleton is ready. Real image generation will be implemented next.",
      prompt: body.prompt,
      imageUrl: null,
    });
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
        message: "Image API failed.",
      },
      { status: 500 },
    );
  }
}
