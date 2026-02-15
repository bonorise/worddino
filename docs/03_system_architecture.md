# System Architecture & Logic Flow

## 1. The "Analyzer" Service (`lib/services/analyzer.ts`)

这是后端的核心逻辑层，负责编排数据。

**Flow:**
1.  **Receive Input**: 用户输入 "Inspect"。
2.  **Local Lookup**: 
    -   读取 `roots.json`。
    -   查找是否有匹配的词根（如 `spect`）。
3.  **AI Construction (Simulation for MVP)**:
    -   如果本地有词根：构建 Prompt，将词根信息喂给 AI，要求 AI 基于此词根生成速记故事。
    -   如果本地无词根：要求 AI 尝试拆解，或者使用“非词根”的联想记忆法。
4.  **Response Construction**: 组装成 `WordAnalysisResult` 格式返回给前端。

## 2. API Route (`app/api/analyze/route.ts`)

-   Method: `POST`
-   Body: `{ word: "example" }`
-   Output: JSON (符合 `WordAnalysisResult` 接口)

## 3. AI Service Integration
-   **Text**: 使用 OpenAI/Anthropic SDK (MVP阶段可先用 Mock 数据跑通流程，再接入 Key)。
-   **Image**: 预留 `generateImage(prompt)` 函数，调用 Google Nano Banana 或类似 API。
    -   *Strategy*: 前端先显示文本，图片部分显示 "Generating..." 骨架屏，客户端异步请求图片生成接口。