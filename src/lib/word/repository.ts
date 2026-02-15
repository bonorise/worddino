import type { GeneratedWord } from "@/lib/ai/schema";
import { prisma } from "@/lib/prisma";
import type {
  ExampleItem,
  FamilyItem,
  LocalizedText,
  Mnemonics,
  VoteValue,
  WordDetail,
} from "@/lib/types";

const defaultLocalizedText: LocalizedText = {
  "zh-CN": "",
  en: "",
};

const defaultMnemonics: Mnemonics = {
  recommended: "story",
  items: [
    {
      type: "story",
      "zh-CN": "",
      en: "",
    },
  ],
};

const memoryWords = new Map<string, Omit<WordDetail, "userVote">>();
const memoryVotes = new Map<string, Map<string, VoteValue>>();
const memoryGeneratingAt = new Map<string, number>();

const dbEnabled = Boolean(process.env.DATABASE_URL);

function parseLocalizedText(value: unknown): LocalizedText {
  if (
    value &&
    typeof value === "object" &&
    "zh-CN" in value &&
    "en" in value &&
    typeof (value as Record<string, unknown>)["zh-CN"] === "string" &&
    typeof (value as Record<string, unknown>).en === "string"
  ) {
    return value as LocalizedText;
  }
  return defaultLocalizedText;
}

function parseMnemonics(value: unknown): Mnemonics {
  if (!value || typeof value !== "object") {
    return defaultMnemonics;
  }

  const obj = value as Record<string, unknown>;
  const recommended = obj.recommended;
  const items = obj.items;

  if (
    (recommended === "homophone" ||
      recommended === "image" ||
      recommended === "story") &&
    Array.isArray(items) &&
    items.length > 0
  ) {
    const normalizedItems = items
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "type" in item &&
          "zh-CN" in item &&
          "en" in item
        ) {
          const typed = item as Record<string, unknown>;
          if (
            (typed.type === "homophone" ||
              typed.type === "image" ||
              typed.type === "story") &&
            typeof typed["zh-CN"] === "string" &&
            typeof typed.en === "string"
          ) {
            return {
              type: typed.type,
              "zh-CN": typed["zh-CN"],
              en: typed.en,
            };
          }
        }
        return null;
      })
      .filter((item) => item !== null);

    if (normalizedItems.length > 0) {
      return {
        recommended,
        items: normalizedItems,
      };
    }
  }

  return defaultMnemonics;
}

function parseExamples(value: unknown): ExampleItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).en === "string" &&
        typeof (item as Record<string, unknown>)["zh-CN"] === "string"
      ) {
        return {
          en: (item as Record<string, string>).en,
          "zh-CN": (item as Record<string, string>)["zh-CN"],
        };
      }
      return null;
    })
    .filter((item) => item !== null)
    .slice(0, 2);
}

function parseFamily(value: unknown): FamilyItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).word === "string" &&
        typeof (item as Record<string, unknown>).gloss === "object"
      ) {
        return {
          word: (item as Record<string, string>).word,
          gloss: parseLocalizedText((item as Record<string, unknown>).gloss),
        };
      }
      return null;
    })
    .filter((item) => item !== null);
}

function safeWordDetail(
  value: Omit<WordDetail, "userVote">,
  userVote: VoteValue | 0,
): WordDetail {
  return {
    ...value,
    userVote,
  };
}

export async function hasActiveGeneration(
  slug: string,
  windowMs: number,
): Promise<boolean> {
  if (!dbEnabled) {
    const timestamp = memoryGeneratingAt.get(slug);
    return typeof timestamp === "number" && Date.now() - timestamp < windowMs;
  }

  const record = await prisma.word.findUnique({
    where: { slug },
    select: { status: true, updatedAt: true },
  });
  if (!record || record.status !== "generating") {
    return false;
  }
  return Date.now() - record.updatedAt.getTime() < windowMs;
}

export async function markGenerating(slug: string): Promise<void> {
  if (!dbEnabled) {
    memoryGeneratingAt.set(slug, Date.now());
    const existing = memoryWords.get(slug);
    memoryWords.set(slug, {
      slug,
      display: slug,
      status: "generating",
      decomposable: existing?.decomposable ?? false,
      ipa: existing?.ipa ?? null,
      pos: existing?.pos ?? null,
      gloss: existing?.gloss ?? defaultLocalizedText,
      mnemonics: existing?.mnemonics ?? defaultMnemonics,
      examples: existing?.examples ?? [],
      imagePrompt: existing?.imagePrompt ?? null,
      morphemes: existing?.morphemes ?? [],
      family: existing?.family ?? [],
      voteUp: existing?.voteUp ?? 0,
      voteDown: existing?.voteDown ?? 0,
    });
    return;
  }

  await prisma.word.upsert({
    where: { slug },
    create: {
      slug,
      display: slug,
      status: "generating",
      decomposable: false,
      gloss: defaultLocalizedText,
      mnemonics: defaultMnemonics,
      examples: [],
    },
    update: {
      status: "generating",
    },
  });
}

