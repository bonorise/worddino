import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AnalyzeAuthError,
  AnalyzeConfigError,
  AnalyzeRateLimitError,
  AnalyzeResponseInvalidError,
  AnalyzeUpstreamError,
} from "@/lib/services/analyze-errors";
import { analyzeWord } from "@/lib/services/analyzer";

const originalEnv = { ...process.env };

describe("analyzeWord", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(analyzeWord("transport", "zh-CN")).rejects.toBeInstanceOf(
      AnalyzeConfigError,
    );
    await expect(analyzeWord("transport", "zh-CN")).rejects.toMatchObject({
      code: "AI_CONFIG_ERROR",
      status: 500,
      retryable: false,
    });
  });

  it("maps 401 responses to auth errors", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );

    await expect(analyzeWord("transport", "en")).rejects.toBeInstanceOf(
      AnalyzeAuthError,
    );
    await expect(analyzeWord("transport", "en")).rejects.toMatchObject({
      code: "AI_AUTH_ERROR",
      retryable: false,
      upstreamStatus: 401,
    });
  });

  it("maps 429 responses to rate limit errors", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
    );

    await expect(analyzeWord("transport", "en")).rejects.toBeInstanceOf(
      AnalyzeRateLimitError,
    );
    await expect(analyzeWord("transport", "en")).rejects.toMatchObject({
      code: "AI_RATE_LIMITED",
      status: 429,
      retryable: true,
      upstreamStatus: 429,
    });
  });

  it("maps 5xx responses to upstream errors", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 503 })),
    );

    await expect(analyzeWord("transport", "en")).rejects.toBeInstanceOf(
      AnalyzeUpstreamError,
    );
    await expect(analyzeWord("transport", "en")).rejects.toMatchObject({
      code: "AI_UPSTREAM_ERROR",
      status: 503,
      retryable: true,
      upstreamStatus: 503,
    });
  });

  it("maps invalid 200 responses to response-invalid errors", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    );

    await expect(analyzeWord("transport", "en")).rejects.toBeInstanceOf(
      AnalyzeResponseInvalidError,
    );
    await expect(analyzeWord("transport", "en")).rejects.toMatchObject({
      code: "AI_RESPONSE_INVALID",
      status: 502,
      retryable: true,
    });
  });

  it("calls Gemini generateContent and returns structured locale-specific analysis", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL_TEXT = "gemini-2.5-flash";

    const geminiPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  explanation: "To transport means to move people or things from one place to another.",
                  scene: "Picture a truck carrying boxes across a bridge.",
                  formula: "across + carry = transport",
                  hook: "Remember transport as carrying something across distance.",
                  decomposable: true,
                  morphemes: [
                    {
                      text: "trans",
                      kind: "prefix",
                      meaning: "across",
                    },
                    {
                      text: "port",
                      kind: "root",
                      meaning: "carry",
                    },
                  ],
                  mnemonics: [
                    {
                      type: "story",
                      title: "Story",
                      content: "Imagine carrying a package across a river.",
                    },
                  ],
                  recommendedType: "story",
                  examples: ["Buses transport students to school every day."],
                  familyWords: ["portable", "export", "import"],
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(geminiPayload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeWord("Transport", "en");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-goog-api-key": "test-gemini-key",
        }),
      }),
    );

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      generationConfig: {
        responseMimeType: string;
        responseJsonSchema: Record<string, unknown>;
      };
      contents: Array<{ parts: Array<{ text: string }> }>;
    };

    expect(requestBody.generationConfig.responseMimeType).toBe("application/json");
    expect(requestBody.generationConfig.responseJsonSchema).toBeTruthy();
    expect(requestBody.contents[0]?.parts[0]?.text).toContain("Locale: en");
    expect(requestBody.contents[0]?.parts[0]?.text).toContain(
      "Add scene as one vivid, concrete sentence describing the easiest mental image of the word.",
    );

    expect(result).toEqual({
      word: "transport",
      normalizedWord: "transport",
      locale: "en",
      decomposable: true,
      explanation: "To transport means to move people or things from one place to another.",
      scene: "Picture a truck carrying boxes across a bridge.",
      formula: "across + carry = transport",
      hook: "Remember transport as carrying something across distance.",
      morphemes: [
        {
          text: "trans",
          kind: "prefix",
          meaning: "across",
        },
        {
          text: "port",
          kind: "root",
          meaning: "carry",
        },
      ],
      mnemonics: [
        {
          type: "story",
          title: "Story",
          content: "Imagine carrying a package across a river.",
        },
      ],
      recommendedType: "story",
      examples: ["Buses transport students to school every day."],
      familyWords: ["portable", "export", "import"],
      source: "gemini",
    });
  });
});
