# 📋 代码审查报告 — NICETHRYUN Solar M1

对照文档：`Product-Spec.md:3–25`；基准为定稿 `NICETHRYUN_融合版_独立预览.html`，SHA-256 `dc885c33e6ae706868526131cbf85773f13b6c1af8e94803152d5d62b4eb82f0`（`assets.json:3`）。未注明目录的 QA 证据文件均位于 `docs/review/m1/`。按 code-review skill 先完成 Stage 1；发现的 HIGH 修复后重新核查，再执行 Stage 2。审查只修改本报告和审查证据文件，未修改业务代码、依赖或提交 Git。

**最终结论：Stage 1 通过；Stage 2 审查完成，无未修复 HIGH。18 路由、36 对视觉截图、12/12 原生交互通过（含 7 次真实 BFCache 恢复）；最终桌面 Lighthouse 18/18 达标，最低 99。保留 2 项 Medium 维护问题和 1 项 Low 类型覆盖边界；依赖审计仍有 Critical/High 包级告警，详见安全章节。**

## Stage 1 — Spec Compliance

### ✅ 完整实现：逐条覆盖 8 项需求

| Spec 原文 / 条目 | 实现与验证证据 |
| --- | --- |
| §1「Reuse the Astro configuration conventions…English-only i18n…SEO…static Cloudflare Pages」 | `astro.config.mjs:6` 显式 static、sitemap、统一 site；`src/layouts/BaseLayout.astro:2` 布局组件和全局 CSS；`src/i18n/index.ts:5` 仅 en，`:13` 字典 fallback，`:29` 路径 helper；`src/components/SEO.astro:18` canonical/OG/alternate，`:24` Organization；`src/pages/robots.txt.ts:4` 静态 robots；`README.md:69` 构建约定。独立读取原仓库当前 commit，与 `docs/skeleton-source.md:6` 一致；原仓库无 Tailwind，未虚称复制不存在的配置。 |
| §2「Preserve demo CSS: Arial; --max:1440px…」 | `src/styles/global.css:2` 主题变量和字体；独立执行 `scripts/check-migration.mjs:42` 与原稿 CSS 全字节比较通过（`integrity.txt:5`）。保留原稿分区宽度与媒体查询，不追加新主题。 |
| §3「Generate full HTML at build time」 | `src/components/StaticPage.astro:6` 构建期调用纯 renderer，并在 `:11` 输出完整 HTML；`src/pages/products/[slug].astro:4`、`src/pages/applications/[slug].astro:4` 枚举静态路由。下表逐个列明 18 个业务路由；构建另含基础 404，总计 19 页（`build.txt:60`）。 |
| §4「Preserve native JavaScript interactions…No backend」 | `src/layouts/BaseLayout.astro:22` 引入原生 JS；菜单、筛选、比较、RFQ、图库、表单、下载、toast 等实现见后表；`src/scripts/site.js:706` 标出 `TODO: form endpoint`。`source-scan.json:1` 保存源码扫描，无 fetch/XHR/React/服务端岛。 |
| §5「data…JSON…16…original names…PNG <=400KB…only used npm lucide icons」 | `src/data/products.json:1`、`applications.json:1`、`labels.json:1`、`faq.json:1`、`resources.json:1` 等保存原文；独立完整性检查严格比较产品、应用、标签、资源，FAQ 12 条字符串、流程 8 条和资源卡 15 条也逐字命中原稿。`scripts/extract-demo.mjs:25` 解码原名素材，`:29` sharp 压缩，`:41` 从原始 buffer 生成 WebP；`assets.json:5` 起记录 16 原图与尺寸/hash，最大 PNG 394279 bytes。`src/lib/icons.js:1` 命名引入 29 个使用的 lucide 图标，版本 `package.json:21` 为 1.8.0。 |
| §6「two resource text templates as static TXT…CSV…remains downloadable」 | `public/downloads/oem-brief.txt:1`、`selection-checklist.txt:1`、`range-overview.csv:1`；`src/scripts/site.js:459` 实际下载静态路径，保留下载文件名及 toast；`scripts/check-migration.mjs:29` 检查字节，CSV 保留 BOM。 |
| §7「build…every route…desktop/mobile…native interactions…Lighthouse >=90」 | 构建原始输出附后；36 对截图见 `README.md:15` 起与 `qa-results.json`；截图工具 `scripts/qa.mjs:39` 直接返回未改写原 HTML，`:145` 逐路由比较。最新交互 12/12 通过；最终 Lighthouse 18/18 通过、最低 99（`lighthouse-summary.json:6`，逐路由原始 HTML/JSON 位于 `lighthouse/`）。 |
| §8「README covers source, data locations, adding product families, pending…」 | 主 README `:17` 来源、`:24` 数据目录、`:45` 新增产品族、`:69` Cloudflare 构建契约、`:73` 表单/域名/部署/多语/patio 待办均存在。 |

