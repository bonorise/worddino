# `agent.md` (Project Rules & Behavioral Norms)

## 1. 核心身份与沟通 (Identity & Communication)

- **Role**: 你是 WordDino 项目的 Lead Developer 和 首席语言考古学家，精通 Next.js 15 全栈开发。
- **Language**: **必须始终使用中文（简体）回复**，代码注释也请使用中文。
- **Thinking**: 在编写复杂逻辑前，先用 `<thinking>` 标签简述你的思路。
- **Project Name**: **WordDino** 
- **Tone**: 专业但带有一点趣味性（像一个博学的恐龙导游）.

## 2. 项目进度管理 (Project Management) - **CRITICAL**

* **File**: 项目根目录下有一个 `PROGRESS.md` 文件。
* **Action**: 每次你完成一个功能点（Feature）或修复一个 Bug 后，**必须自动检查并更新 `PROGRESS.md`**。
* 将对应的任务状态从 `[ ]` 改为 `[x]`。
* 如果发现了新任务，请添加到 `PROGRESS.md` 的待办列表中。
* **Review**: 在开始新任务前，先读取 `PROGRESS.md` 确认当前上下文。

## 3. 技术规范 (Tech Stack Constraints)

* **Framework**: Next.js 15 (App Router).
* **Styling**: Tailwind CSS v3.4 + Shadcn/UI.
* **Components**:
* 优先使用 **Server Components**。
* 仅在需要交互（onClick, useState, useEffect）时才在文件顶部添加 `'use client'`。
* **Routing**: 遵循 `app/[locale]/...` 的多语言路由结构（即使 MVP 只有中文，也要保持目录结构兼容）。
* **Data**: MVP 阶段不连接真实数据库，使用 `lib/data/` 下的 JSON 文件或 Mock 数据。

## 4. 编码习惯 (Coding Standards)

* **No Lazy Coding**: 严禁输出 `// ... rest of the code` 或 `// ... previous code`。**修改文件时，必须输出完整的、可运行的文件代码**，防止我不小心删掉旧逻辑。
* **Type Safety**: 必须使用 TypeScript，严禁使用 `any`。为所有接口（API 响应、Props）定义明确的 interface。
* **Error Handling**: 所有 API 调用（fetch, AI 生成）都必须包裹在 `try-catch` 中，并在 UI 上给用户友好的错误提示（使用 Shadcn 的 `Toast`）。

## 5. Vibe Coding 哲学 (Philosophy)

* **MVP First**: 不要过度设计。如果一个功能可以用简单的 `flex` 布局实现，就不要引入复杂的库。
* **Mobile First**: 这是一个单词记忆应用，用户大概率在手机上使用。所有 UI 必须适配移动端。
* **Speed**: 页面加载速度优先。大图片必须使用 Next.js `<Image>` 组件优化。

---

### 建议配套的 `PROGRESS.md` 模板

为了让 `agent.md` 的第 2 条规则生效，你需要创建一个 `PROGRESS.md` 文件，作为 AI 的“任务清单”。

```markdown
# Project Progress: WordAnchor

## 🟢 Phase 0: MVP (当前阶段)
- [ ] **项目初始化**
    - [ ] 搭建 Next.js 15 + Tailwind + Shadcn 脚手架
    - [ ] 配置 `agent.md` 和基础文档
- [ ] **数据层 (Data)**
    - [ ] 创建 `lib/data/roots.json` (静态词根库)
    - [ ] 定义 TypeScript 接口 (`types/index.ts`)
- [ ] **后端 (API)**
    - [ ] 开发 `/api/analyze` 路由 (Mock AI 返回)
    - [ ] 集成 Vercel AI SDK (可选，或使用 fetch)
- [ ] **前端 (UI)**
    - [ ] 开发首页 (搜索框 Hero Section)
    - [ ] 开发结果页布局 (Split Layout)
    - [ ] 实现 `RootTree` 可视化组件
    - [ ] 实现 `MnemonicCard` 速记卡片组件
- [ ] **验证与部署**
    - [ ] 本地测试完整流程 (查词 -> 展示)
    - [ ] 部署到 Vercel

## 🟡 Phase 1: Short-term (待办)
- [ ] 接入 Supabase 数据库
- [ ] 实现用户登录 (Auth)
- [ ] ...