# Analyze Error Governance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `WordDino` 的 `/api/analyze` 建立分层错误模型、明确的用户提示和部署配置校验，避免所有异常都退化成同一个 500。

**Architecture:** 先通过 TDD 固化新的错误返回契约，再把 Gemini 调用链拆分为配置错误、认证错误、限流错误、上游错误和响应解析错误五类领域错误，最后更新前端消费逻辑与文档。配置读取统一收口到服务端环境模块，路由只负责映射和日志，前端只消费 `code/message/retryable`。

**Tech Stack:** Next.js App Router、TypeScript、Zod、next-intl、Vitest、Playwright、Gemini generateContent API

---

### Task 1: 扩展 analyze API 错误返回类型

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/types/index.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts`

**Step 1: 写失败中的路由契约测试**

在 `tests/unit/analyze-route-schema.test.ts` 中新增一个 analyzer 抛出领域错误的场景：

```ts
analyzeWord.mockRejectedValue({
  name: "AnalyzeUpstreamError",
  code: "AI_UPSTREAM_ERROR",
  status: 503,
  retryable: true,
  publicMessage: "AI service is temporarily unavailable. Please try again later.",
});

const response = await POST(request);
const payload = (await response.json()) as {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
};

expect(response.status).toBe(503);
expect(payload).toEqual({
  ok: false,
  code: "AI_UPSTREAM_ERROR",
  message: "AI service is temporarily unavailable. Please try again later.",
  retryable: true,
});
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/analyze-route-schema.test.ts`

Expected:
- FAIL，提示 `AnalyzeErrorResponse` 缺少 `code` / `retryable`，或路由仍然返回旧结构。

**Step 3: 写最小实现**

在 `src/types/index.ts` 中把错误响应类型扩展为：

```ts
export interface AnalyzeErrorResponse {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
}
```

保留 `AnalyzeApiResponse` 联合类型不变。

**Step 4: 重新运行测试，确认仍只剩路由实现失败**

Run: `pnpm exec vitest run tests/unit/analyze-route-schema.test.ts`

Expected:
- FAIL，但失败点收敛到路由返回值，而不是类型定义。

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/types/index.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts
git commit -m "test: define analyze api error contract"
```

### Task 2: 新建领域错误基类和 Gemini 运行时配置模块

**Files:**
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyze-errors.ts`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/config/env.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyzer.test.ts`

**Step 1: 写缺少 Gemini 配置的失败测试**

在 `tests/unit/analyzer.test.ts` 中保留并加强“缺少 `GEMINI_API_KEY`”场景，期望抛出领域错误：

```ts
await expect(analyzeWord("transport", "zh-CN")).rejects.toMatchObject({
  name: "AnalyzeConfigError",
  code: "AI_CONFIG_ERROR",
  status: 500,
  retryable: false,
});
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/analyzer.test.ts -t "missing"`

Expected:
- FAIL，因为当前只会抛出普通 `Error("Missing GEMINI_API_KEY")`。

**Step 3: 写最小实现**

先新建 `src/lib/services/analyze-errors.ts`，至少定义：

```ts
export class AnalyzeServiceError extends Error {
  constructor(
    public code: string,
    public status: number,
    public publicMessage: string,
    public retryable: boolean,
    public upstreamStatus?: number,
  ) {
    super(publicMessage);
  }
}

export class AnalyzeConfigError extends AnalyzeServiceError {
  constructor() {
    super("AI_CONFIG_ERROR", 500, "AI 服务配置异常，暂时无法分析", false);
    this.name = "AnalyzeConfigError";
  }
}
```

再新建 `src/lib/config/env.ts`，提供：

```ts
export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL_TEXT?.trim() || "gemini-2.5-flash";

  if (!apiKey) {
    throw new AnalyzeConfigError();
  }

  return { apiKey, model };
}
```

然后在 `src/lib/services/analyzer.ts` 中改为从该模块读取配置，不再直接读取 `process.env`。

**Step 4: 重新运行测试，确认通过**

Run: `pnpm exec vitest run tests/unit/analyzer.test.ts -t "missing"`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyze-errors.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/src/lib/config/env.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyzer.test.ts
git commit -m "feat: validate gemini server config"
```

### Task 3: 为 analyzer 引入领域错误并映射 Gemini 状态码

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyzer.test.ts`

**Step 1: 写 401/403/429/5xx/响应非法 的失败测试**

在 `tests/unit/analyzer.test.ts` 中新增 4 组 mock `fetch`：

