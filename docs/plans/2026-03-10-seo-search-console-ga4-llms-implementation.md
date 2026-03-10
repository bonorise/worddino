# WordDino SEO / Search Console / GA4 / llms.txt Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 `https://www.worddino.com` 落地 canonical、sitemap、robots、llms.txt、Google Search Console 验证与 GA4 基础统计，并完成线上验证。

**Architecture:** 先用纯函数把站点 URL、canonical、环境变量读取逻辑集中在 `src/lib/site.ts`，再让各页面通过 `generateMetadata` 输出规范 URL。抓取入口使用 Next.js App Router 原生 `robots.ts` 和 `sitemap.ts`，`llms.txt` 作为静态文件发布。Google Search Console 与 GA4 的平台资产通过浏览器创建，产出的验证 token 和 Measurement ID 回填到 Vercel 环境变量后再做一次生产部署。

**Tech Stack:** Next.js 16 App Router、TypeScript、next-intl、Vitest、Playwright、Vercel CLI、Google Search Console、Google Analytics 4、Chrome（已登录 `bonorise@gmail.com`）

---

### Task 1: 建立站点 SEO 常量与环境变量入口

**Files:**
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/src/lib/site.ts`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/site.test.ts`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/.env.example`

**Step 1: 写失败中的单元测试，锁定 URL 与环境变量契约**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  buildCanonicalUrl,
  getGaMeasurementId,
  getGoogleSiteVerification,
  SITE_URL,
} from "@/lib/site";

describe("site helpers", () => {
  it("builds canonical URLs on the www primary domain", () => {
    expect(SITE_URL.toString()).toBe("https://www.worddino.com/");
    expect(buildCanonicalUrl("/zh-CN")).toBe("https://www.worddino.com/zh-CN");
    expect(buildCanonicalUrl("/en/about")).toBe("https://www.worddino.com/en/about");
  });

  it("trims google verification and ga ids from env", () => {
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "  verify-token  ");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "  G-TEST1234  ");

    expect(getGoogleSiteVerification()).toBe("verify-token");
    expect(getGaMeasurementId()).toBe("G-TEST1234");
  });
});
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/site.test.ts`

Expected:
- FAIL，提示找不到 `@/lib/site` 或相关导出。

**Step 3: 写最小实现**

```ts
export const SITE_URL = new URL("https://www.worddino.com");

export function buildCanonicalUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

export function getGoogleSiteVerification() {
  return process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
}

export function getGaMeasurementId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || undefined;
}
```

`.env.example` 追加：

```dotenv
GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

**Step 4: 重新运行测试，确认通过**

Run: `pnpm exec vitest run tests/unit/site.test.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/lib/site.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/site.test.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/.env.example
git commit -m "feat: add site seo helpers"
```

### Task 2: 为首页、静态页和动态词页补 canonical metadata

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/layout.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/page.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/about/page.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/privacy/page.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/terms/page.tsx`
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/word/[slug]/page.tsx`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/page-metadata.test.ts`

**Step 1: 写失败中的 metadata 单元测试**

```ts
import { describe, expect, it } from "vitest";
import { generateMetadata as generateHomeMetadata } from "@/app/[locale]/page";
import { generateMetadata as generateAboutMetadata } from "@/app/[locale]/about/page";
import { generateMetadata as generateWordMetadata } from "@/app/[locale]/word/[slug]/page";

describe("page metadata", () => {
  it("sets canonical for locale home", async () => {
    const metadata = await generateHomeMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });

    expect(metadata.alternates?.canonical).toBe("https://www.worddino.com/zh-CN");
  });

  it("sets canonical for static content pages", async () => {
    const metadata = await generateAboutMetadata({
      params: Promise.resolve({ locale: "en" }),
    });

    expect(metadata.alternates?.canonical).toBe("https://www.worddino.com/en/about");
  });

  it("sets canonical for word detail pages", async () => {
    const metadata = await generateWordMetadata({
      params: Promise.resolve({ locale: "en", slug: "transport" }),
    });

    expect(metadata.alternates?.canonical).toBe("https://www.worddino.com/en/word/transport");
  });
});
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/page-metadata.test.ts`

Expected:
- FAIL，提示页面模块没有导出 `generateMetadata`，或 canonical 为空。

**Step 3: 在页面中补最小 metadata 实现**

根布局改为使用 `SITE_URL`：

```ts
export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: "WordDino",
  description: "Dig up the roots. Master the words.",
};
```

各页面新增 `generateMetadata`：

```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: LocaleCode }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    alternates: {
      canonical: buildCanonicalUrl(`/${locale}`),
    },
  };
}
```

静态页路径分别是 `/${locale}/about`、`/${locale}/privacy`、`/${locale}/terms`；动态词页路径是 `/${locale}/word/${normalizeSlug(slug)}`。

**Step 4: 重新运行 metadata 测试**

Run: `pnpm exec vitest run tests/unit/page-metadata.test.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/layout.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/page.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/about/page.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/privacy/page.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/terms/page.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/[locale]/word/[slug]/page.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/page-metadata.test.ts
git commit -m "feat: add canonical metadata"
```

