# WordDino Gemini 无数据库极速上线 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在今天内上线一个无数据库、纯 Gemini 驱动、保留中英路由的 WordDino 最小可用版本。

**Architecture:** 保留现有 Next.js 15 多语言路由与两页结构，删除数据库和本地词根库在运行时的参与，只保留 `POST /api/analyze` 作为主链路。服务端负责输入校验、调用 Gemini、做严格 Schema 校验，前端只消费稳定结果并处理加载、失败、重试三种状态。

**Tech Stack:** Next.js 15 App Router、TypeScript、Tailwind CSS、shadcn/ui、Zod、Google Gemini API、Vitest、Playwright

---

### Task 1: 清点当前运行链路与阻塞项

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/pnpm-workspace.yaml`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/package.json`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/api/analyze/route.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts`

**Step 1: 写一个最小构建检查清单**

```md
- pnpm workspace 可正常执行命令
- analyze 主链路文件可被 TypeScript 正常解析
- 不再要求数据库环境变量才能启动
```

**Step 2: 先修复 workspace 配置**

```yaml
packages:
  - "."

ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

**Step 3: 运行基础命令确认环境恢复**

Run: `pnpm build`
Expected: 不再出现 `packages field missing or empty`

**Step 4: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/pnpm-workspace.yaml
git commit -m "chore: fix workspace config for build commands"
```

### Task 2: 用测试锁定 analyze 接口新契约

**Files:**
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/types/index.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/api/analyze/route.ts`

**Step 1: 先写失败测试，约束请求必须包含 `word` 与 `locale`**

```ts
import { describe, expect, it } from "vitest";

describe("analyze request schema", () => {
  it("rejects missing locale", async () => {
    expect(true).toBe(false);
  });
});
```

**Step 2: 运行单测确认失败**

Run: `pnpm test -- --run tests/unit/analyze-route-schema.test.ts`
Expected: FAIL，原因是断言故意失败或当前实现不支持 `locale`

**Step 3: 补充同文件中的成功与失败场景**

```ts
it("accepts zh-CN locale");
it("accepts en locale");
it("rejects invalid locale");
it("rejects empty word");
```

**Step 4: 再次运行单测**

Run: `pnpm test -- --run tests/unit/analyze-route-schema.test.ts`
Expected: 只有在实现契约后才会 PASS

**Step 5: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts
git commit -m "test: define analyze api contract"
```

### Task 3: 收敛单一分析数据结构

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/types/index.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/types.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/docs/plans/2026-03-09-gemini-no-db-fast-launch-design.md`

**Step 1: 先写出目标类型**

```ts
export interface AnalyzeMorphemeItem {
  text: string;
  kind: "prefix" | "root" | "suffix";
  meaning: string;
}

export interface AnalyzeMnemonicItem {
  type: "homophone" | "story" | "image";
  title: string;
  content: string;
}

export interface WordAnalysisResult {
  word: string;
  normalizedWord: string;
  locale: "zh-CN" | "en";
  decomposable: boolean;
  explanation: string;
  morphemes: AnalyzeMorphemeItem[];
  mnemonics: AnalyzeMnemonicItem[];
  recommendedType: "homophone" | "story" | "image";
  examples: string[];
  familyWords: string[];
  source: "gemini";
}
```

**Step 2: 修改类型定义，不再要求双语字段和本地词根字段**

```ts
// 删除 matchedRoots / parseCandidates / contentZhCN / contentEn / source: "mock" | "ai"
```

**Step 3: 运行类型相关单测**

Run: `pnpm test -- --run tests/unit`
Expected: 相关旧测试失败，提示需要同步实现

**Step 4: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/src/types/index.ts
git commit -m "refactor: simplify analysis types for gemini runtime"
```

### Task 4: 替换分析服务为纯 Gemini Provider

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/ai/gemini-analyze.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/mock-data.ts`

**Step 1: 为 Gemini 输出写严格 Zod Schema**

