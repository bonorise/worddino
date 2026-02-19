import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import roots from "@/lib/data/roots.json";
import { getMockAnalysis } from "@/lib/services/mock-data";
import type { MorphemeParseCandidate, RootDefinition, WordAnalysisResult } from "@/types";

const wordSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-zA-Z][a-zA-Z'-]*$/);

const aiResultSchema = z.object({
  mnemonicCards: z
    .array(
      z.object({
        type: z.enum(["homophone", "story", "image"]),
        title: z.string().min(1),
        contentZhCN: z.string().min(1),
        contentEn: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
  recommendedType: z.enum(["homophone", "story", "image"]),
  explanation: z.object({
    zhCN: z.string().min(1),
    en: z.string().min(1),
  }),
});

const rootLibrary = roots as RootDefinition[];
const MAX_PARSE_CANDIDATES = 5;
const MAX_PARSE_PATHS = 120;

function normalizeWord(input: string): string {
  return wordSchema.parse(input).toLowerCase();
}

type ParsePhase = "prefix" | "root" | "suffix";
type MorphemeKind = RootDefinition["kind"];

interface ParseNode {
  definition: RootDefinition;
  start: number;
  end: number;
}

const morphemesByKind: Record<MorphemeKind, RootDefinition[]> = {
  prefix: rootLibrary
    .filter((item) => item.kind === "prefix")
    .sort((first, second) => second.text.length - first.text.length),
  root: rootLibrary
    .filter((item) => item.kind === "root")
    .sort((first, second) => second.text.length - first.text.length),
  suffix: rootLibrary
    .filter((item) => item.kind === "suffix")
    .sort((first, second) => second.text.length - first.text.length),
};

function nextKindsByPhase(phase: ParsePhase): MorphemeKind[] {
  if (phase === "prefix") {
    return ["prefix", "root"];
  }
  if (phase === "root") {
    return ["root", "suffix"];
  }
  return ["suffix"];
}

function scoreCandidate(nodes: ParseNode[]): number {
  const rootCount = nodes.filter((node) => node.definition.kind === "root").length;
  const prefixCount = nodes.filter((node) => node.definition.kind === "prefix").length;
  const suffixCount = nodes.filter((node) => node.definition.kind === "suffix").length;
  const kindDiversity = new Set(nodes.map((node) => node.definition.kind)).size;
  const longestRootLength = Math.max(
    0,
    ...nodes
      .filter((node) => node.definition.kind === "root")
      .map((node) => node.definition.text.length),
  );

  const raw =
    rootCount * 3 +
    kindDiversity * 1.5 +
    prefixCount * 0.7 +
    suffixCount * 0.7 +
    longestRootLength * 0.08 -
    nodes.length * 0.2;
  return Number(raw.toFixed(3));
}

function buildFormula(nodes: ParseNode[]): string {
  return nodes.map((node) => node.definition.text).join(" + ");
}

export function parseMorphemeCandidates(normalizedWord: string): MorphemeParseCandidate[] {
  const memo = new Map<string, ParseNode[][]>();
  const wordLength = normalizedWord.length;

  function dfs(position: number, phase: ParsePhase, hasRoot: boolean): ParseNode[][] {
    if (position === wordLength) {
      return hasRoot ? [[]] : [];
    }

    const key = `${position}|${phase}|${hasRoot ? 1 : 0}`;
    const cached = memo.get(key);
    if (cached) {
      return cached;
    }

    const paths: ParseNode[][] = [];

    outer: for (const kind of nextKindsByPhase(phase)) {
      const matchedAtPosition = morphemesByKind[kind].filter((item) =>
        normalizedWord.startsWith(item.text.toLowerCase(), position),
      );

      for (const definition of matchedAtPosition) {
        const end = position + definition.text.length;
        const node: ParseNode = {
          definition,
          start: position,
          end,
        };

        const nextPhase: ParsePhase =
          kind === "prefix" ? "prefix" : kind === "root" ? "root" : "suffix";
        const tails = dfs(end, nextPhase, hasRoot || kind === "root");

        for (const tail of tails) {
          paths.push([node, ...tail]);
          if (paths.length >= MAX_PARSE_PATHS) {
            break outer;
          }
        }
      }
    }

    memo.set(key, paths);
    return paths;
  }

  const parsed = dfs(0, "prefix", false);
  if (parsed.length === 0) {
    return [];
  }

  const unique = new Map<string, MorphemeParseCandidate>();
  for (const nodes of parsed) {
    const signature = nodes
      .map((node) => `${node.definition.kind}:${node.definition.text}@${node.start}`)
      .join("|");

    if (unique.has(signature)) {
      continue;
    }

    unique.set(signature, {
      formula: buildFormula(nodes),
      score: scoreCandidate(nodes),
      nodes: nodes.map((node) => ({
        ...node.definition,
        start: node.start,
        end: node.end,
      })),
    });
  }

  return Array.from(unique.values())
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const rootDiff =
        b.nodes.filter((node) => node.kind === "root").length -
        a.nodes.filter((node) => node.kind === "root").length;
      if (rootDiff !== 0) {
        return rootDiff;
      }
      if (a.nodes.length !== b.nodes.length) {
        return a.nodes.length - b.nodes.length;
      }
      return a.formula.localeCompare(b.formula);
    })
    .slice(0, MAX_PARSE_CANDIDATES);
}

function findMatchedRoots(
  normalizedWord: string,
  parseCandidates: MorphemeParseCandidate[],
): RootDefinition[] {
  const unique = new Map<string, RootDefinition>();

  const primaryCandidate = parseCandidates[0];
  if (primaryCandidate) {
    for (const node of primaryCandidate.nodes) {
      const key = `${node.kind}:${node.text}`;
      if (!unique.has(key)) {
        unique.set(key, {
          text: node.text,
          kind: node.kind,
          meaning: node.meaning,
          hint: node.hint,
          examples: node.examples,
        });
      }
    }
  }

  const fallback = rootLibrary
    .filter((item) => normalizedWord.includes(item.text.toLowerCase()))
    .sort((first, second) => second.text.length - first.text.length);

  for (const item of fallback) {
    const key = `${item.kind}:${item.text}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
    if (unique.size >= 5) {
      break;
    }
  }

  return Array.from(unique.values()).slice(0, 5);
}

async function buildAnalysisByAI(
  word: string,
  normalizedWord: string,
  matchedRoots: RootDefinition[],
  parseCandidates: MorphemeParseCandidate[],
): Promise<WordAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return getMockAnalysis(word, normalizedWord, matchedRoots, parseCandidates);
  }

  const provider = createOpenAI({ apiKey });
  const modelName = process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini";
  const rootContext =
    matchedRoots.length > 0
      ? matchedRoots
          .map(
            (item) =>
              `${item.text} (${item.kind}) => zh: ${item.meaning.zhCN}, en: ${item.meaning.en}`,
          )
          .join("\n")
      : "no stable morpheme match";

  try {
    const { object } = await generateObject({
      model: provider(modelName),
      schema: aiResultSchema,
      prompt: `
你是英语学习应用 WordDino 的助教。
目标用户是英语初学者，输出要友好、简洁、可记忆。
输入单词：${normalizedWord}
词根匹配上下文：
${rootContext}

请返回：
1) 1-3 条助记卡（type: homophone/story/image）
2) 一个推荐类型
3) 中英解释 explanation

限制：
- 内容儿童友好，不包含暴力、色情、仇恨
- 避免版权角色和品牌 IP
- 仅输出结构化字段
`,
    });

    return {
      word,
      normalizedWord,
      rootFound: matchedRoots.length > 0,
      matchedRoots,
      parseCandidates,
      mnemonicCards: object.mnemonicCards,
      recommendedType: object.recommendedType,
      explanation: object.explanation,
      source: "ai",
    };
  } catch (error: unknown) {
    console.error("analyzer ai fallback to mock:", error);
    return getMockAnalysis(word, normalizedWord, matchedRoots, parseCandidates);
  }
}

export async function analyzeWord(rawWord: string): Promise<WordAnalysisResult> {
  const normalizedWord = normalizeWord(rawWord);
  const parseCandidates = parseMorphemeCandidates(normalizedWord);
  const matchedRoots = findMatchedRoots(normalizedWord, parseCandidates);
  return buildAnalysisByAI(rawWord, normalizedWord, matchedRoots, parseCandidates);
}
