# 思晨五金制品有限公司 · 企业官网

Astro 静态站点工程，暗色高级视觉风格。
**当前所有图片、视频、公司数据均为占位内容**，上线前请逐一替换为真实内容。

## 技术栈

- [Astro](https://astro.build/) 5.x —— 构建后输出纯静态文件，部署零服务器、零成本
- 原生 HTML / CSS / 少量原生 JS（无框架运行时，页面极快）

## 本地开发与预览

```bash
npm install      # 安装依赖（首次）
npm run dev      # 启动开发服务器，默认 http://localhost:4321
npm run build    # 构建静态文件，输出到 dist/
npm run preview  # 本地预览构建产物
```

## 目录结构

```
├── public/                  # 静态资源（favicon 等）
├── src/
│   ├── components/          # 组件：页头/页脚/占位图/卡片等
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── PlaceholderImage.astro   # 图片占位（SVG）
│   │   ├── VideoPlaceholder.astro   # 视频占位
│   │   ├── ProductCard.astro
│   │   ├── NewsCard.astro
│   │   └── SectionHeading.astro
│   ├── layouts/
│   │   └── Layout.astro     # 全站布局（SEO/JSON-LD/导航/页脚）
│   ├── pages/               # 5 个页面
│   │   ├── index.astro      # 首页
│   │   ├── about.astro      # 关于我们
│   │   ├── products.astro   # 产品中心
│   │   ├── news.astro       # 新闻资讯
│   │   └── contact.astro    # 联系我们
│   └── styles/
│       └── global.css       # 全站设计系统
├── astro.config.mjs
└── package.json
```

## 上线前需要替换的占位内容

| 位置 | 内容 | 说明 |
|---|---|---|
| 所有 `<PlaceholderImage>` | 换成 `<img src="/images/xxx.jpg">` | 把真实图片放入 `public/images/` |
| `<VideoPlaceholder>` | 换成 `<video>` 或视频平台嵌入 | 见组件内注释 |
| 各页面正文、统计数据 | 真实公司介绍、产能数据 | 目前为起草占位文案 |
| `Footer.astro` / `contact.astro` | 地址、电话、邮箱 | 目前为占位信息 |
| `Layout.astro` | JSON-LD 中的域名/邮箱 | 上线后替换为正式域名 |
| `astro.config.mjs` | `site` 字段 | 换成正式域名 |
| `index.astro` 新闻条目 | 真实新闻 | 如需详情页，新建 `src/pages/news/[slug].astro` |

## 部署（免费、无需国内服务器、无需备案）

本方案为**静态托管 + 全球 CDN**，不涉及国内服务器，因此**不需要 ICP 备案**，国内外均可访问。

### 方式一：腾讯云 EdgeOne Pages（国内访问体验最好，推荐）

1. 将本项目推送到 GitHub 仓库；
2. 打开 [EdgeOne Pages](https://edgeone.cloud.tencent.com/pages) → 新建项目 → 关联 GitHub 仓库；
3. 构建配置：构建命令 `npm run build`，输出目录 `dist`；
4. 绑定你的域名（在[腾讯云](https://dnspod.cloud.tencent.com/)购买，`.com` 首年约 30~80 元），按提示添加 CNAME 记录，HTTPS 证书自动签发。

### 方式二：Cloudflare Pages（海外访问最佳）

1. 同样推送 GitHub 仓库；
2. [Cloudflare Pages](https://pages.cloudflare.com/) → Create project → 关联仓库；
3. 构建命令 `npm run build`，输出目录 `dist`；
4. 绑定自定义域名（DNS 托管到 Cloudflare 即可免费获得 HTTPS）。

### 方式三：直接上传构建产物

本地 `npm run build` 后，把 `dist/` 目录直接上传到支持静态托管的平台（如阿里云 OSS 香港地域等），无需构建流程。

## 上线后建议

- **统计**：百度统计（国内）+ Google Analytics / Plausible（海外）；
- **收录**：将 `sitemap` 提交到百度站长平台与 Google Search Console；
- **企业邮箱**：预算有限可先用阿里云企业邮箱免费版或 Zoho 免费版（绑定自己的域名）。