```ts
const geminiResultSchema = z.object({
  explanation: z.string().min(1),
  decomposable: z.boolean(),
  morphemes: z.array(
    z.object({
      text: z.string().min(1),
      kind: z.enum(["prefix", "root", "suffix"]),
      meaning: z.string().min(1),
    }),
  ),
  mnemonics: z.array(
    z.object({
      type: z.enum(["homophone", "story", "image"]),
      title: z.string().min(1),
      content: z.string().min(1),
    }),
  ),
  recommendedType: z.enum(["homophone", "story", "image"]),
  examples: z.array(z.string().min(1)).max(2),
  familyWords: z.array(z.string().min(1)).max(12),
});
```

**Step 2: 新建 Gemini 调用封装**

```ts
export async function analyzeWordWithGemini(word: string, locale: "zh-CN" | "en") {
  // 构建 prompt
  // 调用 Gemini
  // 解析 JSON
  // zod 校验
}
```

**Step 3: 改造 analyzer 只保留纯 Gemini 主链路**

```ts
export async function analyzeWord(word: string, locale: LocaleCode): Promise<WordAnalysisResult> {
  const normalizedWord = normalizeWord(word);
  return analyzeWordWithGemini(normalizedWord, locale);
}
```

**Step 4: 删除运行时对 roots.json 与 mock fallback 的依赖**

```ts
// 不再 import roots.json
// 不再调用 getMockAnalysis
```

**Step 5: 运行对应单测**

Run: `pnpm test -- --run tests/unit/analyze-route-schema.test.ts tests/unit/ai-schema.test.ts`
Expected: PASS

**Step 6: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts /Users/liubo/Desktop/PROJECT/word-dino/src/lib/ai/gemini-analyze.ts
git commit -m "feat: switch analyze pipeline to gemini"
```

### Task 5: 更新 analyze 路由请求与错误返回

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/api/analyze/route.ts`
- Test: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts`

**Step 1: 先让路由校验 `locale`**

```ts
const requestSchema = z.object({
  word: z.string().trim().min(1),
  locale: z.enum(["zh-CN", "en"]),
});
```

**Step 2: 将 `locale` 透传给 analyzer**

```ts
const data = await analyzeWord(payload.word, payload.locale);
```

**Step 3: 区分输入错误与服务错误**

```ts
if (error instanceof z.ZodError) {
  return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
}

return NextResponse.json({ ok: false, message: "Analyze failed, please try again later" }, { status: 502 });
```

**Step 4: 运行测试**

Run: `pnpm test -- --run tests/unit/analyze-route-schema.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/src/app/api/analyze/route.ts /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts
git commit -m "feat: update analyze route for locale-aware requests"
```

### Task 6: 改首页提交逻辑，按当前语言调用接口

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/search-hero.tsx`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/slug.ts`

**Step 1: 先写页面行为预期**

```ts
// 提交时 body 必须包含 { word: slug, locale }
// sessionStorage key 需要包含 locale，避免中英串缓存
```

**Step 2: 最小实现**

```ts
const analysisStorageKey = (locale: LocaleCode, word: string) =>
  `worddino:analysis:${locale}:${word.toLowerCase()}`;
```

**Step 3: 提交请求时带 locale**

```ts
body: JSON.stringify({ word: slug, locale })
```

**Step 4: 手动验证**

Run: `pnpm dev`
Expected: 首页输入单词后跳转到对应语言的结果页

**Step 5: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/src/components/features/search-hero.tsx
git commit -m "feat: send locale with analyze requests"
```

### Task 7: 改结果页渲染为新数据结构

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/analyze-result-view.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/word/[slug]/page.tsx`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/morpheme-parse-tree.tsx`

**Step 1: 先去掉对旧双语字段的读取**

```ts
// 不再读取 explanation.zhCN / explanation.en
// 不再读取 matchedRoots / parseCandidates / mnemonicCards
```