### Task 3: 发布 robots.txt、sitemap.xml 和 llms.txt

**Files:**
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/robots.ts`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/sitemap.ts`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/public/llms.txt`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/seo-routes.test.ts`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/llms.test.ts`

**Step 1: 写失败中的抓取入口测试**

```ts
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("seo routes", () => {
  it("points robots to the production sitemap", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://www.worddino.com/sitemap.xml");
  });

  it("returns only stable locale pages in the sitemap", async () => {
    const result = await sitemap();
    expect(result.map((item) => item.url)).toEqual([
      "https://www.worddino.com/zh-CN",
      "https://www.worddino.com/en",
      "https://www.worddino.com/zh-CN/about",
      "https://www.worddino.com/en/about",
      "https://www.worddino.com/zh-CN/privacy",
      "https://www.worddino.com/en/privacy",
      "https://www.worddino.com/zh-CN/terms",
      "https://www.worddino.com/en/terms",
    ]);
  });
});
```

`llms.txt` 测试：

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("llms.txt", () => {
  it("documents the site and links to the sitemap", () => {
    const content = readFileSync("public/llms.txt", "utf8");
    expect(content).toContain("WordDino");
    expect(content).toContain("https://www.worddino.com/sitemap.xml");
  });
});
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/seo-routes.test.ts tests/unit/llms.test.ts`

Expected:
- FAIL，提示缺少路由文件或 `public/llms.txt`。

**Step 3: 写最小实现**

`robots.ts`：

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: buildCanonicalUrl("/sitemap.xml"),
  };
}
```

`sitemap.ts`：

```ts
import type { MetadataRoute } from "next";

const stablePaths = [
  "/zh-CN",
  "/en",
  "/zh-CN/about",
  "/en/about",
  "/zh-CN/privacy",
  "/en/privacy",
  "/zh-CN/terms",
  "/en/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return stablePaths.map((path) => ({ url: buildCanonicalUrl(path) }));
}
```

`public/llms.txt` 至少包含：

```txt
# WordDino
WordDino helps learners study English vocabulary with morphemes, mnemonics, and word families.

Recommended entry points:
- https://www.worddino.com/zh-CN
- https://www.worddino.com/en
- https://www.worddino.com/en/about

Notes:
- AI-generated explanations are for learning reference only.
- Cross-check important facts with authoritative dictionaries.

Sitemap: https://www.worddino.com/sitemap.xml
```

**Step 4: 重新运行抓取入口测试**

Run: `pnpm exec vitest run tests/unit/seo-routes.test.ts tests/unit/llms.test.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/robots.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/sitemap.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/public/llms.txt \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/seo-routes.test.ts \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/llms.test.ts
git commit -m "feat: add crawl entrypoints"
```

### Task 4: 接入 Google Site Verification 和 GA4 脚本

**Files:**
- Modify: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/layout.tsx`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/src/components/analytics/google-analytics.tsx`
- Create: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/google-analytics.test.ts`

**Step 1: 写失败中的最小测试，锁定 GA 组件的开关行为**

```ts
import { describe, expect, it } from "vitest";
import { shouldEnableGoogleAnalytics } from "@/components/analytics/google-analytics";

describe("google analytics", () => {
  it("only enables analytics when a measurement id exists", () => {
    expect(shouldEnableGoogleAnalytics(undefined)).toBe(false);
    expect(shouldEnableGoogleAnalytics("")).toBe(false);
    expect(shouldEnableGoogleAnalytics("G-TEST1234")).toBe(true);
  });
});
```

**Step 2: 运行测试，确认当前失败**

Run: `pnpm exec vitest run tests/unit/google-analytics.test.ts`

Expected:
- FAIL，提示缺少 analytics 组件或导出。

**Step 3: 实现最小 GA 组件与 Search Console 验证输出**

`src/components/analytics/google-analytics.tsx`：

```tsx
"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function shouldEnableGoogleAnalytics(measurementId?: string) {
  return Boolean(measurementId?.trim());
}

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const pagePath = searchParams?.size ? `${pathname}?${searchParams}` : pathname;
    window.gtag?.("config", measurementId, { page_path: pagePath });
  }, [measurementId, pathname, searchParams]);

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} window.gtag = gtag; gtag('js', new Date()); gtag('config', '${measurementId}');`}
      </Script>
    </>
  );
}
```

根布局改动：

```ts
export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: "WordDino",
  description: "Dig up the roots. Master the words.",
  verification: {
    google: getGoogleSiteVerification(),
  },
};
```

并在 `<body>` 内按条件渲染：

```tsx
const gaMeasurementId = getGaMeasurementId();

{shouldEnableGoogleAnalytics(gaMeasurementId) ? (
  <GoogleAnalytics measurementId={gaMeasurementId!} />
) : null}
```

**Step 4: 重新运行 GA 单元测试**

Run: `pnpm exec vitest run tests/unit/google-analytics.test.ts`

Expected:
- PASS

**Step 5: 提交这一小步**

```bash
git add \
  /Users/liubo/Desktop/PROJECT/word-dino/src/app/layout.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/src/components/analytics/google-analytics.tsx \
  /Users/liubo/Desktop/PROJECT/word-dino/tests/unit/google-analytics.test.ts
