import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

    await expect(analyzeWord("transport", "zh-CN")).rejects.toThrow(
      /GEMINI_API_KEY/,
    );
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

    expect(result).toEqual({
      word: "transport",
      normalizedWord: "transport",
      locale: "en",
      decomposable: true,
      explanation: "To transport means to move people or things from one place to another.",
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
