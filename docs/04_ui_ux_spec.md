# UI/UX Specifications

## 1. Design System (Vibe)
-   **Font**: Inter (英文), Noto Sans SC (中文).
-   **Colors**: 
    -   Primary: Deep Indigo (沉稳，代表知识).
    -   Accent: Vivid Orange (高亮，代表记忆点).
    -   Background: Clean White / Light Gray.
-   **Vibe**: 极简、快速、充满智慧感。

## 2. Page Structure

### A. Home / Search (`app/page.tsx`)
-   **Hero Section**: 垂直居中。
-   **Input**: 大号搜索框，带阴影，输入时有呼吸灯效果。
-   **Placeholder**: "输入单词，解锁记忆魔法... (e.g., Ambulance)"。

### B. Result View (`app/word/[slug]/page.tsx`)
采用 **"Split Layout" (分栏布局)**：

-   **Left Column (逻辑脑 - 30%宽度)**:
    -   **Component**: `RootTreeVisualizer`
    -   展示词根在中间，树枝伸向相关单词。
    -   当前单词高亮显示。
    
-   **Right Column (形象脑 - 70%宽度)**:
    -   **Header**: 单词 + 音标 + 发音按钮。
    -   **Main Card**: `MnemonicCard`
        -   **Visual**: AI 生成的插画（占卡片上半部分）。
        -   **Story**: 谐音梗/故事文本（占下半部分）。
        -   **Breakdown**: 词根拆解公式 (e.g., `In-` (into) + `-spect` (look))。

## 3. Interactive Elements
-   **Loading State**: 搜索时，展示“大脑正在连接神经元...”的动画，而不是枯燥的 Spinner。
-   **Feedback**: 卡片下方有简单的 "👍/👎" 按钮（MVP 阶段仅做 UI 交互，不存库）。