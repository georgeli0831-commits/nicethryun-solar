# NICETHRYUN Solar

M1：将已定稿的单文件 demo 原样迁为 **Astro 5 静态站点**。设计、CSS 和可见英文文案沿用原稿；交互使用原生 JavaScript，未引入 React。

## 本地运行

Node.js 22.12+（建议 Node 22 LTS），npm。

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview -- --host 127.0.0.1 --port 4399
```

## 骨架与来源

- 骨架：`georgeli0831-commits/zelmo-parts`，来源 commit `bc88fc42b0cb170c8f8ab8d483d60138ad7921ef`。
- 定稿：`NICETHRYUN_融合版官网_20260919/NICETHRYUN_融合版_独立预览.html`；源文件及图片哈希见 [素材清单](docs/review/m1/assets.json)。
- 原骨架使用全局纯 CSS，**没有 Tailwind**。继承 Astro/sitemap、Base + SEO 结构和 i18n API，CSS 完全替换为 demo 原文。未复制摩配数据、图片、旧品牌、主题或地理跳转中间件。
- 具体取舍：[骨架来源记录](docs/skeleton-source.md)，验收范围：[Product-Spec.md](Product-Spec.md)。

## 目录与数据

| 位置 | 内容 |
| --- | --- |
| `src/pages/` | 静态路由及 `getStaticPaths()` |
| `src/layouts/` / `src/components/` | 共用布局、SEO、页眉页脚、原生弹窗 |
| `src/lib/` / `src/scripts/` | 共用渲染模板与浏览器交互 |
| `src/data/products.json` | 6 个产品族、格式、应用、特征、下单确认项 |
| `src/data/applications.json` | 原稿 4 个应用场景、问答和图片 |
| `src/data/labels.json` | 产品分类标签 |
| `src/data/resources.json` | 两份 TXT 模板及 CSV 原文 |
| `src/data/` 其余 JSON | 原稿 FAQ、资源卡及工厂/OEM 展示信息 |
| `src/i18n/` | 英文词典及路径机制，本期仅 `en`、无语言前缀 |
| `src/content/` | 预留内容集合目录，本期数据使用 JSON |
| `src/styles/global.css` | 原 demo 样式及主题变量 |
| `public/images/` | 16 张原名图片；PNG <=400KB；另有从原图生成的高质量 WebP，用于页面显示，原尺寸不变 |
| `src/data/image-paths.json` | 原始文件名到实际显示文件的映射 |
| `public/downloads/` | `oem-brief.txt`、`selection-checklist.txt`、`range-overview.csv` |
| `src/config/site.mjs` | 唯一域名占位常量、默认 SEO 信息 |
| `docs/review/m1/` | 逐路由截图、交互记录、Lighthouse 和图片清单 |

## 新增产品族

1. 将图片放入 `public/images/`，PNG 保持不大于 400KB。
2. 在 `src/data/products.json` 追加一项，沿用已有结构：唯一 `id`（即 URL slug）、`name`、`family`、`type`、`image`、`panel`、`mount`、`apps`、`short`、`desc`、`features`、`consider`、`questions`、`source`；可选 `detail`、`crop`。
3. `apps` 必须使用已有 application key；如引入分类，同步 `labels.json` 与导航。保持事实字段有来源，不推测性能参数。
4. `getStaticPaths()` 会从产品数据生成 `/products/<id>/`。运行 `npm run check && npm run build`，核对列表、详情、搜索、对比、询盘和移动端。
5. 若产品总览变化，同步 `resources.json` 与 `public/downloads/range-overview.csv`。

## 路由映射

所有业务路由都在构建时输出完整 HTML。原 `#/product/<id>` 改为 `/products/<id>/`；原 `entryway` 使用 `/applications/entry/`。

应用总览 `/applications/` 保留 demo 的 Driveway 默认视图和 route tabs。原稿只有四个应用场景，没有 patio 文案，因此 `/applications/patio/` 暂复用 Garden & path，未新增 tab 或改写文案；`scene-patio.jpg` 按要求原样保留。询盘成功界面保留为 `/inquiry/?ready=1` 的客户端状态。

## 验收

```sh
# 另一个终端先运行 build + preview
NICETHRYUN_DEMO=/absolute/path/NICETHRYUN_融合版_独立预览.html npm run qa:integrity
NICETHRYUN_DEMO=/absolute/path/NICETHRYUN_融合版_独立预览.html npm run qa
npm run qa:lighthouse
```

具体运行环境、截图与数字以 [验收记录](docs/review/m1/README.md) 为准。原名 PNG 按要求压缩至 400KB 以下；为避免调色板造成肉眼可见的降质，页面使用从原始内嵌图生成的 quality 95 WebP，图片区域仍存在有损压缩差异；页面几何结构、文字、字体和交互分别核对。

## Cloudflare Pages 构建约定

本仓库已经输出静态站点，不需要 adapter 或服务端 Functions。后续接入时使用：构建命令 `npm run build`，输出目录 `dist`，Node.js 22.12+。M1 未接入 Cloudflare、未部署、未配置域名。

## 依赖审计

按 M1 要求固定 Astro 5.18.2。官方 npm audit 仍报告 1 critical / 1 high / 1 low 包级告警；当前仅输出静态文件，未发现相关公开服务端利用路径，但依赖本身未修补。具体前提、构建输入风险和后续升级选项见 [依赖评估](docs/review/m1/dependency-audit.md)。

## 待办

- `TODO: form endpoint`：为 inquiry / OEM / RFQ 接入经确认的后端；当前仅浏览器校验、草稿、toast 和文件导出，附件不会上传。
- 域名确定后替换 `src/config/site.mjs` 的 `https://nicethryun-solar.example`；canonical、OG、sitemap、robots 共用这个常量。
- Cloudflare Pages 项目、构建接入与发布验证。
- 多语言文案、路由和语言切换；目前仅英文。
- patio 独立原稿确认后，替换临时复用页面。
