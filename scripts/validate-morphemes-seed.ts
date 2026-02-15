import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const schema = z.array(
  z.object({
    kind: z.enum(["prefix", "root", "suffix"]),
    text: z
      .string()
      .min(1)
      .max(30)
      .regex(/^[a-z]+$/),
    meaning: z.object({
      "zh-CN": z.string().min(1),
      en: z.string().min(1),
    }),
  }),
);

async function main() {
  const filePath = path.resolve(process.cwd(), "data/morphemes.seed.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const data = schema.parse(JSON.parse(raw));

  const uniqueCheck = new Set<string>();
  const stats = {
    prefix: 0,
    root: 0,
    suffix: 0,
  };

  for (const item of data) {
    if (uniqueCheck.has(item.text)) {
      throw new Error(`duplicate morpheme text: ${item.text}`);
    }
    uniqueCheck.add(item.text);
    stats[item.kind] += 1;
  }

  console.log(`validated ${data.length} items`);
  console.log(stats);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