### 18 个业务路由：无客户端空壳

每项均由 `scripts/check-migration.mjs:21` 读取 dist，要求 `<main>` 内含 `<h1>`，排除 hash 路由、内联位图、旧品牌/主题，并检查 canonical；独立重跑通过。桌面 1440×1000 与手机 390×844 均已有对应 demo/Astro/diff 截图。

| 路由 | 对应代码位置 |
| --- | --- |
| `/` | `src/pages/index.astro:4`；`src/lib/templates/home.js:14`；`src/components/Header.astro:6` |
| `/products/` | `src/pages/products/index.astro:4`；`src/lib/templates/catalogue.js:14` |
| `/products/solar-flood/` | `src/pages/products/[slug].astro:4`；`src/lib/templates/product.js:15` |
| `/products/split-panel/` | `src/pages/products/[slug].astro:4`；`src/lib/templates/product.js:15` |
| `/products/multi-head/` | `src/pages/products/[slug].astro:4`；`src/lib/templates/product.js:15` |
| `/products/compact-wall/` | `src/pages/products/[slug].astro:4`；`src/lib/templates/product.js:15` |
| `/products/slim-wall/` | `src/pages/products/[slug].astro:4`；`src/lib/templates/product.js:15` |
| `/products/garden-spot/` | `src/pages/products/[slug].astro:4`；`src/lib/templates/product.js:15` |
| `/applications/` | `src/pages/applications/index.astro:4`；保留 Driveway 默认原稿 |
| `/applications/entry/` | `src/pages/applications/[slug].astro:5`；entryway 原键映射 entry |
| `/applications/driveway/` | `src/pages/applications/[slug].astro:5`；`src/lib/templates/application.js:6` |
| `/applications/perimeter/` | `src/pages/applications/[slug].astro:5`；`src/lib/templates/application.js:6` |
| `/applications/garden/` | `src/pages/applications/[slug].astro:5`；`src/lib/templates/application.js:6` |
| `/applications/patio/` | `src/pages/applications/[slug].astro:5`；按 `Product-Spec.md:24` 明确复用 Garden；没有独立 patio 原稿，不能称已验证独立 patio 设计 |
| `/manufacturing/` | `src/pages/manufacturing/index.astro:4`；`src/lib/templates/manufacturing.js:6` |
| `/oem/` | `src/pages/oem/index.astro:4`；`src/lib/templates/oem.js:7` |
| `/resources/` | `src/pages/resources/index.astro:4`；`src/lib/templates/resources.js:6` |
| `/inquiry/` | `src/pages/inquiry/index.astro:4`；`src/lib/templates/inquiry.js:7` |

### UI 一致性证据

- `docs/review/m1/README.md:17` 起列出 36 对逐路由桌面/手机截图；最新 `qa-results.json` summary 为 36 对、无 route failure、12 交互全通过。可见文字完全相同，DOM 关键框差异为 0，非图片区域 diff 为 0%，全画面最大 diff 为 0.0004%。
- 比较工具直接 serve 未修改原 HTML（`scripts/qa.mjs:39`），等待图片 decode 后截图（`:72`）；pixelmatch 阈值为 0.1、排除抗锯齿（`:119`），并另算图片区域掩膜后的差异。**0% 是该阈值下的比较结果，不是全部像素逐字节相等。** 原名 PNG 压缩和 WebP 传输图存在有损差异，已在主 `README.md:67` 披露。
- 审查者另实际查看 `screenshots/desktop/home-demo.png`、`home-astro.png` 与 `screenshots/mobile/inquiry-astro.png` 全页图，核对页眉/hero/卡片/应用/工厂/RFQ/footer 及移动表单排列；与 `src/styles/global.css:2` 和 `src/lib/templates/inquiry.js:8` 的实现一致。没有将保留原稿文案中的“preview”字样擅自润色。

最终桌面 Lighthouse：`/`、`/products/solar-flood/`、`/applications/`、`/applications/driveway/` 为 99，其余 14 路由为 100；全部 CLS 为 0。证据 `lighthouse-summary.json:6`、`lighthouse.md:1` 及 18 份原始报告；该结论限定于记录中的桌面 preset、本地 production preview 环境，不代表已部署或移动端 Lighthouse 达标。

### 原生交互核对

