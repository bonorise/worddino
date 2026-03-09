# 🦖 WordDino Project Progress

> **Mission**: Dig up the roots, master the words. (挖掘词根，征服单词)
> **Current Phase**: 🟢 Phase 0 (MVP)

## 📌 状态图例
- [ ] 🔴 待开始 (To Do)
- [ ] 🟡 进行中 (In Progress)
- [x] ✅ 已完成 (Done)

---

## 🟢 Phase 0: The "Spark" MVP (极简验证期)
**目标**：跑通“查词 -> Gemini 分析 -> 助记与同族词关系图展示”的核心闭环。无数据库，纯 AI 生成。

### 1. 项目初始化 (Initialization)
- [x] **脚手架搭建**
    - [x] 初始化 Next.js 15 (App Router, TypeScript, ESLint).
    - [x] 安装 Tailwind CSS v3.4 & 配置 `tailwind.config.ts`.
    - [x] 安装 `shadcn/ui` 并初始化 (Base color: Slate/Indigo).
    - [x] 安装核心依赖: `lucide-react`, `framer-motion`, `clsx`, `tailwind-merge`.
- [x] **文档注入**
    - [x] 创建 `docs/` 目录并填入 5 个核心架构文档.
    - [x] 确认 `agent.md`已生效.

### 2. 数据层 (Data Core - No DB)
- [x] **无数据库运行模式**
    - [x] 移除 Prisma/投票/生成状态等数据库运行链路.
    - [x] 查询结果改为浏览器 `sessionStorage` 会话缓存.
- [x] **Gemini 结构化输出**
    - [x] 定义 Gemini 返回的统一结构和校验规则.
    - [x] 接口按 `locale` 返回当前语言内容.

### 3. 后端逻辑 (Serverless API)
- [x] **分析接口** (`app/api/analyze/route.ts`)
    - [x] 实现 `POST` 请求处理逻辑.
    - [x] 校验 `word + locale`.
    - [x] 切换为 Google Gemini 结构化输出.
- [x] **图片生成接口** (可选)
    - [x] 保留 `app/api/generate-image/route.ts` 接口骨架，并在当前版本显式禁用.

### 4. 前端开发 (UI/UX)
- [ ] **通用组件**
    - [x] 导航栏 (`components/layout/Navbar`): 包含 WordDino Logo.
    - [ ] 页脚 (`components/layout/Footer`):包含 terms, policy, copyright
- [ ] **首页 (Home)**
    - [x] Hero Section: 居中大搜索框 (`SearchInput` 组件).
    - [x] 交互: 输入单词后按当前语言跳转到 `/[locale]/word/[slug]`.
- [x] **结果页 (Result)**
    - [x] 展示解释、词根拆解、助记卡片、例句、同族词关系图.
    - [x] 错误状态和重试状态可用.
    - [x] 保留 `zh-CN` / `en` 双语路由.

### 5. 部署与测试 (Deploy)
- [x] **本地测试**: 单测、e2e 与本地 `build` 已通过.
- [x] **SEO 配置**: 配置基本的 Metadata (Title, Description).
- [x] **Vercel 部署**: 已发布到 Vercel 生产环境.

### 6. 当前待办
- [ ] 完整双语内容润色（尤其英文文案）
- [ ] 接入 Gemini 图片生成并展示
- [ ] 清理旧的 OpenAI/Prisma 依赖与脚本

---

## ⚪ Phase 1: Short-term (留存与数据库)
**目标**：引入 Supabase，实现数据持久化和用户系统。

- [ ] **数据库集成**
    - [ ] 初始化 Supabase 项目.
    - [ ] 设计 Schema (`roots`, `words`, `users`, `saved_words`).
    - [ ] 迁移 `roots.json` 到数据库.
- [ ] **用户系统**
    - [ ] 集成 Supabase Auth (Google/GitHub Login).
    - [ ] 开发“生词本”功能 (Bookmark toggle).
- [ ] **性能优化**
    - [ ] 实现 API 响应缓存 (Cache generated mnemonics).

---

## ⚪ Phase 2: Mid-term (增长与 SEO)
**目标**：批量生产内容，通过 SEO 获取自然流量。

- [ ] **SEO 矩阵**
    - [ ] 利用 ISR (Incremental Static Regeneration) 批量生成高频 3000 词页面.
    - [ ] 生成 `sitemap.xml`.
- [ ] **社区互动**
    - [ ] 增加“点赞/有用”按钮 (Feedback Loop).
    - [ ] 首页增加“实时挖掘动态” (Recent Searches).
- [ ] **游戏化**
    - [ ] 开发简单的连连看小游戏 (Root Matching).

---

## ⚪ Phase 3: Long-term (全球化平台)
**目标**：多语言支持与商业化。

- [ ] **国际化 (i18n)**
    - [x] 引入 `next-intl`.
    - [ ] 配置多语言路由 (`/es`, `/jp`, `/fr`).
- [ ] **商业化**
    - [ ] 接入 Stripe 支付.
    - [ ] 开发 Pro 会员权益 (无限查询, 高清图下载).
