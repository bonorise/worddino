import { geminiAnalysisJsonSchema, geminiAnalysisSchema } from "@/lib/ai/gemini-schema";
import { normalizeSlug } from "@/lib/slug";
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

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return apiKey;
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL_TEXT ?? "gemini-2.5-flash";
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
    throw new Error("Gemini returned no text content");
  }

  return text;
}

async function requestGemini(word: string, locale: AnalyzeLocale) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModel()}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": getGeminiApiKey(),
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

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  return (await response.json()) as GeminiGenerateContentResponse;
}

export async function analyzeWord(
  word: string,
  locale: AnalyzeLocale,
): Promise<WordAnalysisResult> {
  const normalizedWord = normalizeSlug(word);
  const payload = await requestGemini(normalizedWord, locale);
  const jsonText = extractGeminiText(payload);
  const parsed = geminiAnalysisSchema.parse(JSON.parse(jsonText) as unknown);

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