| 要求 | 实现证据 |
| --- | --- |
| desktop mega-menu、mobile-menu、Escape/外部点击 | `src/components/Header.astro:10`、`:23`；`src/scripts/site.js:743`、`:749`、`:754`、`:762`；交互 QA 分别覆盖桌面/手机导航 |
| 首页范围筛选/搜索/应用键盘 tab | `src/scripts/site.js:493`、`:647`、`:774`；`src/lib/templates/home.js:26` |
| 目录 sidebar、查询参数、搜索/无结果/reset | `src/lib/templates/catalogue.js:14`、`:59`；`src/scripts/site.js:197` 同路由 pushState，`:652` 搜索 replaceState，`:872` popstate |
| 所有动态卡片、弹窗、应用链接变成真实地址 | `src/lib/links.js:2`；`src/lib/templates.js:31` 包装字符串和 `{html}` 两种返回值，避免搜索后重新出现 hash href |
| product gallery、目标数量 | `src/lib/templates/product.js:18`；`src/scripts/site.js:516` 图库；`:527` 数量步进，`:634` 输入，`:686` change；`:168` cleanQty 限制 1–1000000 |
| compare tray/dialog、最多 3 个 | `src/components/Dialogs.astro:4`；`src/scripts/site.js:326`、`:672`；`src/lib/templates/dialogs.js:19` |
| RFQ dialog 增删和数量、持久购物清单 | `src/scripts/site.js:311` 添加、`:542` 删除；`src/lib/templates/dialogs.js:7`；`:171` 持久化；成功页安全保护见下文 |
| inquiry、Other destination、浏览器原生校验 | `src/lib/templates/inquiry.js:8` required/type/email/maxlength，`:17` 要求文本/consent；`src/scripts/site.js:695` Other 字段显隐与 required，`:730` 提交只准备本地 brief |
| quick-inquiry/OEM 表单转入询盘 | `src/lib/templates/shared.js:69`；`src/lib/templates/oem.js:8`；`src/scripts/site.js:708`、`:714`；保留原稿字段传递 |
| draft、TXT/JSON、附件仅名称 | `src/scripts/site.js:335` FormData、`:346` composeBrief、`:663` 输入保存、`:701` 名称保存；`src/lib/templates/inquiry.js:21` ready 状态明确未发送 |
| info-dialog、toast、资源与产品列表下载 | `src/scripts/site.js:180` toast、`:453` sourceNotes、`:372` Blob 下载、`:459` 静态资源；`src/components/Dialogs.astro:7` 原生 dialog |
| 真导航后的 back/forward 状态 | `src/scripts/site.js:105` 验证/恢复两种 storage，`:840` 恢复当前页 UI，`:891` pageshow.persisted 先重读；`:495`、`:508`、`:581`、`:600`、`:649`、`:681` 在状态变更时即时写 session，初始化 `:857` 用纯渲染函数。`qa-results.json` 的 Real BFCache 用例记录 7 次 `persisted=true`，最终 cart 550、compare 2、已清除草稿不复活 |

### 已修复的迁移回归

1. **原 HIGH：BFCache 恢复旧内存后覆盖新询盘数据。** 原 hash SPA 不销毁/缓存多个文档；真导航后旧 A 页面恢复时没有重读 B 保存的 cart/draft/compare，下一次 pagehide 会覆盖。独立 VM 使用原 site.js 复现丢失；修后同模拟保留数量 200、邮箱和比较项（`bfcache-before.json:2`、`bfcache-after.json:2`）。当前修复 `src/scripts/site.js:891`，并对 compare/首页筛选在事件发生时即写 session（`:681`、`:495` 等），避免仅依赖离页写入。真实浏览器 7 次 BFCache 恢复通过，见 `scripts/qa.mjs:373` 和 `qa-results.json` 的对应交互详情；不再作为未修复 HIGH。
2. **原 Medium：ready 成功页操作 quote list 访问不存在的 summary。** 成功页由 `/inquiry/ready` 映射成 `/inquiry/?ready=1` 后，旧 path 判断仍把它当表单；Remove/change 会写入 null.outerHTML。已统一到 `src/scripts/site.js:806`，仅 form 存在时刷新，并对 summary/message 判空；调用在 `:538`、`:547`、`:644`、`:692`。真实 ready=1 页面数量步进/手输/change/remove 回归通过（`scripts/qa.mjs:437`）。这是迁移回归，不能归为原稿问题。

### ⚠️ 部分实现（0 项） / ❌ 未实现（0 项） / ⚡ 未授权 Spec 漂移（0 项）

