import { z } from "zod";

export const geminiMorphemeSchema = z.object({
  text: z.string().trim().min(1),
  kind: z.enum(["prefix", "root", "suffix"]),
  meaning: z.string().trim().min(1),
});

export const geminiMnemonicSchema = z.object({
  type: z.enum(["homophone", "image", "story"]),
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

export const geminiAnalysisSchema = z.object({
  explanation: z.string().trim().min(1),
  decomposable: z.boolean(),
  morphemes: z.array(geminiMorphemeSchema),
  mnemonics: z.array(geminiMnemonicSchema).max(3),
  recommendedType: z.enum(["homophone", "image", "story"]),
  examples: z.array(z.string().trim().min(1)).max(2),
  familyWords: z.array(z.string().trim().min(1)).max(12),
});

export const geminiAnalysisJsonSchema = {
  type: "object",
  properties: {
    explanation: { type: "string" },
    decomposable: { type: "boolean" },
    morphemes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          kind: {
            type: "string",
            enum: ["prefix", "root", "suffix"],
          },
          meaning: { type: "string" },
        },
        required: ["text", "kind", "meaning"],
      },
    },
    mnemonics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["homophone", "image", "story"],
          },
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["type", "title", "content"],
      },
    },
    recommendedType: {
      type: "string",
      enum: ["homophone", "image", "story"],
    },
    examples: {
      type: "array",
      items: { type: "string" },
    },
    familyWords: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "explanation",
    "decomposable",
    "morphemes",
    "mnemonics",
    "recommendedType",
    "examples",
    "familyWords",
  ],
} as const;

export type GeminiAnalysis = z.infer<typeof geminiAnalysisSchema>;
