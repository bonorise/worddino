import { generateWordByAI } from "@/lib/ai/generate-word";
import {
  getWordBySlug,
  hasActiveGeneration,
  markError,
  markGenerating,
  saveGeneratedWord,
} from "@/lib/word/repository";

const GENERATING_LOCK_WINDOW = 2 * 60_000;

export async function generateWordIfNeeded(slug: string) {
  const current = await getWordBySlug(slug);
  if (current && current.status === "ready") {
    return { status: "ready" as const, word: current };
  }

  const locked = await hasActiveGeneration(slug, GENERATING_LOCK_WINDOW);
  if (locked) {
    return { status: "generating" as const };
  }

  await markGenerating(slug);

  try {
    const generated = await generateWordByAI(slug);
    await saveGeneratedWord(generated);
    const latest = await getWordBySlug(slug);
    if (!latest) {
      throw new Error("failed to load generated word");
    }
    return { status: "ready" as const, word: latest };
  } catch (error: unknown) {
    await markError(slug);
    console.error(error);
    return { status: "error" as const };
  }
}