git commit -m "feat: add google verification and analytics"
```

### Task 5: 做完整本地验证并准备生产发布

**Files:**
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/layout.tsx`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/robots.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/src/app/sitemap.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/public/llms.txt`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/site.test.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/page-metadata.test.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/seo-routes.test.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/llms.test.ts`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/tests/unit/google-analytics.test.ts`

**Step 1: 跑新增的全部单元测试**

Run:

```bash
pnpm exec vitest run \
  tests/unit/site.test.ts \
  tests/unit/page-metadata.test.ts \
  tests/unit/seo-routes.test.ts \
  tests/unit/llms.test.ts \
  tests/unit/google-analytics.test.ts
```

Expected:
- 所有新测试 PASS。

**Step 2: 跑现有测试，确认没有回归**

Run: `pnpm test`

Expected:
- 所有现有 unit tests PASS。

**Step 3: 产线构建一次**

Run: `pnpm build`

Expected:
- 构建通过，没有 metadata、App Router 或类型错误。

**Step 4: 本地启动并验证对外入口**

Run:

```bash
pnpm dev
curl -s http://127.0.0.1:3000/robots.txt
curl -s http://127.0.0.1:3000/sitemap.xml
curl -s http://127.0.0.1:3000/llms.txt
```

Expected:
- `robots.txt` 包含 sitemap 地址。
- `sitemap.xml` 包含 8 个稳定 URL。
- `llms.txt` 可访问。

**Step 5: 用 `@playwright` 或 `@agent-browser` 做一次本地页面抽检**

Expected:
- `/zh-CN`、`/en/about`、`/en/word/transport` 页面源码里存在 canonical 标签。
- 当未设置 `NEXT_PUBLIC_GA_MEASUREMENT_ID` 时，不加载 `googletagmanager` 脚本。

**Step 6: 提交这一小步**

```bash
git add -A
git commit -m "test: validate seo rollout locally"
```

### Task 6: 发布到 Vercel，并创建 Search Console 与 GA4 资产

**Files:**
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/.vercel/project.json`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/.env.example`
- Review: `/Users/liubo/Desktop/PROJECT/word-dino/docs/plans/2026-03-10-seo-search-console-ga4-llms-design.md`

**Step 1: 先发布不带 Google token 的 SEO 版本**

Run: `vercel --prod`

Expected:
- 生产部署成功。
- `https://www.worddino.com/robots.txt`、`/sitemap.xml`、`/llms.txt` 已对外可访问。

**Step 2: 用浏览器创建 Search Console URL-prefix property**

Use: `@agent-browser` 或 `@playwright`

Actions:
- 打开 Google Search Console
- 使用已登录账号 `bonorise@gmail.com`
- 创建 `URL prefix` 属性：`https://www.worddino.com/`
- 选择 HTML tag 验证方式
- 复制 `<meta name="google-site-verification" content="...">` 中的 token

Expected:
- 手里拿到 Search Console verification token，但此时先不要点击最终验证。

**Step 3: 用浏览器创建 GA4 property 和 Web stream**

Use: `@agent-browser` 或 `@playwright`

Actions:
- 打开 Google Analytics
- 新建 property，例如 `WordDino`
- 创建 Web data stream，网站 URL 使用 `https://www.worddino.com`
- 复制 `G-XXXXXXXXXX` Measurement ID

Expected:
- 手里拿到 GA4 Measurement ID。

**Step 4: 一次性把两个值写入 Vercel 环境变量**

Run:

```bash
vercel env add GOOGLE_SITE_VERIFICATION production
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID production
```

Expected:
- 成功写入两个环境变量。
- 如果有 preview 环境需要同步，再额外写入 preview。

**Step 5: 重新发布生产环境**

Run: `vercel --prod`

Expected:
- 新部署包含 Search Console meta 验证和 GA4 脚本。

**Step 6: 完成 Search Console 验证并提交 sitemap**

Use: `@agent-browser` 或 `@playwright`

Actions:
- 回到 Search Console 属性验证页，点击 Verify
- 验证成功后进入 Sitemaps 页面
- 提交 `https://www.worddino.com/sitemap.xml`

Expected:
- 属性验证成功。
- sitemap 状态为 Submitted 或 Success。

**Step 7: 验证 GA4 Realtime**

Use: `@agent-browser` 或 `@playwright`

Actions:
- 打开 `https://www.worddino.com/zh-CN`
- 在另一标签页进入 GA4 Realtime
- 确认至少出现 1 个活跃用户或页面浏览

Expected:
- GA4 能看到来自生产站点的访问。

**Step 8: 如果任何平台步骤失败，先用 `@systematic-debugging` 排查，不要盲目重复点击**

Expected:
- 先判断是部署未生效、meta token 错误、脚本未加载、Cookie banner 阻塞，还是 Google 后台自身延迟。

**Step 9: 记录最终交付信息**

Expected:
- 记下 Search Console 属性 URL。
- 记下 GA4 property 名称与 Measurement ID。
- 记下 `robots.txt`、`sitemap.xml`、`llms.txt` 最终线上地址。
