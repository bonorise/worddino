import { beforeEach, describe, expect, it, vi } from "vitest";

const { analyzeWord } = vi.hoisted(() => ({
  analyzeWord: vi.fn(),
}));

vi.mock("@/lib/services/analyzer", () => ({
  analyzeWord,
}));

import { POST } from "@/app/api/analyze/route";

describe("POST /api/analyze", () => {
  beforeEach(() => {
    analyzeWord.mockReset();
  });

  it("rejects requests without locale", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: "transport" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { ok: boolean; message: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(analyzeWord).not.toHaveBeenCalled();
  });

  it("rejects invalid locale values", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: "transport", locale: "fr" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { ok: boolean; message: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(analyzeWord).not.toHaveBeenCalled();
  });

  it("accepts zh-CN locale and forwards it to analyzer", async () => {
    analyzeWord.mockResolvedValue({
      word: "transport",
      normalizedWord: "transport",
      locale: "zh-CN",
      decomposable: true,
      explanation: "运输",
      morphemes: [],
      mnemonics: [],
      recommendedType: "story",
      examples: [],
      familyWords: [],
      source: "gemini",
    });

    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: "transport", locale: "zh-CN" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(analyzeWord).toHaveBeenCalledWith("transport", "zh-CN");
  });

  it("accepts en locale and forwards it to analyzer", async () => {
    analyzeWord.mockResolvedValue({
      word: "transport",
      normalizedWord: "transport",
      locale: "en",
      decomposable: true,
      explanation: "to transport",
      morphemes: [],
      mnemonics: [],
      recommendedType: "story",
      examples: [],
      familyWords: [],
      source: "gemini",
    });

    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: "transport", locale: "en" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(analyzeWord).toHaveBeenCalledWith("transport", "en");
  });
});
