import seedMorphemes from "../../../data/morphemes.seed.json";
import type { MorphemeItem } from "../types";

interface SeedMorpheme {
  kind: "prefix" | "root" | "suffix";
  text: string;
  meaning: {
    "zh-CN": string;
    en: string;
  };
  pronunciationHint?: string;
}

const normalizedSeed = (seedMorphemes as SeedMorpheme[]).map((item) => ({
  ...item,
  text: item.text.toLowerCase(),
}));

export function getSeedMorphemes() {
  return normalizedSeed;
}

export function matchMorphemesByWord(slug: string): MorphemeItem[] {
  const lower = slug.toLowerCase();
  const prefixes = normalizedSeed
    .filter((item) => item.kind === "prefix" && lower.startsWith(item.text))
    .sort((a, b) => b.text.length - a.text.length);
  const suffixes = normalizedSeed
    .filter((item) => item.kind === "suffix" && lower.endsWith(item.text))
    .sort((a, b) => b.text.length - a.text.length);
  const roots = normalizedSeed
    .filter((item) => item.kind === "root" && lower.includes(item.text))
    .sort((a, b) => b.text.length - a.text.length);

  const chosen: SeedMorpheme[] = [];
  if (prefixes[0]) {
    chosen.push(prefixes[0]);
  }
  if (roots[0]) {
    chosen.push(roots[0]);
  }
  if (suffixes[0]) {
    chosen.push(suffixes[0]);
  }

  const unique = new Map<string, SeedMorpheme>();
  for (const item of chosen) {
    unique.set(item.text, item);
  }

  return Array.from(unique.values()).map((item) => ({
    text: item.text,
    kind: item.kind,
    meaning: item.meaning,
    pronunciationHint: item.pronunciationHint,
  }));
}

const familyMap: Record<string, string[]> = {
  port: [
    "transport",
    "import",
    "export",
    "portable",
    "report",
    "support",
    "portfolio",
    "opportune",
  ],
  spect: [
    "inspect",
    "respect",
    "expect",
    "prospect",
    "retrospect",
    "spectrum",
    "spectator",
    "introspect",
  ],
  struct: [
    "construct",
    "instruct",
    "destruct",
    "structure",
    "instruction",
    "restructure",
    "obstruct",
    "constructor",
  ],
};

export function getFamilyByRoot(rootText: string): string[] {
  return familyMap[rootText.toLowerCase()] ?? [];
}
