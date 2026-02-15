export type LocaleCode = "zh-CN" | "en";

export type WordStatus = "ready" | "generating" | "error" | "stub";

export type MorphemeKind = "prefix" | "root" | "suffix";

export type VoteValue = 1 | -1;

export type MnemonicType = "homophone" | "image" | "story";

export interface LocalizedText {
  "zh-CN": string;
  en: string;
}

export interface MorphemeItem {
  text: string;
  kind: MorphemeKind;
  meaning: LocalizedText;
  pronunciationHint?: string;
}

export interface MnemonicItem extends LocalizedText {
  type: MnemonicType;
}

export interface Mnemonics {
  recommended: MnemonicType;
  items: MnemonicItem[];
}

export interface ExampleItem {
  en: string;
  "zh-CN": string;
}

export interface FamilyItem {
  word: string;
  gloss: LocalizedText;
}

export interface WordDetail {
  slug: string;
  display: string;
  status: WordStatus;
  decomposable: boolean;
  ipa: string | null;
  pos: string | null;
  gloss: LocalizedText;
  mnemonics: Mnemonics;
  examples: ExampleItem[];
  imagePrompt: string | null;
  morphemes: MorphemeItem[];
  family: FamilyItem[];
  voteUp: number;
  voteDown: number;
  userVote: VoteValue | 0;
}

export interface WordApiResponse {
  status: "ready" | "generating" | "not_found" | "error";
  word?: WordDetail;
}

export interface GenerateResponse {
  status: "ready" | "generating" | "error";
  word?: WordDetail;
}
