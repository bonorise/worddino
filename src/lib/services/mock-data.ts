import type {
  MnemonicCardData,
  MorphemeParseCandidate,
  RootDefinition,
  WordAnalysisResult,
} from "@/types";

const RANDOM_DELAY_MIN = 350;
const RANDOM_DELAY_MAX = 900;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomDelay() {
  return Math.floor(
    Math.random() * (RANDOM_DELAY_MAX - RANDOM_DELAY_MIN + 1) + RANDOM_DELAY_MIN,
  );
}

function buildMockMnemonicCards(word: string, hasRoot: boolean): MnemonicCardData[] {
  if (hasRoot) {
    return [
      {
        type: "story",
        title: "词根故事锚点",
        contentZhCN: `把 ${word} 想象成一只在化石馆执行任务的小恐龙：先按词根理解结构，再把画面和故事绑定到意思上。`,
        contentEn: `Imagine ${word} as a little dino on a mission in a fossil museum: understand the structure first, then bind meaning to a vivid scene.`,
      },
      {
        type: "homophone",
        title: "谐音辅助",
        contentZhCN: `把 ${word} 分成 2-3 段熟悉发音，每一段配一个固定画面，重复回忆时先想画面再还原单词。`,
        contentEn: `Split ${word} into 2-3 familiar sound chunks. Assign each chunk one fixed image and recall the image first.`,
      },
      {
        type: "image",
        title: "画面提示",
        contentZhCN: `儿童友好插画：恐龙在笔记本上标注 "${word}"，背景是化石标本柜，暖色纸张质感。`,
        contentEn: `Child-friendly illustration: a dino annotating "${word}" on a notebook with fossil cabinets in a warm paper texture.`,
      },
    ];
  }

  return [
    {
      type: "homophone",
      title: "谐音优先",
      contentZhCN: `本词不易稳定拆解词根，先用谐音联想记忆：为 ${word} 设计一个你熟悉的中文近音短句。`,
      contentEn: `This word is not easy to decompose reliably. Start with a homophone anchor for ${word}.`,
    },
    {
      type: "story",
      title: "场景故事",
      contentZhCN: `给 ${word} 编一个 10 秒小故事，包含人物、动作和结果，能更快触发回忆。`,
      contentEn: `Build a 10-second story for ${word} with a character, action, and result to trigger recall.`,
    },
    {
      type: "image",
      title: "图像线索",
      contentZhCN: `画面中保留单词拼写 "${word}"，并加入一个夸张动作，提升记忆黏性。`,
      contentEn: `Keep the spelling "${word}" visible in the scene and add one exaggerated action for retention.`,
    },
  ];
}

export async function getMockAnalysis(
  word: string,
  normalizedWord: string,
  matchedRoots: RootDefinition[],
  parseCandidates: MorphemeParseCandidate[],
): Promise<WordAnalysisResult> {
  await wait(randomDelay());

  const hasRoot = matchedRoots.length > 0;
  const mnemonicCards = buildMockMnemonicCards(normalizedWord, hasRoot);

  return {
    word,
    normalizedWord,
    rootFound: hasRoot,
    matchedRoots,
    parseCandidates,
    mnemonicCards,
    recommendedType: hasRoot ? "story" : "homophone",
    explanation: hasRoot
      ? {
          zhCN: "本词可以按词根词缀拆解，建议先看结构再记助记故事。",
          en: "This word can be decomposed by morphemes. Understand structure before mnemonic story.",
        }
      : {
          zhCN: "本词词根拆解不稳定，建议优先用谐音和画面记忆。",
          en: "Morpheme decomposition is unstable for this word; use homophone and visual memory first.",
        },
    source: "mock",
  };
}
