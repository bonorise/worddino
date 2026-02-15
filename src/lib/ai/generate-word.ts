import OpenAI from "openai";
import { generatedWordSchema, type GeneratedWord } from "./schema";
import { getFamilyByRoot, matchMorphemesByWord } from "../data/morphemes";

function fallbackGeneratedWord(slug: string): GeneratedWord {
  const morphemes = matchMorphemesByWord(slug);
  const root = morphemes.find((item) => item.kind === "root");
  const familyWords = root ? getFamilyByRoot(root.text) : [];
  const recommended = morphemes.length > 0 ? "story" : "homophone";

  return {
    word: slug,
    ipa: null,
    pos: null,
    gloss: {
      "zh-CN": `${slug}（AI 参考释义，请核验）`,
      en: `${slug} (AI reference definition, verify with dictionary)`,
    },
    decomposable: morphemes.length > 0,
    morphemes,
    mnemonics: {
      recommended,
      items: [
        {
          type: "homophone",
          "zh-CN": `把 ${slug} 拆成你熟悉的发音片段，配一个固定画面帮助回忆。`,
          en: `Split ${slug} into familiar sounds and bind them to one stable image.`,
        },
        {
          type: "image",
          "zh-CN": `想象一只恐龙在化石博物馆里举着写有 ${slug} 的标牌。`,
          en: `Imagine a dino in a fossil museum holding a sign of ${slug}.`,
        },
        {
          type: "story",
          "zh-CN": `在“语言考古营地”里，主角通过 ${slug} 的线索找到词义宝藏。`,
          en: `In a language archaeology camp, the hero uses ${slug} to find meaning treasure.`,
        },
      ],
    },
    imagePrompt: `children-friendly educational illustration, dinosaur explorer learning the word "${slug}", warm notebook texture, clean style, no copyrighted characters`,
    examples: [
      {
        en: `I am learning the word ${slug} with a root-based method.`,
        "zh-CN": `我正在用词根法学习 ${slug} 这个单词。`,
      },
      {
        en: `The mnemonic story helps me remember ${slug} better.`,
        "zh-CN": `助记故事让我更容易记住 ${slug}。`,
      },
    ],
    family: familyWords.slice(0, 12).map((word) => ({
      word,
      gloss: {
        "zh-CN": `${word}（同根词）`,
        en: `${word} (root family word)`,
      },
    })),
  };
}

function buildPrompt(slug: string) {
  return `
You are building content for an English-learning app for beginners.
Return strict JSON only and follow this schema exactly:
{
  "word": "string",
  "ipa": "string|null",
  "pos": "string|null",
  "gloss": { "zh-CN": "string", "en": "string" },
  "decomposable": boolean,
  "morphemes": [
    {
      "text": "string",
      "kind": "prefix|root|suffix",
      "meaning": { "zh-CN": "string", "en": "string" },
      "pronunciationHint": "string(optional)"
    }
  ],
  "mnemonics": {
    "recommended": "homophone|image|story",
    "items": [
      { "type": "homophone|image|story", "zh-CN": "string", "en": "string" }
    ]
  },
  "imagePrompt": "string|null",
  "examples": [
    { "en": "string", "zh-CN": "string" }
  ],
  "family": [
    { "word": "string", "gloss": { "zh-CN": "string", "en": "string" } }
  ]
}
Rules:
- examples length 1-2
- family length 0-12
- if not decomposable, return morphemes as []
- include both zh-CN and en texts
- keep beginner-friendly, child-safe, no hate/sexual/violent content
- no copyrighted character references
- target word: ${slug}
`;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  throw new Error("No JSON found in model response");
}

export async function generateWordByAI(slug: string): Promise<GeneratedWord> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackGeneratedWord(slug);
  }

  const model = process.env.OPENAI_MODEL_TEXT ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await client.responses.create({
        model,
        input: buildPrompt(slug),
      });
      const jsonText = extractJson(response.output_text);
      const parsed = JSON.parse(jsonText) as unknown;
      return generatedWordSchema.parse(parsed);
    } catch (error: unknown) {
      lastError = error;
    }
  }

  console.error("AI generation failed, fallback applied:", lastError);
  return fallbackGeneratedWord(slug);
}
