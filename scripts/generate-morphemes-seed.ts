import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";

const morphemeSchema = z.object({
  kind: z.enum(["prefix", "root", "suffix"]),
  text: z.string().min(1).regex(/^[a-z]+$/),
  meaning: z.object({
    "zh-CN": z.string().min(1),
    en: z.string().min(1),
  }),
});

const payloadSchema = z.object({
  items: z.array(morphemeSchema).min(200).max(320),
});

const fallbackSeed = {
  items: [
    {
      kind: "prefix",
      text: "trans",
      meaning: {
        "zh-CN": "穿过，转换",
        en: "across, change",
      },
    },
    {
      kind: "root",
      text: "port",
      meaning: {
        "zh-CN": "搬运",
        en: "carry",
      },
    },
    {
      kind: "suffix",
      text: "tion",
      meaning: {
        "zh-CN": "动作名词后缀",
        en: "action noun suffix",
      },
    },
  ],
};

async function generateByOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackSeed;
  }

  const client = new OpenAI({ apiKey });
  const prompt = `
请生成 250 条英语词根词缀数据，比例约 prefix 90 / suffix 90 / root 70。
返回 JSON，格式：
{
  "items": [
    {
      "kind": "prefix|root|suffix",
      "text": "小写字母",
      "meaning": { "zh-CN": "中文释义", "en": "english meaning" }
    }
  ]
}
不要输出额外文字。
`;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL_TEXT ?? "gpt-4.1-mini",
    input: prompt,
  });

  const text = response.output_text.trim();
  return JSON.parse(text) as unknown;
}

async function main() {
  const result = await generateByOpenAI();
  const parsed = payloadSchema.parse(result);

  const outputPath = path.resolve(process.cwd(), "data/morphemes.seed.json");
  await fs.writeFile(outputPath, JSON.stringify(parsed.items, null, 2), "utf-8");

  console.log(`generated ${parsed.items.length} morphemes to ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
