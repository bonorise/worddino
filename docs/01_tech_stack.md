# Tech Stack & Constraints

## 1. Core Framework
-   **Next.js**: Version 15.x (App Router).
-   **Language**: TypeScript (Strict Mode).
-   **Styling**: Tailwind CSS v3.4.
-   **Components**: Shadcn/UI (based on Radix UI).
-   **Icons**: Lucide React.

## 2. Key Libraries
-   `framer-motion`: 用于卡片翻转和树节点的平滑动画。
-   `reactflow` OR simple `svg/flex`: 用于绘制词根树（MVP阶段推荐用简单的 Flex/Grid 布局配合 SVG 连线，保持轻量）。
-   `ai` (Vercel AI SDK): 用于处理流式文本生成。

## 3. Development Rules (Crucial for Codex)
-   **Server Components**: 默认使用服务端组件。只有需要交互（如搜索输入、卡片翻转）时才使用 `'use client'`。
-   **No Database**: MVP 阶段严禁引入 PostgreSQL/MySQL。所有“持久化”数据暂时存储在内存或不保存。
-   **API Design**: 使用 Next.js Route Handlers (`app/api/...`)。
-   **Code Style**: 模块化拆分。UI 组件放入 `components/ui`，业务组件放入 `components/features`。