```ts
new Response("{}", { status: 401 })
new Response("{}", { status: 429 })
new Response("{}", { status: 503 })
new Response(JSON.stringify({ candidates: [] }), { status: 200 })
```

分别断言：

```ts
await expect(analyzeWord("transport", "en")).rejects.toMatchObject({
  code: "AI_AUTH_ERROR",
  status: 503,
  retryable: false,
});
```

将其他场景分别断言为：
- `AI_RATE_LIMITED`
- `AI_UPSTREAM_ERROR`
- `AI_RESPONSE_INVALID`

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/analyzer.test.ts`

Expected:
- FAIL，当前 `requestGemini()` 只会抛 `Gemini request failed with status ...` 或原生解析异常。

**Step 3: 写最小实现**

在已有的 `src/lib/services/analyze-errors.ts` 中补齐其余错误：

```ts
export class AnalyzeAuthError extends AnalyzeServiceError {}
export class AnalyzeRateLimitError extends AnalyzeServiceError {}
export class AnalyzeUpstreamError extends AnalyzeServiceError {}
export class AnalyzeResponseInvalidError extends AnalyzeServiceError {}
```

建议各类错误的构造器直接内置：
- `AnalyzeAuthError` -> `("AI_AUTH_ERROR", 503, "AI 服务认证异常，请稍后再试", false, upstreamStatus)`
- `AnalyzeRateLimitError` -> `("AI_RATE_LIMITED", 429, "当前请求较多，请稍后重试", true, upstreamStatus)`
- `AnalyzeUpstreamError` -> `("AI_UPSTREAM_ERROR", 503, "AI 服务暂时不可用，请稍后重试", true, upstreamStatus)`
- `AnalyzeResponseInvalidError` -> `("AI_RESPONSE_INVALID", 502, "AI 返回结果异常，请稍后重试", true, upstreamStatus)`

在 `src/lib/services/analyzer.ts` 中按 Gemini 返回状态映射：

```ts
if (response.status === 401 || response.status === 403) {
  throw new AnalyzeAuthError(response.status);
}
if (response.status === 429) {
  throw new AnalyzeRateLimitError(response.status);
}
if (response.status >= 500) {
  throw new AnalyzeUpstreamError(response.status);
}
```

对 `extractGeminiText()`、`JSON.parse()`、`geminiAnalysisSchema.parse()` 失败统一包成 `AnalyzeResponseInvalidError`。

**Step 4: 重新运行测试，确认通过**

Run: `pnpm exec vitest run tests/unit/analyzer.test.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyze-errors.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyzer.test.ts
git commit -m "feat: classify gemini analyze failures"
```

### Task 4: 在路由中映射错误码、状态码并记录结构化日志

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/api/analyze/route.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts`

**Step 1: 写失败中的路由映射测试**

为 `POST /api/analyze` 新增这些场景：
- analyzer 抛 `AnalyzeConfigError`
- analyzer 抛 `AnalyzeRateLimitError`
- analyzer 抛 `AnalyzeResponseInvalidError`

分别断言返回：

```ts
expect(response.status).toBe(500);
expect(payload.code).toBe("AI_CONFIG_ERROR");
expect(payload.retryable).toBe(false);
```

```ts
expect(response.status).toBe(429);
expect(payload.code).toBe("AI_RATE_LIMITED");
expect(payload.retryable).toBe(true);
```

```ts
expect(response.status).toBe(502);
expect(payload.code).toBe("AI_RESPONSE_INVALID");
expect(payload.retryable).toBe(true);
```

并用 `vi.spyOn(console, "error")` 断言路由记录了结构化日志。

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/analyze-route-schema.test.ts`

Expected:
- FAIL，当前路由仍返回统一 `500 + message`，且没有结构化日志。

**Step 3: 写最小实现**

在 `src/app/api/analyze/route.ts` 中：
- 识别 `AnalyzeServiceError`
- 返回 `ok/code/message/retryable`
- 对 `z.ZodError` 返回：

```ts
{
  ok: false,
  code: "INVALID_REQUEST",
  message: "Invalid request: word is required",
  retryable: false,
}
```

- 对 analyzer 错误输出：

```ts
console.error("analyze_failed", {
  word: payload.word,
  locale: payload.locale,
  code: error.code,
  status: error.status,
  upstreamStatus: error.upstreamStatus ?? null,
  retryable: error.retryable,
});
```

**Step 4: 重新运行测试，确认通过**

Run: `pnpm exec vitest run tests/unit/analyze-route-schema.test.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/api/analyze/route.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts
git commit -m "feat: map analyze service errors in route"
```

### Task 5: 更新首页与结果页错误交互

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/search-hero.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/analyze-result-view.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/word/[slug]/page.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/messages/zh-CN.json`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/messages/en.json`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/tests/e2e/search-flow.spec.ts`

