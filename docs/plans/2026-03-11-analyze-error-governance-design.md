# WordDino Analyze 错误治理设计

## 1. 目标
- 修复线上 `worddino.com` 输入单词后 `/api/analyze` 返回 500，前端只显示 `Analyze failed` 的问题。
- 保持“生产环境不做本地兜底”的产品策略，让失败原因可区分、可诊断、可监控。
- 把当前“所有异常都被压成一个 500”的链路拆成配置错误、上游认证错误、上游限流/故障、模型响应异常四类。

## 2. 当前上下文
- 线上 `https://www.worddino.com/api/analyze` 对 `transport` 的请求会稳定返回 500 和通用消息。
- 当前分析主链路在 [src/lib/services/analyzer.ts](/Users/liubo/Desktop/PROJECT/word-dino/src/lib/services/analyzer.ts) 中直接依赖 `GEMINI_API_KEY`。
- 当前 [src/app/api/analyze/route.ts](/Users/liubo/Desktop/PROJECT/word-dino/src/app/api/analyze/route.ts) 会吞掉所有运行时异常，并统一返回 `Analyze failed, please try again later`。
- 当前 [.env.example](/Users/liubo/Desktop/PROJECT/word-dino/.env.example) 仍然写的是 `OPENAI_API_KEY`，与真实运行依赖不一致，存在部署误导。
- 用户已确认：
  - 生产环境不接受本地兜底数据。
  - 前端错误提示要更明确、可操作。
  - 可以接受为部署校验和错误治理增加额外工作量。

## 3. 方案对比

### 3.1 方案 A：最小修复
- 补生产环境 `GEMINI_API_KEY`。
- 把 `.env.example` 改成 Gemini。
- 前端把通用报错改成 “AI 服务异常，请稍后重试”。

优点：
- 上线最快。
- 改动范围小。

缺点：
- 下一次遇到 401、429、Gemini 5xx 或响应解析失败，仍然难以区分。
- 用户体验和排障效率提升有限。

### 3.2 方案 B：分层错误模型
- 在 analyzer 层引入领域错误类型。
- 在 API 路由中映射明确的状态码、错误码和可展示文案。
- 前端根据错误码展示不同提示。
- 同步修正文档与环境变量说明。

优点：
- 用户知道是否该重试。
- 开发者能快速判断是配置、认证、上游还是解析问题。
- 改动集中在现有链路中，不需要额外部署流程。

缺点：
- 比最小修复多一层错误抽象。
- 需要补齐单元测试和前端行为覆盖。

### 3.3 方案 C：错误分层 + 部署期强校验
- 在方案 B 基础上，增加运行时配置模块和生产环境必填校验。
- 让缺少 Gemini 配置在更早阶段暴露，而不是等用户请求触发。
- 增加结构化日志，便于在 Vercel 中按错误码排查。

优点：
- 最符合“生产不兜底，但问题必须尽早暴露”的目标。
- 能同时提升用户体验、上线可靠性和运维可观察性。

缺点：
- 需要同时设计配置读取、错误分类、路由响应、前端展示和文档更新。

## 4. 核心决策
- 采用方案 C。
- 分析链路继续强依赖 Gemini，不回退到本地 mock 或 OpenAI 兜底。
- 前端展示明确但安全的错误提示，不泄露内部实现细节。
- 先不做自动重试，优先保证错误可见、可区分、可监控。

## 5. 错误分层设计

### 5.1 analyzer 领域错误
建议引入以下错误类型：
- `AnalyzeConfigError`
- `AnalyzeAuthError`
- `AnalyzeRateLimitError`
- `AnalyzeUpstreamError`
- `AnalyzeResponseInvalidError`

每个错误至少携带：
- `code`
- `message`
- `retryable`
- `status`
- `upstreamStatus`（可选）

### 5.2 错误分类规则
- 本地缺少 `GEMINI_API_KEY` 或配置非法：`AnalyzeConfigError`
- Gemini 返回 `401/403`：`AnalyzeAuthError`
- Gemini 返回 `429`：`AnalyzeRateLimitError`
- Gemini 返回 `5xx`、网络错误或超时：`AnalyzeUpstreamError`
- Gemini 返回 200 但正文为空、非 JSON、或不满足 schema：`AnalyzeResponseInvalidError`

### 5.3 状态码映射
- `400`：请求参数错误
- `429`：上游限流
- `500`：服务配置错误或内部不可恢复错误
- `502`：上游响应异常或响应无法解析
- `503`：上游服务暂时不可用

## 6. API 返回契约

### 6.1 成功结构
保持现有成功结构不变：

```json
{
  "ok": true,
  "data": {}
}
```

### 6.2 失败结构
失败结构扩展为：

```json
{
  "ok": false,
  "code": "AI_UPSTREAM_ERROR",
  "message": "AI 服务暂时不可用，请稍后重试",
  "retryable": true
}
```

