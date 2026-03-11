export type AnalyzeLocale = "zh-CN" | "en";
export type AnalyzeErrorCode =
  | "INVALID_REQUEST"
  | "AI_CONFIG_ERROR"
  | "AI_AUTH_ERROR"
  | "AI_RATE_LIMITED"
  | "AI_UPSTREAM_ERROR"
  | "AI_RESPONSE_INVALID";

export interface MorphemeItem {
  text: string;
  kind: "prefix" | "root" | "suffix";
  meaning: string;
}

export interface MnemonicCardData {
  type: "homophone" | "story" | "image";
  title: string;
  content: string;
}

export interface WordAnalysisResult {
  word: string;
  normalizedWord: string;
  locale: AnalyzeLocale;
  decomposable: boolean;
  explanation: string;
  scene?: string;
  formula?: string;
  hook?: string;
  morphemes: MorphemeItem[];
  mnemonics: MnemonicCardData[];
  recommendedType: "homophone" | "story" | "image";
  examples: string[];
  familyWords: string[];
  source: "gemini";
}

export interface AnalyzeSuccessResponse {
  ok: true;
  data: WordAnalysisResult;
}

export interface AnalyzeErrorResponse {
  ok: false;
  code: AnalyzeErrorCode;
  message: string;
  retryable: boolean;
}

export type AnalyzeApiResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;