**Step 1: 先写前端失败交互测试**

如果当前没有组件级测试，先在 e2e 中补 2 个场景：
- 首页点击示例词，接口返回 `AI_UPSTREAM_ERROR`
- 结果页直开 `/word/transport`，接口返回 `AI_CONFIG_ERROR`

断言：

```ts
await expect(page.getByText("AI 服务暂时不可用，请稍后重试")).toBeVisible();
```

以及：

```ts
await expect(page.getByText("AI 服务配置异常，暂时无法分析")).toBeVisible();
await expect(page.getByRole("button", { name: "重试" })).toHaveCount(0);
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec playwright test tests/e2e/search-flow.spec.ts`

Expected:
- FAIL，当前首页 toast 仍是统一文案，结果页失败态仍总是显示重试按钮。

**Step 3: 写最小实现**

在 `messages/zh-CN.json` 和 `messages/en.json` 的 `analyze` 节点新增：

```json
"errors": {
  "INVALID_REQUEST": "...",
  "AI_CONFIG_ERROR": "...",
  "AI_AUTH_ERROR": "...",
  "AI_RATE_LIMITED": "...",
  "AI_UPSTREAM_ERROR": "...",
  "AI_RESPONSE_INVALID": "..."
}
```

在 `search-hero.tsx` 中读取失败响应：

```ts
if (!response.ok || !payload.ok) {
  throw new ErrorResponse(payload);
}
```

最小做法是新增一个本地辅助函数，根据 `payload.code` 映射显示文案。

在 `analyze-result-view.tsx` 中把错误状态从布尔值改成：

```ts
const [errorState, setErrorState] = useState<{
  message: string;
  retryable: boolean;
} | null>(null);
```

并在渲染时按 `retryable` 决定是否显示按钮。

**Step 4: 重新运行测试，确认通过**

Run: `pnpm exec playwright test tests/e2e/search-flow.spec.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/components/features/search-hero.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/components/features/analyze-result-view.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/word/[slug]/page.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/messages/zh-CN.json \
  /Users/liubo/Desktop/PROJECT/word-dino/messages/en.json
git commit -m "feat: surface analyze error states in ui"
```

### Task 6: 修正文档和环境变量示例

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/.env.example`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/README.md`

**Step 1: 写最小文档变更清单**

在 README 中增加：
- 本地运行所需 Node / pnpm 命令
- `/api/analyze` 依赖 `GEMINI_API_KEY`
- 可选的 `GEMINI_MODEL_TEXT`
- 部署到 Vercel 时生产环境必须设置 `GEMINI_API_KEY`

把 `.env.example` 改成：

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL_TEXT=gemini-2.5-flash
VOTE_HASH_SALT=change_me
GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

**Step 2: 运行基础校验**

Run: `pnpm exec vitest run tests/unit/analyzer.test.ts tests/unit/analyze-route-schema.test.ts`

Expected:
- PASS

Run: `pnpm exec playwright test tests/e2e/search-flow.spec.ts`

Expected:
- PASS

**Step 3: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/.env.example \
  /Users/liubo/Desktop/PROJECT/word-dino/README.md
git commit -m "docs: align analyze env requirements with gemini"
```

### Task 7: 全量验收

**Files:**
- No code changes expected

**Step 1: 运行单元测试**

Run: `pnpm exec vitest run`

Expected:
- PASS

**Step 2: 运行端到端测试**

Run: `pnpm exec playwright test`

Expected:
- PASS

**Step 3: 手工验证本地正常路径**

Run:

```bash
GEMINI_API_KEY=your_key pnpm dev
```

手工打开 `http://localhost:3000/zh-CN`，输入 `transport`。

Expected:
- 正常跳转到 `/zh-CN/word/transport`
- 页面展示分析结果

**Step 4: 手工验证本地失败路径**

Run:

```bash
unset GEMINI_API_KEY
pnpm dev
```

再次请求 `transport`。

Expected:
- 首页或结果页展示 “AI 服务配置异常，暂时无法分析”
- 不再只显示模糊的 “Analyze failed”

**Step 5: 提交最终验收说明**

```bash
git status
```

Expected:
- 工作区干净

如有补充文档，再单独提交：

```bash
git commit -m "test: verify analyze error governance"
```
