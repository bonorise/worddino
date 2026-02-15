import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import roots from "@/lib/data/roots.json";
import { getMockAnalysis } from "@/lib/services/mock-data";
import type { RootDefinition, WordAnalysisResult } from "@/types";

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

function normalizeWord(input: string): string {
  return wordSchema.parse(input).toLowerCase();
}

function findMatchedRoots(normalizedWord: string): RootDefinition[] {
  const matched = rootLibrary
    .filter((item) => normalizedWord.includes(item.text.toLowerCase()))
    .sort((first, second) => second.text.length - first.text.length);

  return matched.slice(0, 3);
}

async function buildAnalysisByAI(
  word: string,
  normalizedWord: string,
  matchedRoots: RootDefinition[],
): Promise<WordAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return getMockAnalysis(word, normalizedWord, matchedRoots);
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
      mnemonicCards: object.mnemonicCards,
      recommendedType: object.recommendedType,
      explanation: object.explanation,
      source: "ai",
    };
  } catch (error: unknown) {
    console.error("analyzer ai fallback to mock:", error);
    return getMockAnalysis(word, normalizedWord, matchedRoots);
  }
}

export async function analyzeWord(rawWord: string): Promise<WordAnalysisResult> {
  const normalizedWord = normalizeWord(rawWord);
  const matchedRoots = findMatchedRoots(normalizedWord);
  return buildAnalysisByAI(rawWord, normalizedWord, matchedRoots);
}
