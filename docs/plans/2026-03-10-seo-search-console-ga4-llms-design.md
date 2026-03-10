# WordDino SEO / Search Console / GA4 / llms.txt 设计

## 1. 目标
- 为 `https://www.worddino.com` 补齐规范化 SEO 基础设施，包括 `metadataBase`、`canonical`、`robots.txt`、`sitemap.xml` 与 `llms.txt`。
- 在 Google Search Console 中创建并验证新的站点资产，并提交站点地图。
- 在 Google Analytics 4 中创建新的统计资产，并把埋点接入生产站点。
- 保持当前主域名策略不变，即所有规范 URL 都落在 `https://www.worddino.com` 下。

## 2. 当前上下文
- 项目是 Next.js App Router 应用，国际化由 `next-intl` 提供，使用固定语言前缀：`/zh-CN`、`/en`。
- 当前根布局只包含基础 `title` 和 `description`，没有 `metadataBase`、`canonical`、`robots`、`sitemap` 或 Google 验证配置。
- 当前站点存在首页 `/ -> /zh-CN` 的站内跳转逻辑，主域名方案文档已明确 `https://www.worddino.com` 为唯一规范主域。
- 用户确认本轮要同时完成代码配置、Google Search Console 实际创建与提交、Google Analytics 4 实际创建与接入，以及 `llms.txt` 发布。
- Google 操作账号为 `bonorise@gmail.com`，本机 Chrome 已登录该账号。

## 3. 方案对比

### 3.1 方案 A：使用 Next.js 原生 SEO 能力并实际接入 Google 平台
- 在 App Router 中直接补充 `metadataBase`、页面级 canonical、`app/robots.ts`、`app/sitemap.ts` 与 `public/llms.txt`。
- 用浏览器实际创建 Google Search Console 与 GA4 资产，并将产生的验证信息和 Measurement ID 回填到应用配置中。
- 优点是依赖少、与当前技术栈匹配、维护成本最低。
- 缺点是需要同时做代码改动与平台操作。

### 3.2 方案 B：引入额外 SEO 生成库
- 使用 `next-sitemap` 等工具统一生成 `sitemap` 与 `robots`，其余工作不变。
- 优点是规则集中，适合大型内容站。
- 缺点是当前站点规模小，额外依赖增加复杂度而没有明显收益。

### 3.3 方案 C：尽量依赖平台侧配置，代码只做最小补丁
- 在代码中只加少量 metadata，更多依赖静态文件和 Google 后台。
- 优点是改动少。
- 缺点是 canonical、多语言 URL 与统计接入容易失去一致性，长期可维护性最差。

## 4. 核心决策
- 采用方案 A。
- 使用 `https://www.worddino.com` 作为 `metadataBase` 与全部 canonical 的主域。
- 采用“每个真实可访问语言 URL 指向自身 canonical”的策略，不把中英文页面互相折叠。
- 首版 `sitemap.xml` 只收录稳定、可枚举的静态页面，不收录当前不可稳定枚举的动态词页。
- 本轮 Search Console 优先创建 `URL-prefix property: https://www.worddino.com/`，通过 HTML meta 验证完成闭环，不默认走 DNS TXT 的 Domain Property。
- 本轮 GA4 新建独立 property，并通过环境变量把 Measurement ID 注入生产站点。
- 站点根目录发布标准 `llms.txt`，不创建 `llm.txt` 别名。

## 5. 架构与职责边界

### 5.1 应用代码
- 在根布局配置 `metadataBase` 与默认 metadata。
- 在 locale 布局或页面层按真实路径输出 canonical。
- 新增 `robots.ts` 和 `sitemap.ts` 作为搜索引擎抓取入口。
- 新增 `llms.txt`，为 AI crawler 提供站点简介、关键入口和内容边界说明。
- 根据 GA4 Measurement ID 条件性注入 Google tag。
- 根据 Search Console 验证 token 条件性输出 `google-site-verification` meta。

### 5.2 Google Search Console
- 创建新的 URL-prefix 属性：`https://www.worddino.com/`。
- 使用 HTML meta tag 验证站点所有权。
- 验证成功后提交 `https://www.worddino.com/sitemap.xml`。

### 5.3 Google Analytics 4
- 创建新的 GA4 property。
- 获取 Measurement ID，并作为前端公开环境变量注入应用。
- 在生产环境中采集基础页面浏览事件。

### 5.4 平台与部署
- 代码通过当前 Vercel 项目发布。
- 需要在 Vercel 环境变量中配置 Search Console 验证 token 与 GA4 Measurement ID。
- Cloudflare 与 Vercel 的既有主域名配置不在本轮重新设计，只要求最终线上输出位于 `www.worddino.com`。

