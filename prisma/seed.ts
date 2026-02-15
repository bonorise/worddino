import { PrismaClient } from "@prisma/client";
import morphemes from "../data/morphemes.seed.json";

const prisma = new PrismaClient();

interface SeedMorphemeItem {
  kind: "prefix" | "root" | "suffix";
  text: string;
  meaning: {
    "zh-CN": string;
    en: string;
  };
  pronunciationHint?: string;
  examples?: string[];
}

async function main() {
  const records = morphemes as SeedMorphemeItem[];

  for (const item of records) {
    await prisma.morpheme.upsert({
      where: { text: item.text.toLowerCase() },
      update: {
        kind: item.kind,
        meaning: item.meaning,
        pronunciationHint: item.pronunciationHint,
        examples: item.examples ? item.examples : undefined,
        source: "seed",
        reviewStatus: "approved",
      },
      create: {
        kind: item.kind,
        text: item.text.toLowerCase(),
        meaning: item.meaning,
        pronunciationHint: item.pronunciationHint,
        examples: item.examples ? item.examples : undefined,
        source: "seed",
        reviewStatus: "approved",
      },
    });
  }

  console.log(`seeded ${records.length} morphemes`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
