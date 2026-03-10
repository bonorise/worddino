# Word Analysis Memory Anchors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `WordDino` 的单词分析结果新增 `scene`、`formula`、`hook` 三个“记忆锚点”字段，并在结果页稳定展示。

**Architecture:** 先从类型与 schema 入手，确保 API 契约稳定，再通过 TDD 改造 Gemini prompt 和 analyzer 映射，最后在结果页新增一张条件渲染的“记忆锚点”卡片，并补齐 i18n 与 e2e 覆盖。整轮只做最小增量，不改标题区，不引入 `gloss` 或 `ipa`。

**Tech Stack:** Next.js App Router、TypeScript、Zod、next-intl、Vitest、Playwright、Gemini generateContent API

---

### Task 1: 扩展分析返回类型与 schema

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/types/index.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/ai/gemini-schema.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/ai-schema.test.ts`

**Step 1: 写失败中的 schema 单测**

```ts
import { describe, expect, it } from "vitest";
import { geminiAnalysisSchema } from "@/lib/ai/gemini-schema";

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
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/ai-schema.test.ts`

Expected:
- FAIL，提示 `scene`、`formula`、`hook` 不在 schema 中。

**Step 3: 写最小实现**

在 `src/types/index.ts` 的 `WordAnalysisResult` 中新增：

```ts
scene?: string;
formula?: string;
hook?: string;
```

在 `src/lib/ai/gemini-schema.ts` 中新增：

```ts
scene: z.string().trim().min(1).optional(),
formula: z.string().trim().min(1).optional(),
hook: z.string().trim().min(1).optional(),
```

并在 JSON schema 的 `properties` 中增加：

```ts
scene: { type: "string" },
formula: { type: "string" },
hook: { type: "string" },
```

不要把这三个字段加入 `required`。

**Step 4: 重新运行测试，确认通过**

Run: `pnpm exec vitest run tests/unit/ai-schema.test.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/types/index.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/src/lib/ai/gemini-schema.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/ai-schema.test.ts
git commit -m "feat: add memory anchor fields to analysis schema"
```

### Task 2: 让 Gemini prompt 和 analyzer 返回记忆锚点

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyzer.test.ts`

**Step 1: 写失败中的 analyzer 单测**

```ts
expect(result).toEqual({
  word: "transport",
  normalizedWord: "transport",
  locale: "en",
  explanation: "To transport means to move people or things from one place to another.",
  scene: "Picture a truck carrying boxes across a bridge.",
  formula: "across + carry = transport",
  hook: "Remember transport as carrying something across distance.",
  decomposable: true,
  morphemes: [
    { text: "trans", kind: "prefix", meaning: "across" },
    { text: "port", kind: "root", meaning: "carry" },
  ],
  mnemonics: [
    { type: "story", title: "Story", content: "Imagine carrying a package across a river." },
  ],
  recommendedType: "story",
  examples: ["Buses transport students to school every day."],
  familyWords: ["portable", "export", "import"],
  source: "gemini",
});
```

同时在 mock payload 中加入：

```ts
scene: "Picture a truck carrying boxes across a bridge.",
formula: "across + carry = transport",
hook: "Remember transport as carrying something across distance.",
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/analyzer.test.ts`

Expected:
- FAIL，提示结果对象缺少新字段，或 schema 未映射。

**Step 3: 写最小实现**

在 `buildPrompt()` 中加入这些规则：

```txt
- Add scene as one vivid, concrete sentence describing the easiest mental image of the word.
- Add formula as one short memory formula.
- Add hook as one short sentence that helps the learner remember the word.
- Even if decomposable is false, scene/formula/hook may still be returned.
- Avoid philosophical, poetic, or inspirational tone.
- Do not invent etymology.
```

在 `analyzeWord()` 的返回对象中增加：

```ts
scene: parsed.scene,
formula: parsed.formula,
hook: parsed.hook,
```

**Step 4: 重新运行测试，确认通过**

Run: `pnpm exec vitest run tests/unit/analyzer.test.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyzer.test.ts
git commit -m "feat: generate memory anchors in analyzer"
```

