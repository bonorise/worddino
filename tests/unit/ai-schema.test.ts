import { describe, expect, it } from "vitest";
import { geminiAnalysisSchema } from "@/lib/ai/gemini-schema";
import { generatedWordSchema } from "@/lib/ai/schema";

describe("generatedWordSchema", () => {
  it("should parse valid payload", () => {
    const payload = {
      word: "transport",
      ipa: null,
      pos: "verb",
      gloss: {
        "zh-CN": "运输",
        en: "to carry",
      },
      decomposable: true,
      morphemes: [
        {
          text: "trans",
          kind: "prefix",
          meaning: {
            "zh-CN": "穿过",
            en: "across",
          },
        },
        {
          text: "port",
          kind: "root",
          meaning: {
            "zh-CN": "搬运",
            en: "carry",
          },
        },
      ],
      mnemonics: {
        recommended: "story",
        items: [
          {
            type: "story",
            "zh-CN": "把货物穿越山谷运走。",
            en: "Carry goods across valleys.",
          },
        ],
      },
      imagePrompt: "friendly dinosaur carrying boxes",
      examples: [
        {
          en: "They transport food by truck.",
          "zh-CN": "他们用卡车运输食物。",
        },
      ],
      family: [],
    };

    expect(generatedWordSchema.parse(payload).word).toBe("transport");
  });
});

describe("geminiAnalysisSchema", () => {
  it("accepts optional memory anchor fields", () => {
    const result = geminiAnalysisSchema.parse({
      explanation: "transport means moving people or things from one place to another.",
      scene: "Picture a truck carrying boxes across a bridge.",
      formula: "across + carry = transport",
      hook: "Remember transport as carrying something across distance.",
      decomposable: true,
      morphemes: [],
      mnemonics: [],
      recommendedType: "story",
      examples: [],
      familyWords: [],
    });

    expect(result.scene).toBe("Picture a truck carrying boxes across a bridge.");
    expect(result.formula).toBe("across + carry = transport");
    expect(result.hook).toBe("Remember transport as carrying something across distance.");
  });
});