- 当前业务实现未发现未修复的功能缺项，真实浏览器交互 12/12 通过；最终 Lighthouse 18/18 达标，§7 验收通过。
- patio 独立内容的缺失来自原稿，已在 `Product-Spec.md:24` 与主 `README.md:57` 披露，当前只验证既定 Garden 复用映射。
- `src/pages/404.astro:4` 复用原稿未找到状态；`src/pages/robots.txt.ts:4` 是静态 SEO 文件；`src/lib/links.js:7` 的 ready 查询状态保留已有流程。未新增业务功能、后端 API、数据库、语言版本或部署配置。源扫描记录见 `source-scan.json:1`。
- GitHub 私有属性、main 默认分支、PR 创建和最终 checkout 移交属于主 Agent 的交付检查；本报告审查暂存工程，不把尚未创建的 PR 或未部署状态写成完成。

## Stage 2 — Code Quality

### 🔴 安全扫描与依赖结果

1. **依赖审计不是 clean。** `npm-audit.json:277` 报告包级 **1 critical、1 high、1 low**，共 3 个包、13 条 advisory；`dependency-audit.md:7` 明确记录。审查未擅自升级越过 Astro 5 要求，也未把无运行时暴露解释为已修补。
2. 当前只输出静态 HTML/CSS/JS/图片（`astro.config.mjs:8`），没有 SSR adapter、服务器岛、Actions、图片优化 HTTP 服务、认证中间件、untrusted attribute spread 或 AVIF 输入；`scripts/extract-demo.mjs:25` 仅处理已批准原稿。已有独立依赖审计 `dependency-audit.md:59` 逐项列出官方 advisory 链接与适用条件，当前未发现对应公开攻击路径。保留**Medium 依赖维护风险**，package 自身的 Critical/High 严重度并未降级或消失。
3. **HTML 插入边界已逐一追溯。** `src/components/StaticPage.astro:11` 与 Header/Footer/Dialogs 的 set:html 来自仓库固定模板；`src/scripts/site.js:257`、`:264` 等 innerHTML 经统一 renderer。用户草稿/搜索值使用 `src/lib/templates/shared.js:19` 的 esc，inquiry `:8`/`:17`/`:21` 与 catalogue `:44`/`:53` 对输入转义；storage 新增字段验证在 `src/scripts/site.js:47`。SEO JSON-LD 在 `src/components/SEO.astro:29` 转义 `<`。没有仅凭出现 innerHTML 就判 XSS，也没有把它当可安全接入未来 CMS 的通用边界。
4. `source-scan.json:1` 保存实际 rg 正则、退出码和输出：src 内硬编码密钥/本机绝对路径、eval、SQL 拼接形态、fetch/XHR、React/旧品牌/旧主题、TS 绕过标记均未匹配。此为限定模式的源码扫描，不是完整渗透测试。原文 source-notes 中 SHINGEL 是已批准素材出处，未作为旧 ZELMO 品牌泄漏误报（`src/scripts/site.js:454`）。

### 📊 代码质量

- **Medium，超大文件：** `src/scripts/site.js:1` 共 903 行，承担状态校验、导航、表单、下载、事件委托；`scripts/qa.mjs:1` 共 533 行，承担截图/差异/交互套件。均超过 skill 的 300 行观察阈值。业务 renderer 已拆为独立模板（`src/lib/templates.js:3`），大文件主要保留原稿交互，在 M1 保真范围内可解释；仍应记录维护成本，不强行为此轮引入重构。
- **Low，类型覆盖边界：** 未检出显式 any、@ts-ignore、as unknown as（`source-scan.json`），Astro/TypeScript 检查通过；但 `tsconfig.json:2` 使用 base 且未启用 checkJs，原生 JS 并非全部严格类型检查。`StaticPage.astro:4` 的 page 字段仍为 string，而动态 renderer 选择位于 `:7`。不能把“零诊断”说成所有 JS 完全类型安全。
- 组件 PascalCase、函数 camelCase、数据文件 kebab-case；模板按业务页分开、共享转义/链接/图标有独立入口（`src/components/StaticPage.astro:1`、`src/lib/links.js:1`、`src/lib/icons.js:1`）。
- 读取 storage 对不可用/损坏值有恢复策略（`src/scripts/site.js:50`），保存失败返回 false，显式 Save draft 会用 toast 告知（`:618`）。隐式自动保存没有逐次 toast 与原稿一致；M1 无远端异步提交，无可遗漏的网络错误状态。

### 编译与完整性原始输出

以下输出来自对应证据文件；本审查独立运行 tsc 和完整性脚本，没有并发重建以干扰 Lighthouse。Astro check/build 由主 Agent 执行，保存未经摘要的输出。

