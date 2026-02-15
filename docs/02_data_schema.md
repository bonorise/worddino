# Data Schema & Type Definitions: WordDino

> Status: Synced with current implementation (Phase 0 No-DB runtime mode)
> Source of truth: `src/lib/data/roots.json` + `src/types/index.ts` + `src/app/api/analyze/route.ts`

## 0. 冲突检查与合并结论

以下是旧版文档与当前代码的冲突，以及已采用的合并方案：

1. 根词字段命名冲突
   - 旧文档：`root`
   - 代码：`text`
   - 结论：统一使用 `text`（兼容 prefix/root/suffix 三种类型）

2. 释义结构冲突
   - 旧文档：`meaning` 为单字符串
   - 代码：`meaning` 为中英对象 `{ zhCN, en }`
   - 结论：统一使用双语对象，便于 i18n 渲染

3. 词根元信息冲突
   - 旧文档：`origin/difficulty/tags/family`
   - 代码：`hint/examples`
   - 结论：Phase 0 保留轻量结构 `hint/examples`，不引入复杂频次与来源字段

4. `/api/analyze` 返回结构冲突
   - 旧文档：`meta/basic/roots/mnemonic` 分层结构
   - 代码：扁平结构 `WordAnalysisResult`
   - 结论：以现有实现为准，文档更新为扁平结构

5. 数据来源枚举冲突
   - 旧文档：`cache|ai|static`
   - 代码：`mock|ai`
   - 结论：Phase 0 使用 `mock|ai`（无 key 自动降级 mock）

## 1. Static Data Schema (Phase 0)

文件：`src/lib/data/roots.json`

```json
[
  {
    "text": "spect",
    "kind": "root",
    "meaning": {
      "zhCN": "看",
      "en": "look"
    },
    "hint": "和观察、观看有关",
    "examples": ["inspect", "respect", "spectator"]
  }
]
```

字段定义：

- `text: string`
- `kind: "prefix" | "root" | "suffix"`
- `meaning: { zhCN: string; en: string }`
- `hint?: string`
- `examples: string[]`

## 2. TypeScript Interfaces (Current)

文件：`src/types/index.ts`

```ts
export interface RootDefinition {
  text: string;
  kind: "prefix" | "root" | "suffix";
  meaning: {
    zhCN: string;
    en: string;
  };
  hint?: string;
  examples: string[];
}

export interface MnemonicCardData {
  type: "homophone" | "story" | "image";
  title: string;
  contentZhCN: string;
  contentEn: string;
}

export interface WordAnalysisResult {
  word: string;
  normalizedWord: string;
  rootFound: boolean;
  matchedRoots: RootDefinition[];
  mnemonicCards: MnemonicCardData[];
  recommendedType: "homophone" | "story" | "image";
  explanation: {
    zhCN: string;
    en: string;
  };
  source: "mock" | "ai";
}
```

## 3. API Contract: `/api/analyze` (POST)

文件：`src/app/api/analyze/route.ts`

Request body:

```json
{
  "word": "transport"
}
```

Success response (`200`):

```json
{
  "ok": true,
  "data": {
    "word": "transport",
    "normalizedWord": "transport",
    "rootFound": true,
    "matchedRoots": [],
    "mnemonicCards": [],
    "recommendedType": "story",
    "explanation": {
      "zhCN": "string",
      "en": "string"
    },
    "source": "mock"
  }
}
```

Error response:

- `400`：请求参数不合法
- `500`：服务处理失败

```json
{
  "ok": false,
  "message": "Invalid request: word is required"
}
```

## 4. Validation Rules (Implemented)

请求校验：

- `word` 必填，去空格后长度 >= 1
- analyzer 内部会再次校验，仅允许英文单词字符（支持 `'` 和 `-`）

降级策略：

- 若 `OPENAI_API_KEY` 为空：强制使用 `mock` 数据返回
- 若 AI 调用失败：自动 fallback 到 `mock`

## 5. Future DB Note (暂不启用)

当前 Phase 0 已确认为 No-DB 运行模式，数据库结构暂不作为实现约束。后续进入数据库阶段时，以 `prisma/schema.prisma` 为唯一权威源，再同步文档。
