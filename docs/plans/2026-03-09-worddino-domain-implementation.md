# WordDino 主域名与 308 永久跳转 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `www.worddino.com` 设为唯一主域名，并把 `worddino.com` 全量 `308` 永久跳转到对应的 `https://www.worddino.com/:path*`。

**Architecture:** 这次变更优先使用 Vercel Domains 的平台能力完成，不在 Next.js 应用代码里实现跨主机名跳转。Cloudflare 只保留 DNS 职责，应用继续保留现有的站内 `/ -> /zh-CN` 逻辑。SEO 的 `canonical` 与 `sitemap` 作为后续独立任务处理，不和本轮域名切换耦合。

**Tech Stack:** Vercel Domains、Cloudflare DNS、Next.js App Router、next-intl middleware、curl、Vercel CLI

---

### Task 1: 核对当前代码基线，确认没有冲突的域名逻辑

**Files:**
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/docs/plans/2026-03-09-worddino-domain-design.md`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/page.tsx`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/layout.tsx`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/middleware.ts`

**Step 1: 搜索现有重定向与 SEO 基线**

```bash
rg -n "redirect|canonical|metadataBase|sitemap|robots|worddino.com|www.worddino.com" \
  /Users/liubo/Desktop/PROJECT/word-dino/src \
  /Users/liubo/Desktop/PROJECT/word-dino/middleware.ts
```

**Step 2: 打开相关文件确认现状**

```bash
sed -n '1,120p' /Users/liubo/Desktop/PROJECT/word-dino/src/app/page.tsx
sed -n '1,160p' /Users/liubo/Desktop/PROJECT/word-dino/src/app/layout.tsx
sed -n '1,120p' /Users/liubo/Desktop/PROJECT/word-dino/middleware.ts
```

**Step 3: 判定是否继续**

Expected:
- 只看到站内 `/ -> /zh-CN` 的应用逻辑。
- 没有 host-based redirect。
- 没有现成 `canonical`、`metadataBase`、`sitemap` 配置阻碍本轮切换。

### Task 2: 用 Vercel CLI 获取当前域名状态与精确 DNS 要求

**Files:**
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/.vercel/project.json`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/docs/plans/2026-03-09-worddino-domain-design.md`

**Step 1: 检查 apex 域名状态**

```bash
vercel domains inspect worddino.com
```

Expected:
- 输出当前 `worddino.com` 是否已接入当前 Vercel 项目。
- 如果 DNS 尚未正确配置，输出所需记录值。

**Step 2: 检查 `www` 域名状态**

```bash
vercel domains inspect www.worddino.com
```

Expected:
- 输出当前 `www.worddino.com` 是否已接入当前 Vercel 项目。
- 如果 DNS 尚未正确配置，输出所需记录值。

**Step 3: 记录 DNS 目标值**

Expected:
- 把 CLI 实际返回的记录值作为唯一来源。
- 不凭记忆手填 apex A 记录或 `www` CNAME 目标。

### Task 3: 在 Cloudflare 对齐 DNS，只做托管不做重定向

**Files:**
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/docs/plans/2026-03-09-worddino-domain-design.md`

**Step 1: 按 Vercel CLI 返回值更新 Cloudflare DNS**

Expected:
- `worddino.com` 与 `www.worddino.com` 的 DNS 记录严格使用上一步 CLI 提示的值。
- 同名冲突记录先清理，再保留最终生效记录。

**Step 2: 清理 Cloudflare 上与跳转相关的额外规则**

Expected:
- 不存在 Redirect Rules。
- 不存在 Page Rules。
- 不存在 Workers 或 Transform Rules 介入域名跳转。

**Step 3: 反复检查直到 Vercel 识别配置有效**

```bash
vercel domains inspect worddino.com
vercel domains inspect www.worddino.com
```

Expected:
- 两个域名都不再提示错误 DNS 配置。
- 至少达到可在 Vercel Domains 页面进入 `Ready` 的状态。

### Task 4: 在 Vercel 中设置主域名与 apex 到 `www` 的永久跳转

**Files:**
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/docs/plans/2026-03-09-worddino-domain-design.md`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/.vercel/project.json`

**Step 1: 将两个域名都接入当前项目**

Expected:
- `worddino.com` 和 `www.worddino.com` 都出现在当前 `word-dino` 项目的 Domains 列表中。

**Step 2: 将 `www.worddino.com` 设为 Primary Domain**

Expected:
- Vercel 明确把 `www.worddino.com` 标记为主域名。

**Step 3: 将 `worddino.com` 配置为跳转到 `https://www.worddino.com`**

Expected:
- apex 域名不再直接提供内容。
- 所有 apex 请求都交由 Vercel 做永久跳转到 `www`。

**Step 4: 接受平台实际返回结果，不猜测状态码设置项名称**

Expected:
- 如果 Vercel 控制台没有单独暴露状态码选择器，以最终 HTTP 响应验证为准。
- 最终验收必须是 `308`。

### Task 5: 验证线上跳转、路径保留与站内语言跳转

**Files:**
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/page.tsx`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/middleware.ts`

**Step 1: 验证 apex 根路径跳转**

```bash
curl -I https://worddino.com
```

Expected:
- 响应状态为 `308`。
- `Location` 为 `https://www.worddino.com/`。

**Step 2: 验证 apex 任意路径跳转**

```bash
curl -I https://worddino.com/test-path
```

Expected:
- 响应状态为 `308`。
- `Location` 为 `https://www.worddino.com/test-path`。

**Step 3: 验证 `www` 域名下的应用行为**

```bash
curl -IL https://www.worddino.com/
```

Expected:
- 最终响应成功。
- 如果首页触发站内语言跳转，最终 URL 仍保持在 `https://www.worddino.com/...` 下。

**Step 4: 在浏览器人工检查无循环跳转**

Expected:
- `worddino.com -> www.worddino.com -> /zh-CN` 这样的链路最多只发生一次站内跳转。
- 不存在回跳到 apex 的情况。

## Deferred Follow-ups
- 在 `/Users/liubo/Desktop/PROJECT/word-dino/src/app/layout.tsx` 及相关页面 metadata 中补充 `metadataBase` 与 `canonical`，统一使用 `https://www.worddino.com`。
- 增加 `sitemap` 生成与发布。
- 视上线后情况补充 `robots` 与更完整的 SEO 规范化设置。