### Task 3: 在结果页渲染记忆锚点卡片并补 i18n

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/analyze-result-view.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/word/[slug]/page.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/messages/zh-CN.json`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/messages/en.json`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/tests/e2e/search-flow.spec.ts`

**Step 1: 先写 e2e 断言，锁定页面行为**

在 mock `/api/analyze` 的返回数据中加入：

```ts
scene: "想象一辆卡车穿过桥梁，把箱子运到远方。",
formula: "跨越 + 搬运 = 运输",
hook: "记住 transport，就是把东西带着跨过去。",
```

并增加断言：

```ts
await expect(page.getByText("记忆锚点")).toBeVisible();
await expect(page.getByText("想象一辆卡车穿过桥梁，把箱子运到远方。")).toBeVisible();
await expect(page.getByText("跨越 + 搬运 = 运输")).toBeVisible();
await expect(page.getByText("记住 transport，就是把东西带着跨过去。")).toBeVisible();
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec playwright test tests/e2e/search-flow.spec.ts`

Expected:
- FAIL，提示页面上找不到“记忆锚点”或相关文本。

**Step 3: 写最小实现**

在 `AnalyzeResultLabels` 中新增：

```ts
anchorTitle: string;
sceneLabel: string;
formulaLabel: string;
hookLabel: string;
```

在 `page.tsx` 里把新 label 传给 `AnalyzeResultView`。

在结果页组件中增加条件判断：

```ts
const hasMemoryAnchors = Boolean(data.scene || data.formula || data.hook);
```

在主解释卡片后插入新卡片：

```tsx
{hasMemoryAnchors ? (
  <Card>
    <CardHeader>
      <CardTitle>{labels.anchorTitle}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {data.scene ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{labels.sceneLabel}</p>
          <p className="mt-1 text-sm leading-7 text-muted-foreground">{data.scene}</p>
        </div>
      ) : null}
      {data.formula ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{labels.formulaLabel}</p>
          <p className="mt-1 font-medium">{data.formula}</p>
        </div>
      ) : null}
      {data.hook ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{labels.hookLabel}</p>
          <p className="mt-1 text-sm leading-7 text-muted-foreground">{data.hook}</p>
        </div>
      ) : null}
    </CardContent>
  </Card>
) : null}
```

在中英文消息中新增文案：

```json
"anchorTitle": "记忆锚点",
"sceneLabel": "原始画面",
"formulaLabel": "记忆公式",
"hookLabel": "一句记住"
```

英文对应：

```json
"anchorTitle": "Memory Anchor",
"sceneLabel": "Scene",
"formulaLabel": "Formula",
"hookLabel": "Remember It"
```

**Step 4: 重新运行 e2e，确认通过**

Run: `pnpm exec playwright test tests/e2e/search-flow.spec.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/components/features/analyze-result-view.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/word/[slug]/page.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/messages/zh-CN.json \
  /Users/liubo/Desktop/PROJECT/word-dino/messages/en.json \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/e2e/search-flow.spec.ts
git commit -m "feat: render memory anchors in word analysis"
```

### Task 4: 做一轮最小回归并整理交付

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/progress.md`

**Step 1: 跑回归测试**

Run:

```bash
pnpm exec vitest run \
  tests/unit/ai-schema.test.ts \
  tests/unit/analyzer.test.ts
pnpm exec playwright test tests/e2e/search-flow.spec.ts
```

Expected:
- 所有相关测试 PASS

**Step 2: 更新进度文档**

在 `progress.md` 的“当前待办”或结果页相关条目中补一句：

```md
- [x] 结果页增加“记忆锚点”卡片（原始画面 / 记忆公式 / 一句记住）
```

**Step 3: 检查变更**

Run: `git status --short`

Expected:
- 只有本轮预期文件变化

**Step 4: 提交最终集成**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/progress.md
git commit -m "docs: update progress for memory anchors"
```

**Step 5: 人工验收**

Run: `pnpm dev`

手动验证：
- 打开 `http://localhost:3000/zh-CN`
- 搜索 `transport`
- 确认解释、词根拆解、助记卡片、例句、同族词图仍正常
- 确认当接口返回 `scene/formula/hook` 时出现“记忆锚点”卡片
- 确认当接口缺失这三个字段时页面没有空卡片
