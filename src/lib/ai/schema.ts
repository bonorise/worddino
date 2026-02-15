import { z } from "zod";

export const localizedTextSchema = z.object({
  "zh-CN": z.string().min(1),
  en: z.string().min(1),
});

export const morphemeSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(["prefix", "root", "suffix"]),
  meaning: localizedTextSchema,
  pronunciationHint: z.string().optional(),
});

export const mnemonicItemSchema = z.object({
  type: z.enum(["homophone", "image", "story"]),
  "zh-CN": z.string().min(1),
  en: z.string().min(1),
});

export const exampleSchema = z.object({
  en: z.string().min(1),
  "zh-CN": z.string().min(1),
});

export const familySchema = z.object({
  word: z.string().min(1),
  gloss: localizedTextSchema,
});

export const generatedWordSchema = z.object({
  word: z.string().min(1),
  ipa: z.string().nullable(),
  pos: z.string().nullable(),
  gloss: localizedTextSchema,
  decomposable: z.boolean(),
  morphemes: z.array(morphemeSchema),
  mnemonics: z.object({
    recommended: z.enum(["homophone", "image", "story"]),
    items: z.array(mnemonicItemSchema).min(1),
  }),
  imagePrompt: z.string().nullable(),
  examples: z.array(exampleSchema).min(1).max(2),
  family: z.array(familySchema).max(12),
});

export type GeneratedWord = z.infer<typeof generatedWordSchema>;
