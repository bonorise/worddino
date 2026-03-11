import { AnalyzeConfigError } from "@/lib/services/analyze-errors";

export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL_TEXT?.trim() || "gemini-2.5-flash";

  if (!apiKey) {
    throw new AnalyzeConfigError();
  }

  return {
    apiKey,
    model,
  };
}