export async function getWordBySlug(
  slug: string,
  fingerprint?: string,
): Promise<WordDetail | null> {
  if (!dbEnabled) {
    const detail = memoryWords.get(slug);
    if (!detail) {
      return null;
    }
    const userVote = memoryVotes.get(slug)?.get(fingerprint ?? "") ?? 0;
    return safeWordDetail(detail, userVote);
  }

  const word = await prisma.word.findUnique({
    where: { slug },
    include: {
      morphemes: {
        orderBy: { order: "asc" },
        include: { morpheme: true },
      },
    },
  });
  if (!word) {
    return null;
  }

  let userVote: VoteValue | 0 = 0;
  if (fingerprint) {
    const vote = await prisma.vote.findUnique({
      where: {
        wordId_fingerprint: {
          wordId: word.id,
          fingerprint,
        },
      },
    });
    if (vote?.value === 1 || vote?.value === -1) {
      userVote = vote.value;
    }
  }

  const rootIds = word.morphemes
    .filter((item) => item.role === "root")
    .map((item) => item.morphemeId);

  const familyMap = new Map<string, FamilyItem>();
  if (rootIds.length > 0) {
    const familyRecords = await prisma.wordMorpheme.findMany({
      where: {
        role: "root",
        morphemeId: { in: rootIds },
        word: { slug: { not: slug } },
      },
      include: { word: true },
      take: 24,
      orderBy: { createdAt: "desc" },
    });

    for (const item of familyRecords) {
      if (!familyMap.has(item.word.slug)) {
        familyMap.set(item.word.slug, {
          word: item.word.slug,
          gloss: parseLocalizedText(item.word.gloss),
        });
      }
      if (familyMap.size >= 12) {
        break;
      }
    }
  }

  return {
    slug: word.slug,
    display: word.display,
    status: word.status,
    decomposable: word.decomposable,
    ipa: word.ipa,
    pos: word.pos,
    gloss: parseLocalizedText(word.gloss),
    mnemonics: parseMnemonics(word.mnemonics),
    examples: parseExamples(word.examples),
    imagePrompt: word.imagePrompt,
    morphemes: word.morphemes.map((item) => ({
      text: item.morpheme.text,
      kind: item.role,
      meaning: parseLocalizedText(item.morpheme.meaning),
      pronunciationHint: item.morpheme.pronunciationHint ?? undefined,
    })),
    family: parseFamily(Array.from(familyMap.values())),
    voteUp: word.voteUp,
    voteDown: word.voteDown,
    userVote,
  };
}

export async function saveGeneratedWord(payload: GeneratedWord): Promise<void> {
  const slug = payload.word.toLowerCase();

  if (!dbEnabled) {
    const existingVotes = memoryVotes.get(slug);
    const voteUp = Array.from(existingVotes?.values() ?? []).filter(
      (value) => value === 1,
    ).length;
    const voteDown = Array.from(existingVotes?.values() ?? []).filter(
      (value) => value === -1,
    ).length;

    memoryWords.set(slug, {
      slug,
      display: payload.word,
      status: "ready",
      decomposable: payload.decomposable,
      ipa: payload.ipa,
      pos: payload.pos,
      gloss: payload.gloss,
      mnemonics: payload.mnemonics,
      examples: payload.examples,
      imagePrompt: payload.imagePrompt,
      morphemes: payload.morphemes,
      family: payload.family,
      voteUp,
      voteDown,
    });

    const root = payload.morphemes.find((item) => item.kind === "root");
    for (const item of payload.family) {
      const familySlug = item.word.toLowerCase();
      if (!memoryWords.has(familySlug)) {
        memoryWords.set(familySlug, {
          slug: familySlug,
          display: item.word,
          status: "stub",
          decomposable: Boolean(root),
          ipa: null,
          pos: null,
          gloss: item.gloss,
          mnemonics: defaultMnemonics,
          examples: [],
          imagePrompt: null,
          morphemes: root ? [root] : [],
          family: [],
          voteUp: 0,
          voteDown: 0,
        });
      }
    }
    memoryGeneratingAt.delete(slug);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const upsertedWord = await tx.word.upsert({
      where: { slug },
      create: {
        slug,
        display: payload.word,
        status: "ready",
        decomposable: payload.decomposable,
        ipa: payload.ipa,
        pos: payload.pos,
        gloss: payload.gloss,
        mnemonics: payload.mnemonics,
        examples: payload.examples,
        imagePrompt: payload.imagePrompt,
      },
      update: {
        display: payload.word,
        status: "ready",
        decomposable: payload.decomposable,
        ipa: payload.ipa,
        pos: payload.pos,
        gloss: payload.gloss,
        mnemonics: payload.mnemonics,
        examples: payload.examples,
        imagePrompt: payload.imagePrompt,
      },
    });

    await tx.wordMorpheme.deleteMany({
      where: { wordId: upsertedWord.id },
    });

    const morphemeIdByText = new Map<string, string>();

    for (const [index, item] of payload.morphemes.entries()) {
      const normalizedText = item.text.toLowerCase();
      const existing = await tx.morpheme.findUnique({
        where: { text: normalizedText },
      });

      const morpheme = existing
        ? await tx.morpheme.update({
            where: { id: existing.id },
            data: {
              kind: item.kind,
              meaning: item.meaning,
              pronunciationHint: item.pronunciationHint,
            },
          })
        : await tx.morpheme.create({
            data: {
              kind: item.kind,
              text: normalizedText,
              meaning: item.meaning,
              pronunciationHint: item.pronunciationHint,
              source: "ai",
              reviewStatus: "unreviewed",
            },
          });

      morphemeIdByText.set(normalizedText, morpheme.id);

      await tx.wordMorpheme.create({
        data: {
          wordId: upsertedWord.id,
          morphemeId: morpheme.id,
          role: item.kind,
          order: index,
        },
      });
    }

    const rootMorpheme = payload.morphemes.find((item) => item.kind === "root");
    const rootMorphemeId = rootMorpheme
      ? morphemeIdByText.get(rootMorpheme.text.toLowerCase())
      : undefined;

    if (rootMorphemeId) {
      for (const item of payload.family) {
        const familySlug = item.word.toLowerCase();
        const existingWord = await tx.word.findUnique({
          where: { slug: familySlug },
        });

        const familyWord = existingWord
          ? existingWord.status === "ready"
            ? existingWord
            : await tx.word.update({
                where: { id: existingWord.id },
                data: {
                  display: item.word,
                  status: "stub",
                  gloss: item.gloss,
                },
              })
          : await tx.word.create({
              data: {
                slug: familySlug,
                display: item.word,
                status: "stub",
                decomposable: true,
                gloss: item.gloss,
                mnemonics: defaultMnemonics,
                examples: [],
              },
            });

        await tx.wordMorpheme.upsert({
          where: {
            wordId_order: {
              wordId: familyWord.id,
              order: 0,
            },
          },
          update: {
            role: "root",
            morphemeId: rootMorphemeId,
          },
          create: {
            wordId: familyWord.id,
            morphemeId: rootMorphemeId,
            role: "root",
            order: 0,
          },
        });
      }
    }
  });
}

