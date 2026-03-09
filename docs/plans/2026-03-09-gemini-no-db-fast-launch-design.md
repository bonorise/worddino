# WordDino Gemini 无数据库极速上线设计

## 1. 目标
- 今天上线一个可用的 WordDino 第一版。
- 只保留最小闭环：搜索单词、调用 Gemini 生成分析结果、展示结果页。
- 不接数据库，不保留本地词根库，不做用户系统，不做投票持久化，不展示图片。

## 2. 核心决策
- 数据来源：纯 Google Gemini 驱动。
- 数据存储：不落库，只使用浏览器 `sessionStorage` 做当前会话缓存。
- 多语言：保留 `/zh-CN` 与 `/en` 路由，接口请求显式传入 `locale`，Gemini 只返回当前语言版本内容。
- 图片能力：只保留接口骨架，今天不上页面。
- 结果结构：统一使用单一分析数据结构，不再沿用数据库版 `WordDetail/Prisma` 模型。

## 3. 页面范围
### 3.1 首页
- 路由：`/{locale}`
- 能力：
  - 输入英文单词
  - 点击按钮或回车提交
  - 跳转到 `/{locale}/word/{slug}`
  - 提供 3-5 个示例词
- 不做：
  - 登录
  - 历史记录
  - 营销区块

### 3.2 结果页
- 路由：`/{locale}/word/{slug}`
- 页面固定模块：
  - 单词标题
  - 当前语言下的释义或学习解释
  - 词根拆解结果
  - 助记卡片
  - 例句
  - 词根关系图
- 当 Gemini 判断不可拆解时：
  - 正常展示助记和例句
  - 词根区显示“更适合整体记忆”的提示

## 4. 接口设计
### 4.1 主接口
- 路径：`POST /api/analyze`
- 请求体：

```json
{
  "word": "transport",
  "locale": "zh-CN"
}
```

- 成功响应：

```json
{
  "ok": true,
  "data": {
    "word": "transport",
    "normalizedWord": "transport",
    "locale": "zh-CN",
    "decomposable": true,
    "explanation": "整体释义或学习提示",
    "morphemes": [
      {
        "text": "trans",
        "kind": "prefix",
        "meaning": "across"
      },
      {
        "text": "port",
        "kind": "root",
        "meaning": "carry"
      }
    ],
    "mnemonics": [
      {
        "type": "story",
        "title": "故事助记",
        "content": "把 transport 想成……"
      }
    ],
    "recommendedType": "story",
    "examples": [
      "This bus can transport people to the town."
    ],
    "familyWords": [
      "portable",
      "export",
      "import"
    ],
    "source": "gemini"
  }
}
```

### 4.2 字段约束
- `locale` 必须为 `zh-CN` 或 `en`
- `morphemes`、`mnemonics`、`examples`、`familyWords` 允许为空数组，但字段不能缺失
- `recommendedType` 只允许 `story | homophone | image`
- `source` 固定为 `gemini`

### 4.3 图片接口
- 路径：`POST /api/generate-image`
- 作用：只保留后续扩展契约
- 当前行为：返回 `501 not enabled` 或同等禁用状态

## 5. 错误处理与降级
- 输入非法：
  - 返回 `400`
  - 前端显示“请输入有效英文单词”
- Gemini 调用失败：
  - 返回 `500` 或 `502`
  - 前端显示失败提示，并提供重试按钮
- Gemini 返回结构不合法：
  - 视为服务失败
  - 不向前端透传不完整数据
- 今天不保留 mock 兜底数据链路，失败就明确失败
- 服务端记录错误日志，前端保证页面不崩

## 6. 上线范围边界
### 6.1 今天要做
- 修复阻碍构建和测试的工作区配置问题
- 收敛为单一主链路：`首页 -> /api/analyze -> 结果页`
- 将文本生成能力切到 Gemini
- 删除或旁路数据库、投票、本地词根库等今天不用的运行链路
- 保留 `zh-CN/en` 路由
- 保留图片接口骨架，但不接页面
- 完成本地构建与最小上线验证

### 6.2 今天不做
- 数据库和 Prisma 持久化
- 用户系统、收藏、历史记录
- 图片生成与展示
- 点赞/踩
- SEO 批量页面
- 完整双语润色
- 后台与监控系统

## 7. 验收标准
- 用户能从首页输入单词并进入结果页
- `zh-CN` 和 `en` 路由都可访问
- 接口按当前 `locale` 返回对应语言内容
- 成功响应能稳定渲染，不因字段缺失崩溃
- 失败时展示错误状态并支持重试
- 构建通过
- 至少手测 5 个单词：
  - `inspect`
  - `transport`
  - `construct`
  - `portable`
  - `biology`

## 8. 后续待办
- 完整双语内容与英文文案润色
- 接入 Gemini 图片生成并在结果页展示
- 如质量不稳，再补一个小型静态词根表
- 引入数据库与缓存层
- 增加用户反馈、收藏与历史记录
- 增加 SEO 页面与 sitemap
