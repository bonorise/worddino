# WordDino

WordDino 是一个面向英语单词学习的 Next.js 应用，核心流程是：

- 输入单词
- 调用 `/api/analyze`
- 由 Gemini 生成结构化分析结果
- 在结果页展示解释、记忆锚点、词根拆解、助记卡片和同族词关系图

## 本地启动

先安装依赖：

```bash
pnpm install
```

复制环境变量并补全 Gemini 配置：

```bash
cp .env.example .env.local
```

至少需要配置：

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_TEXT=gemini-2.5-flash
```

启动开发环境：

```bash
pnpm dev
```

默认访问地址：

- [http://localhost:3000](http://localhost:3000)
- 中文首页：[http://localhost:3000/zh-CN](http://localhost:3000/zh-CN)
- 英文首页：[http://localhost:3000/en](http://localhost:3000/en)

## 关键环境变量

- `GEMINI_API_KEY`
  用于 `/api/analyze` 调用 Gemini。生产环境必须配置。
- `GEMINI_MODEL_TEXT`
  可选，默认值为 `gemini-2.5-flash`。
- `VOTE_HASH_SALT`
  可选，用于投票或反滥用逻辑。
- `GOOGLE_SITE_VERIFICATION`
  可选，用于站点验证。
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  可选，用于 GA4。

## 测试命令

单元测试：

```bash
pnpm test
```

端到端测试：

```bash
pnpm test:e2e
```

只跑本次修复相关测试：

```bash
pnpm exec vitest run tests/unit/analyze-route-schema.test.ts tests/unit/analyzer.test.ts
pnpm exec playwright test tests/e2e/search-flow.spec.ts
```

## 部署说明

如果部署到 Vercel 或其他平台，生产环境必须配置 `GEMINI_API_KEY`。否则：

- `/api/analyze` 会返回 `AI_CONFIG_ERROR`
- 前端会显示“AI 服务配置异常，暂时无法分析”

建议在部署平台同时配置：

```dotenv
GEMINI_API_KEY=...
GEMINI_MODEL_TEXT=gemini-2.5-flash
```