## 6. 规范化设计

### 6.1 Canonical 规则
- `/zh-CN` 的 canonical 指向 `https://www.worddino.com/zh-CN`
- `/en` 的 canonical 指向 `https://www.worddino.com/en`
- `/zh-CN/about`、`/en/about`、`/zh-CN/privacy`、`/en/privacy`、`/zh-CN/terms`、`/en/terms` 都各自指向自身规范 URL
- `/[locale]/word/[slug]` 动态词页的 canonical 指向当前实际语言路径下的对应 URL

### 6.2 Sitemap 范围
首版收录以下稳定页面：
- `/zh-CN`
- `/en`
- `/zh-CN/about`
- `/en/about`
- `/zh-CN/privacy`
- `/en/privacy`
- `/zh-CN/terms`
- `/en/terms`

动态词页暂不纳入 `sitemap.xml`，原因是当前仓库中没有稳定、公开、可枚举的全量词条数据源，避免向搜索引擎提交不稳定或难以长期维护的 URL。

### 6.3 Robots 规则
- 默认允许抓取站点页面内容。
- 在 `robots.txt` 中声明 `Sitemap: https://www.worddino.com/sitemap.xml`。
- 不额外添加复杂的搜索引擎差异化规则。

### 6.4 llms.txt 内容结构
- 站点名称与一句话简介。
- 面向 AI crawler 的推荐入口页面列表。
- 内容范围说明：提供英语单词词根、助记与示例分析。
- 风险提示：AI 生成内容仅供学习参考，应与权威词典交叉验证。
- 机器入口：指向 `sitemap.xml`。

## 7. Google 平台设计

### 7.1 Search Console 验证策略
- 首选 URL-prefix property，是因为本轮已确认 Chrome 中登录了目标 Google 账号，但尚未确认 Cloudflare DNS 控制台权限；HTML meta 验证能更直接闭环。
- Search Console 提供 meta token 后，将其放入应用 metadata，部署后重新点击验证。
- 验证通过后立刻提交 `sitemap.xml`。

### 7.2 GA4 接入策略
- 在 GA4 后台创建新 property 和 Web data stream。
- 获取 `G-XXXXXXXXXX` 形式的 Measurement ID。
- 通过 `NEXT_PUBLIC_GA_MEASUREMENT_ID` 注入应用，仅在配置存在时启用埋点。
- 默认只接入基础页面浏览，不在本轮新增自定义事件设计。

## 8. 错误处理与降级
- 如果 Google 后台遇到二次验证、验证码、账号选择弹窗或 Cookie 同意页，由用户在浏览器中完成必要的确认后继续执行。
- 如果 Search Console 的 URL-prefix 验证失败，先检查线上页面是否已部署最新 meta token、是否存在缓存或重定向链问题。
- 仅在 URL-prefix 验证无法完成时，才退回 Domain Property + DNS TXT 验证方案。
- 如果 GA4 property 已创建但 Measurement ID 尚未写回站点，线上不加载统计脚本，避免半配置状态污染数据。

## 9. 验证标准

### 9.1 代码层
- 根布局正确输出 `metadataBase`。
- 已收录页面都输出符合主域名策略的 canonical。
- `https://www.worddino.com/robots.txt` 可访问且声明了 sitemap。
- `https://www.worddino.com/sitemap.xml` 可访问且包含首版稳定 URL。
- `https://www.worddino.com/llms.txt` 可访问且包含站点简介与 sitemap 链接。
- 当未配置 GA4 Measurement ID 时不加载 Google tag；配置后才加载。

### 9.2 平台层
- Search Console 中 `https://www.worddino.com/` 属性创建成功并验证通过。
- `sitemap.xml` 已成功提交。
- GA4 property 和 Web stream 创建成功。
- GA4 Realtime 中可观察到至少一次页面访问。

## 10. 范围边界

### 10.1 本轮包含
- 规范化 SEO 基础设施。
- `robots.txt`、`sitemap.xml`、`llms.txt`。
- Search Console 创建、验证和 sitemap 提交。
- GA4 创建与基础埋点接入。

### 10.2 本轮不包含
- Bing Webmaster、百度站长等其他平台。
- 结构化数据（schema.org）扩展。
- 动态词页批量入索引策略。
- 高级 GA4 事件设计和转化漏斗配置。

## 11. 回滚策略
- 如果统计脚本导致异常，可先移除或清空 `NEXT_PUBLIC_GA_MEASUREMENT_ID`，重新部署后停止前端埋点。
- 如果 Search Console meta 验证配置错误，可更新 token 后重新部署，不需要回滚业务代码。
- 如果 `sitemap` 或 `robots` 输出异常，可优先回退对应路由文件，不影响站点核心功能。
