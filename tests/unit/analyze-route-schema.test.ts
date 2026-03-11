import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AnalyzeConfigError,
  AnalyzeRateLimitError,
  AnalyzeResponseInvalidError,
  AnalyzeUpstreamError,
} from "@/lib/services/analyze-errors";

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
    vi.restoreAllMocks();
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
    const payload = (await response.json()) as {
      ok: boolean;
      code: string;
      message: string;
      retryable: boolean;
    };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("INVALID_REQUEST");
    expect(payload.retryable).toBe(false);
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
    const payload = (await response.json()) as {
      ok: boolean;
      code: string;
      message: string;
      retryable: boolean;
    };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("INVALID_REQUEST");
    expect(payload.retryable).toBe(false);
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

  it("maps upstream failures to structured error payload and logs context", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    analyzeWord.mockRejectedValue(new AnalyzeUpstreamError(503));

    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: "transport", locale: "en" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      ok: boolean;
      code: string;
      message: string;
      retryable: boolean;
    };

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      ok: false,
      code: "AI_UPSTREAM_ERROR",
      message: "AI 服务暂时不可用，请稍后重试",
      retryable: true,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "analyze_failed",
      expect.objectContaining({
        word: "transport",
        locale: "en",
        code: "AI_UPSTREAM_ERROR",
        status: 503,
        upstreamStatus: 503,
        retryable: true,
      }),
    );
  });

  it("maps config failures to non-retryable 500 errors", async () => {
    analyzeWord.mockRejectedValue(new AnalyzeConfigError());

    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: "transport", locale: "zh-CN" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      ok: boolean;
      code: string;
      message: string;
      retryable: boolean;
    };

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      ok: false,
      code: "AI_CONFIG_ERROR",
      message: "AI 服务配置异常，暂时无法分析",
      retryable: false,
    });
  });

  it("maps rate limiting to retryable 429 errors", async () => {
    analyzeWord.mockRejectedValue(new AnalyzeRateLimitError(429));

    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: "transport", locale: "zh-CN" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      ok: boolean;
      code: string;
      message: string;
      retryable: boolean;
    };

    expect(response.status).toBe(429);
    expect(payload).toEqual({
      ok: false,
      code: "AI_RATE_LIMITED",
      message: "当前请求较多，请稍后重试",
      retryable: true,
    });
  });

  it("maps invalid gemini responses to retryable 502 errors", async () => {
    analyzeWord.mockRejectedValue(new AnalyzeResponseInvalidError());

    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: "transport", locale: "zh-CN" }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      ok: boolean;
      code: string;
      message: string;
      retryable: boolean;
    };

    expect(response.status).toBe(502);
    expect(payload).toEqual({
      ok: false,
      code: "AI_RESPONSE_INVALID",
      message: "AI 返回结果异常，请稍后重试",
      retryable: true,
    });
  });
});
