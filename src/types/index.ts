export interface RootDefinition {
  text: string;
  kind: "prefix" | "root" | "suffix";
  meaning: {
    zhCN: string;
    en: string;
  };
  hint?: string;
  examples: string[];
}

export interface MnemonicCardData {
  type: "homophone" | "story" | "image";
  title: string;
  contentZhCN: string;
  contentEn: string;
}

export interface WordAnalysisResult {
  word: string;
  normalizedWord: string;
  rootFound: boolean;
  matchedRoots: RootDefinition[];
  mnemonicCards: MnemonicCardData[];
  recommendedType: "homophone" | "story" | "image";
  explanation: {
    zhCN: string;
    en: string;
  };
  source: "mock" | "ai";
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
