# WordDino 主域名与永久跳转设计

## 1. 目标
- 将 `www.worddino.com` 设为站点唯一主域名。
- 将 apex 域名 `worddino.com` 的所有请求以 `308` 永久跳转到对应的 `https://www.worddino.com/:path*`。
- 保持现有应用内路由行为不变，包括首页 `/ -> /zh-CN` 的站内跳转逻辑。

## 2. 当前上下文
- 项目是 Next.js App Router 应用，部署在 Vercel。
- 域名在 Spaceship 购买，DNS 托管在 Cloudflare。
- 代码通过 GitHub 同步到 Vercel 自动部署。
- 代码库当前没有 `vercel.json` 或基于 host 的重定向配置。
- 当前仓库内与首页相关的现有逻辑只有应用内 `redirect("/zh-CN")`，不负责跨域名规范化。

## 3. 核心决策
- 主域名使用 `www.worddino.com`。
- apex 域名 `worddino.com` 作为附加域名接入同一个 Vercel 项目。
- 永久跳转放在 Vercel 域名层配置，不放在 Next.js 代码层，也不放在 Cloudflare 规则层。
- 跳转状态码使用 `308`，与 Vercel 当前推荐方向一致。

## 4. 架构与职责边界
### 4.1 Vercel
- 将 `www.worddino.com` 设为 Primary Domain。
- 接收 `worddino.com` 请求并执行 `308` 永久跳转到 `https://www.worddino.com/:path*`。
- 保证路径保留，不破坏现有站内路径结构。

### 4.2 Cloudflare
- 仅负责 DNS 托管。
- 不配置 Redirect Rules、Page Rules、Workers 等重定向逻辑。
- DNS 只为 Vercel 域名接入服务，不承担主域跳转职责。

### 4.3 应用代码
- 本轮不新增 host-based redirect。
- 本轮不在 `next.config.ts`、`middleware.ts`、页面组件中加入跨域名重定向逻辑。
- 现有站内 `/ -> /zh-CN` 逻辑继续保留。

## 5. 请求流
1. 用户访问 `https://worddino.com`。
2. Vercel 在域名层返回 `308`，`Location` 指向 `https://www.worddino.com/`。
3. 用户访问 `https://worddino.com/some/path`。
4. Vercel 在域名层返回 `308`，`Location` 指向 `https://www.worddino.com/some/path`。
5. 用户进入 `https://www.worddino.com/` 后，再由应用内现有逻辑决定是否继续跳转到 `/zh-CN`。

## 6. 验证标准
- `worddino.com` 与 `www.worddino.com` 均在 Vercel Domains 页面处于 `Ready`。
- `https://worddino.com` 返回 `308`，且 `Location` 为 `https://www.worddino.com/`。
- `https://worddino.com/abc` 返回 `308`，且 `Location` 为 `https://www.worddino.com/abc`。
- `https://www.worddino.com` 可正常访问应用。
- 现有首页语言跳转仍正常工作，最终落点保持在 `www.worddino.com` 域下。
- 不出现 `worddino.com -> www.worddino.com -> worddino.com` 的循环。

## 7. 回滚策略
- 首选在 Vercel 域名配置中取消或调整重定向，不通过代码回滚解决。
- 除非确认 DNS 指向本身错误，否则不改动 Cloudflare DNS 记录。
- 因为主改动在平台配置层，回滚应以平台设置回退为主，而不是应用版本回退。

## 8. 范围边界
### 8.1 本轮包含
- Vercel 主域名设置。
- apex 到 `www` 的 `308` 永久跳转。
- 线上验证与回滚预案。

### 8.2 本轮不包含
- Next.js 代码级重定向实现。
- Cloudflare 规则层重定向。
- SEO 工程项批量补齐。

## 9. 后续待办
- 为站点统一补充 `canonical` 配置，确保所有页面都指向 `https://www.worddino.com` 体系下的规范 URL。
- 增加 `sitemap` 生成与发布。
- 后续视需要补充 `robots`、`metadataBase` 与更完整的 SEO 规范化配置。
