# 🦖 WordDino Project Progress

> **Mission**: Dig up the roots, master the words. (挖掘词根，征服单词)
> **Current Phase**: 🟢 Phase 0 (MVP)

## 📌 状态图例
- [ ] 🔴 待开始 (To Do)
- [ ] 🟡 进行中 (In Progress)
- [x] ✅ 已完成 (Done)

---

## 🟢 Phase 0: The "Spark" MVP (极简验证期)
**目标**：跑通“查词 -> 词根拆解 -> 图像助记”的核心闭环。无数据库，纯静态数据 + AI 生成。

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
- [x] **静态词根库**
    - [x] 创建 `lib/data/roots.json` (包含 10-20 个最常见的示例词根，如 `saur`, `ped`, `bio`).
    - [x] 定义 TypeScript 接口 (`types/index.ts`):
        - [x] `RootDefinition`
        - [x] `WordAnalysisResult`
        - [x] `MnemonicCardData`
- [x] **Mock 服务**
    - [x] 创建 `lib/services/mock-data.ts` 用于模拟 AI 返回的延迟和数据结构.

### 3. 后端逻辑 (Serverless API)
- [x] **分析接口** (`app/api/analyze/route.ts`)
    - [x] 实现 `POST` 请求处理逻辑.
    - [x] 步骤 1: 读取本地 `roots.json` 匹配词根.
    - [x] 步骤 2: (MVP) 返回 Mock 的 AI 速记数据 (谐音 + 故事).
    - [x] 步骤 3: (Advanced MVP) 集成 Vercel AI SDK 调用 LLM (Claude/OpenAI) 生成真实文本.
- [x] **图片生成接口** (可选)
    - [x] 预留 `app/api/generate-image/route.ts` 接口骨架.

### 4. 前端开发 (UI/UX)
- [ ] **通用组件**
    - [x] 导航栏 (`components/layout/Navbar`): 包含 WordDino Logo.
    - [ ] 页脚 (`components/layout/Footer`):包含 terms, policy, copyright
- [ ] **首页 (Home)**
    - [x] Hero Section: 居中大搜索框 (`SearchInput` 组件).
    - [x] 交互: 输入单词后跳转至 `/word/[slug]`.
- [ ] **结果页 (Result)**
    - [x] 布局: `SplitLayout` (左侧树，右侧卡片).
    - [x] **组件 A: 词根树 (`RootTreeVisualizer`)**: 使用 Flex/SVG 简单展示父子关系.
    - [x] **组件 B: 单词详情 (`WordHeader`)**: 音标、发音按钮.
    - [ ] **组件 C: 速记卡 (`MnemonicCard`)**:
        - [ ] 正面: 单词核心信息.
        - [ ] 背面/下部: AI 生成的插画 (占位符或 Next/Image) + 谐音故事.

### 5. 部署与测试 (Deploy)
- [ ] **本地测试**: 确保流程无 Bug，无 Hydration Error.
- [x] **SEO 配置**: 配置基本的 Metadata (Title, Description).
- [ ] **Vercel 部署**: 连接 GitHub 并自动部署.

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