**Step 2: 改成读取新字段**

```ts
data.explanation
data.morphemes
data.mnemonics
data.examples
data.familyWords
```

**Step 3: 保留三种状态**

```ts
// loading
// error + retry
// success
```

**Step 4: 词根区处理不可拆解状态**

```ts
if (!data.decomposable || data.morphemes.length === 0) {
  // 展示整体记忆提示
}
```

**Step 5: 运行页面手测**

Run: `pnpm dev`
Expected: 结果页能稳定展示解释、助记、例句和词根关系

**Step 6: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/src/components/features/analyze-result-view.tsx /Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/word/[slug]/page.tsx
git commit -m "feat: render gemini analysis on result page"
```

### Task 8: 将词根关系图收敛为基于 `familyWords` 的轻量展示

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/root-mind-map.tsx`
- Or Create: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/family-graph.tsx`

**Step 1: 选定最小展示策略**

```ts
// 中心节点是当前单词
// familyWords 围绕展示
// 点击相关词跳转当前 locale 下的详情页
```

**Step 2: 最小实现，不依赖数据库版 WordDetail**

```ts
interface FamilyGraphProps {
  locale: LocaleCode;
  word: string;
  familyWords: string[];
}
```

**Step 3: 手测跳转**

Run: `pnpm dev`
Expected: 点击 family 节点会跳转新词结果页

**Step 4: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/src/components/features/root-mind-map.tsx
git commit -m "feat: simplify family graph for no-db launch"
```

### Task 9: 保留图片接口骨架但显式禁用

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/api/generate-image/route.ts`

**Step 1: 收敛接口形状**

```ts
const imageRequestSchema = z.object({
  prompt: z.string().trim().min(6),
  locale: z.enum(["zh-CN", "en"]).optional(),
});
```

**Step 2: 显式返回禁用状态**

```ts
return NextResponse.json(
  {
    ok: false,
    status: "disabled",
    message: "Image generation is not enabled in this launch version.",
  },
  { status: 501 },
);
```

**Step 3: 手测**

Run: `curl -X POST http://localhost:3000/api/generate-image ...`
Expected: 501 + disabled message

**Step 4: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/src/app/api/generate-image/route.ts
git commit -m "chore: keep image api as disabled placeholder"
```

### Task 10: 清理文档与待办，标记完整双语为后续任务

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/progress.md`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/docs/01_tech_stack.md`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/docs/02_data_schema.md`

**Step 1: 在进度文件中新增本轮上线任务**

```md
- [ ] 切换到 Gemini 纯运行模式
- [ ] 移除数据库和本地词根库运行依赖
- [ ] 保留中英路由并完成基础可用文案
- [ ] 完整双语润色（后续）
```

**Step 2: 同步关键文档中的 no-db 结论**

```md
MVP 阶段以 Gemini 直接分析为准，不接数据库，不依赖本地词根库。
```

**Step 3: 提交**

```bash
git add /Users/liubo/Desktop/PROJECT/word-dino/progress.md /Users/liubo/Desktop/PROJECT/word-dino/docs/01_tech_stack.md /Users/liubo/Desktop/PROJECT/word-dino/docs/02_data_schema.md
git commit -m "docs: align docs with gemini no-db launch plan"
```

### Task 11: 做最小上线验证

**Files:**
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/playwright.config.ts`

**Step 1: 本地构建**

Run: `pnpm build`
Expected: PASS

**Step 2: 本地手测 5 个词**

```txt
inspect
transport
construct
portable
biology
```

**Step 3: 运行关键单测**

Run: `pnpm test -- --run tests/unit`
Expected: PASS 或只剩已知、可解释的旧测试待同步

**Step 4: 如有 e2e，就补一个最小 happy path**

Run: `pnpm test:e2e`
Expected: 首页搜索到结果页流程通过

**Step 5: 提交**

```bash
git add -A
git commit -m "test: verify no-db gemini launch flow"
```
