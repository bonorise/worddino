export type AnalyzeLocale = "zh-CN" | "en";

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
  message: string;
}

export type AnalyzeApiResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;