字段约束：
- `code`：前端稳定分支依据
- `message`：可直接展示给用户
- `retryable`：决定是否显示或强调重试动作

### 6.3 错误码建议
- `INVALID_REQUEST`
- `AI_CONFIG_ERROR`
- `AI_AUTH_ERROR`
- `AI_RATE_LIMITED`
- `AI_UPSTREAM_ERROR`
- `AI_RESPONSE_INVALID`

## 7. 前端交互设计

### 7.1 首页搜索态
在 [src/components/features/search-hero.tsx](/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/search-hero.tsx) 中：
- 不再统一 toast “查询失败，请稍后再试”。
- 直接展示后端返回的安全文案。
- 如果 `retryable=false`，仍可提示，但不暗示用户连续点击有意义。

建议文案：
- `AI_CONFIG_ERROR` -> `AI 服务配置异常，暂时无法分析`
- `AI_AUTH_ERROR` -> `AI 服务认证异常，请稍后再试`
- `AI_RATE_LIMITED` -> `当前请求较多，请稍后重试`
- `AI_UPSTREAM_ERROR` -> `AI 服务暂时不可用，请稍后重试`
- `AI_RESPONSE_INVALID` -> `AI 返回结果异常，请稍后重试`

### 7.2 结果页失败态
在 [src/components/features/analyze-result-view.tsx](/Users/liubo/Desktop/PROJECT/word-dino/src/components/features/analyze-result-view.tsx) 中：
- 错误卡片显示明确原因，而不是只有“结果加载失败”。
- `retryable=true` 时显示 `Retry` 按钮。
- `retryable=false` 时隐藏重试按钮，或提供回到首页的动作。

### 7.3 i18n 规则
中英文文案都由 `messages/zh-CN.json` 与 [messages/en.json](/Users/liubo/Desktop/PROJECT/word-dino/messages/en.json) 统一维护。
前端只根据错误码读取 i18n 文案，不自己拼接 HTTP 错误信息。

## 8. 配置校验与日志设计

### 8.1 配置校验
新增统一的服务端环境配置模块，例如：
- `src/lib/config/env.ts`

职责：
- 统一读取 `GEMINI_API_KEY`、`GEMINI_MODEL_TEXT`
- 对缺失或空字符串进行校验
- 在生产环境下把关键配置缺失升级为明确的配置错误

### 8.2 结构化日志
`/api/analyze` 失败时记录结构化日志，字段建议包含：
- `word`
- `locale`
- `errorCode`
- `status`
- `upstreamStatus`
- `retryable`
- `timestamp`

约束：
- 不记录完整 API key
- 不记录用户隐私信息
- 不记录完整模型原始返回

### 8.3 自动重试策略
本轮不引入自动重试。
理由：
- 当前首要目标是把错误分型、排障、监控先打通。
- `401/403/429/5xx` 的处理策略不同，盲目统一重试会掩盖真实问题。

## 9. 测试设计

### 9.1 单元测试
扩展 [tests/unit/analyzer.test.ts](/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyzer.test.ts)：
- 缺少 `GEMINI_API_KEY`
- Gemini `401/403`
- Gemini `429`
- Gemini `5xx`
- Gemini 200 但无有效 JSON

扩展 [tests/unit/analyze-route-schema.test.ts](/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/analyze-route-schema.test.ts)：
- 路由把领域错误正确映射为 `code/status/retryable/message`
- `400` 请求参数错误仍可区分

### 9.2 前端/端到端测试
更新 [tests/e2e/search-flow.spec.ts](/Users/liubo/Desktop/PROJECT/word-dino/tests/e2e/search-flow.spec.ts)：
- 模拟不同错误码返回
- 断言 toast 或结果页错误卡片文案正确
- 断言 `retryable=false` 时不出现误导性重试

## 10. 范围边界

### 10.1 本轮包含
- Gemini 配置读取与校验
- analyzer 领域错误分类
- `/api/analyze` 失败返回契约升级
- 前端首页和结果页错误体验升级
- i18n 文案补齐
- README 与 `.env.example` 对齐
- 单测与 e2e 覆盖

### 10.2 本轮不包含
- React 418 hydration 问题排查
- 自动重试与指数退避
- 接入外部告警平台
- 分析结果持久化或缓存策略调整

## 11. 验收标准
- 生产环境缺少 `GEMINI_API_KEY` 时，错误能被明确识别为配置问题，而不是模糊 500。
- Gemini 返回 `401/403/429/5xx` 时，API 能映射为不同的错误码与状态码。
- 首页和结果页都能显示明确、可操作的错误提示。
- `.env.example` 与 README 不再误导为 OpenAI 配置。
- 单元测试与 e2e 测试覆盖主要错误路径。
