import { geminiAnalysisJsonSchema, geminiAnalysisSchema } from "@/lib/ai/gemini-schema";
import { getGeminiConfig } from "@/lib/config/env";
import { normalizeSlug } from "@/lib/slug";
import {
  AnalyzeAuthError,
  AnalyzeRateLimitError,
  AnalyzeResponseInvalidError,
  AnalyzeServiceError,
  AnalyzeUpstreamError,
} from "@/lib/services/analyze-errors";
import type { AnalyzeLocale, WordAnalysisResult } from "@/types";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function buildPrompt(word: string, locale: AnalyzeLocale): string {
  const languageInstruction =
    locale === "zh-CN"
      ? "Use Simplified Chinese for all natural-language fields."
      : "Use English for all natural-language fields.";

  return [
    "You are generating beginner-friendly word learning content for WordDino.",
    `Locale: ${locale}`,
    languageInstruction,
    `Target word: ${word}`,
    "Return valid JSON only.",
    "Explain the word simply.",
    "Add scene as one vivid, concrete sentence describing the easiest mental image of the word.",
    "Add formula as one short memory formula.",
    "Add hook as one short sentence that helps the learner remember the word.",
    "If the word is not reliably decomposable, set decomposable to false and return morphemes as [].",
    "Even if decomposable is false, scene, formula, and hook may still be returned.",
    "Keep familyWords to close and common related words only.",
    "Keep examples to at most 2 sentences.",
    "Keep mnemonics to at most 3 items.",
    "Avoid philosophical, poetic, or inspirational tone.",
    "Do not invent etymology.",
    "Do not use markdown.",
  ].join("\n");
}

function extractGeminiText(payload: GeminiGenerateContentResponse): string {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim() ?? "")
    .find((part) => part.length > 0);

  if (!text) {
    throw new AnalyzeResponseInvalidError();
  }

  return text;
}

async function requestGemini(word: string, locale: AnalyzeLocale) {
  const { apiKey, model } = getGeminiConfig();
  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildPrompt(word, locale),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: geminiAnalysisJsonSchema,
          },
        }),
      },
    );
  } catch (error: unknown) {
    throw new AnalyzeUpstreamError(undefined, error);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AnalyzeAuthError(response.status);
    }
    if (response.status === 429) {
      throw new AnalyzeRateLimitError(response.status);
    }
    throw new AnalyzeUpstreamError(response.status);
  }

  try {
    return (await response.json()) as GeminiGenerateContentResponse;
  } catch (error: unknown) {
    throw new AnalyzeResponseInvalidError(response.status, error);
  }
}

export async function analyzeWord(
  word: string,
  locale: AnalyzeLocale,
): Promise<WordAnalysisResult> {
  const normalizedWord = normalizeSlug(word);
  const payload = await requestGemini(normalizedWord, locale);
  let parsed: ReturnType<typeof geminiAnalysisSchema.parse>;

  try {
    const jsonText = extractGeminiText(payload);
    parsed = geminiAnalysisSchema.parse(JSON.parse(jsonText) as unknown);
  } catch (error: unknown) {
    if (error instanceof AnalyzeServiceError) {
      throw error;
    }
    throw new AnalyzeResponseInvalidError(undefined, error);
  }

  return {
    word: normalizedWord,
    normalizedWord,
    locale,
    explanation: parsed.explanation,
    scene: parsed.scene,
    formula: parsed.formula,
    hook: parsed.hook,
    decomposable: parsed.decomposable,
    morphemes: parsed.morphemes,
    mnemonics: parsed.mnemonics.map((item) => ({
      type: item.type,
      title: item.title,
      content: item.content,
    })),
    recommendedType: parsed.recommendedType,
    examples: parsed.examples,
    familyWords: parsed.familyWords,
    source: "gemini",
  };
}