export async function markError(slug: string): Promise<void> {
  if (!dbEnabled) {
    const current = memoryWords.get(slug);
    if (current) {
      memoryWords.set(slug, {
        ...current,
        status: "error",
      });
    } else {
      memoryWords.set(slug, {
        slug,
        display: slug,
        status: "error",
        decomposable: false,
        ipa: null,
        pos: null,
        gloss: defaultLocalizedText,
        mnemonics: defaultMnemonics,
        examples: [],
        imagePrompt: null,
        morphemes: [],
        family: [],
        voteUp: 0,
        voteDown: 0,
      });
    }
    memoryGeneratingAt.delete(slug);
    return;
  }

  await prisma.word.upsert({
    where: { slug },
    create: {
      slug,
      display: slug,
      status: "error",
      decomposable: false,
      gloss: defaultLocalizedText,
      mnemonics: defaultMnemonics,
      examples: [],
    },
    update: {
      status: "error",
    },
  });
}

export async function upsertVote(
  slug: string,
  value: VoteValue,
  fingerprint: string,
): Promise<{ up: number; down: number; userVote: VoteValue | 0 }> {
  if (!dbEnabled) {
    const word = memoryWords.get(slug);
    if (!word) {
      throw new Error("word not found");
    }
    const voteMap = memoryVotes.get(slug) ?? new Map<string, VoteValue>();
    voteMap.set(fingerprint, value);
    memoryVotes.set(slug, voteMap);

    const up = Array.from(voteMap.values()).filter((item) => item === 1).length;
    const down = Array.from(voteMap.values()).filter((item) => item === -1).length;

    memoryWords.set(slug, {
      ...word,
      voteUp: up,
      voteDown: down,
    });

    return {
      up,
      down,
      userVote: value,
    };
  }

  const word = await prisma.word.findUnique({ where: { slug } });
  if (!word) {
    throw new Error("word not found");
  }

  await prisma.vote.upsert({
    where: {
      wordId_fingerprint: {
        wordId: word.id,
        fingerprint,
      },
    },
    create: {
      wordId: word.id,
      fingerprint,
      value,
    },
    update: {
      value,
    },
  });

  const [upCount, downCount] = await Promise.all([
    prisma.vote.count({
      where: {
        wordId: word.id,
        value: 1,
      },
    }),
    prisma.vote.count({
      where: {
        wordId: word.id,
        value: -1,
      },
    }),
  ]);

  await prisma.word.update({
    where: { id: word.id },
    data: {
      voteUp: upCount,
      voteDown: downCount,
    },
  });

  return {
    up: upCount,
    down: downCount,
    userVote: value,
  };
}