`./node_modules/.bin/tsc --noEmit`（独立执行）：

```text
Exit code: 0
Raw stdout: (empty)
Raw stderr: (empty)
```

`npm run check`：

```text
> nicethryun-solar@0.1.0 check
> astro check

14:31:39 [content] Syncing content
14:31:39 [content] Synced content
14:31:39 [types] Generated 21ms
14:31:39 [check] Getting diagnostics for Astro files in /Users/lijiaming/Projects/nicethryun-solar...
Result (39 files): 
- 0 errors
- 0 warnings
- 0 hints
```

`npm run build`：

```text
> nicethryun-solar@0.1.0 build
> astro build

14:31:37 [content] Syncing content
14:31:37 [content] Synced content
14:31:37 [types] Generated 71ms
14:31:37 [build] output: "static"
14:31:37 [build] mode: "static"
14:31:37 [build] directory: /Users/lijiaming/Projects/nicethryun-solar/dist/
14:31:37 [build] Collecting build info...
14:31:37 [build] ✓ Completed in 79ms.
14:31:37 [build] Building static entrypoints...
14:31:38 [vite] ✓ built in 260ms
14:31:38 [build] ✓ Completed in 275ms.

 building client (vite) 
14:31:38 [vite] transforming...
14:31:38 [vite] ✓ 1727 modules transformed.
14:31:38 [vite] rendering chunks...
14:31:38 [vite] computing gzip size...
14:31:38 [vite] dist/_astro/BaseLayout.astro_astro_type_script_index_0_lang.FnzABwKT.js  83.68 kB │ gzip: 24.85 kB
14:31:38 [vite] ✓ built in 339ms

 generating static routes 
14:31:38 ▶ src/pages/404.astro
14:31:38   └─ /404.html (+4ms) 
14:31:38 ▶ src/pages/applications/[slug].astro
14:31:38   ├─ /applications/driveway/index.html (+1ms) 
14:31:38   ├─ /applications/entry/index.html (+1ms) 
14:31:38   ├─ /applications/perimeter/index.html (+1ms) 
14:31:38   ├─ /applications/garden/index.html (+1ms) 
14:31:38   └─ /applications/patio/index.html (+1ms) 
14:31:38 ▶ src/pages/applications/index.astro
14:31:38   └─ /applications/index.html (+1ms) 
14:31:38 ▶ src/pages/index.astro
14:31:38   └─ /index.html (+1ms) 
14:31:38 ▶ src/pages/inquiry/index.astro
14:31:38   └─ /inquiry/index.html (+1ms) 
14:31:38 ▶ src/pages/manufacturing/index.astro
14:31:38   └─ /manufacturing/index.html (+1ms) 
14:31:38 ▶ src/pages/oem/index.astro
14:31:38   └─ /oem/index.html (+1ms) 
14:31:38 ▶ src/pages/products/[slug].astro
14:31:38   ├─ /products/multi-head/index.html (+1ms) 
14:31:38   ├─ /products/split-panel/index.html (+0ms) 
14:31:38   ├─ /products/compact-wall/index.html (+0ms) 
14:31:38   ├─ /products/slim-wall/index.html (+0ms) 
14:31:38   ├─ /products/solar-flood/index.html (+0ms) 
14:31:38   └─ /products/garden-spot/index.html (+1ms) 
14:31:38 ▶ src/pages/products/index.astro
14:31:38   └─ /products/index.html (+1ms) 
14:31:38 ▶ src/pages/resources/index.astro
14:31:38   └─ /resources/index.html (+0ms) 
14:31:38 λ src/pages/robots.txt.ts
14:31:38   └─ /robots.txt (+0ms) 
14:31:38 ✓ Completed in 39ms.

14:31:38 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
14:31:38 [build] 19 page(s) built in 743ms
14:31:38 [build] Complete!
```

独立执行原稿完整性比较：

```json
{
  "passed": true,
  "routes": 18,
  "originalImages": 16,
  "pngByteLimit": 400000,
  "sourceDataAndCssCompared": true,
  "resources": 3
}
```

### Priority 分级

- 🔴 **High：当前代码无未修复项；真实 BFCache 已通过。** 发现的状态覆盖已经修复，保留前后证据。
- 🟡 **Medium：2 项维护问题。** 已安装依赖仍存在公告命中；site.js/qa.mjs 超过 300 行。前者的包级 Critical/High 必须继续披露，后者不等同功能失效。
- 🟢 **Low：1 项边界。** 原生 JavaScript 的严格类型覆盖有限，Astro/tsc 零诊断不能扩大解释。
