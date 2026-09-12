# 思晨五金制品有限公司 · 企业官网

Astro 静态站点工程，暗色高级视觉风格（对标奔驰式设计语言）。
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
├── public/                  # 静态资源（favicon.svg、404.html 等，构建时原样复制到 dist 根目录）
├── src/
│   ├── components/          # 组件：页头/页脚/占位图/卡片等
│   ├── layouts/
│   │   └── Layout.astro     # 全站布局（SEO/JSON-LD/导航/页脚）
│   ├── pages/               # 5 个页面（index/about/products/news/contact）
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

## 日常维护：改文字 / 加图片视频 / 发布

### 文字内容在哪里改（所有文件都在 `src/` 下）

| 想改什么 | 打开文件 |
|---|---|
| 导航菜单、顶部 logo 文案 | `src/components/Header.astro` |
| 页脚简介、地址/电话/版权行 | `src/components/Footer.astro` |
| 全站标题、SEO 描述、站点信息 | `src/layouts/Layout.astro` |
| 首页各区块与新闻/数据列表 | `src/pages/index.astro` |
| 关于我们（简介/理念/历程/资质） | `src/pages/about.astro` |
| 产品中心（产品卡片/流程） | `src/pages/products.astro` |
| 新闻资讯（头条+列表） | `src/pages/news.astro` |
| 联系我们（地址/电话/留言表单） | `src/pages/contact.astro` |
| 全站配色/字体/间距 | `src/styles/global.css`（顶部 `:root` 变量） |

**规律**：每个页面文件顶部 `---` 之间的数组（如 `stats`、`businesses`、`news`、`timeline`、`products`、`contactItems`）就是列表数据——想增删卡片/条目就在这里改；`---` 以下的正文 HTML 是页面里的段落文案。

### 加图片

1. 把图片文件放进 `public/images/`（可建子目录，如 `public/images/products/`）；
2. 到对应 `.astro` 页面找到要替换的 `<PlaceholderImage ... />`，加上 `src` 即可（布局、裁剪与占位图完全一致）：
   ```
   <PlaceholderImage src="/images/products/stamping-1.jpg" label="精密冲压件" aspect="4/3" />
   ```
3. 首页首屏、全宽横幅是 `fill` 模式，同样只需加 `src`。

### 加视频

1. 把 MP4 放进 `public/videos/`；
2. 到首页的 `<VideoPlaceholder />` 处加 `src`（可选 `poster` 封面）：
   ```
   <VideoPlaceholder src="/videos/brand.mp4" poster="/images/poster.jpg" label="品牌视频" />
   ```
3. 想用 B站 / YouTube / 腾讯视频嵌入，直接把 `<VideoPlaceholder />` 换成对应 iframe。

### 预览与发布

```bash
npm run dev       # 本地实时预览 http://localhost:4321（改完即时刷新）
npm run publish   # 一键发布：自动构建 + 上传整个 dist 到 COS 桶（需先配置 .env）
npm run upload    # 跳过构建，仅上传现有 dist
```

发布前配置：复制 `.env.example` 为 `.env`，填入腾讯云密钥与桶信息（获取位置见 `.env.example` 注释）。

## 部署：腾讯云 COS 静态网站托管（本工程配套方案）

流程简表（详细见对话记录）：

1. 本地执行 `npm run build`，得到 `dist/` 发布目录；
2. 存储桶「基础配置 → 静态网站」开启，索引文档 `index.html`，错误文档 `404.html`；
3. 「文件列表」把 `dist/` 内的全部内容（index.html、favicon.svg、_astro/、about/、products/、news/、contact/）上传到桶**根目录**；或直接 `npm run publish` 一键自动上传；
4. 桶访问权限需为「公有读私有写」；
5. ⚠️ 大陆地域桶绑定自定义域名需先完成 **ICP 备案**（腾讯云备案需一台大陆地域轻量/CVM 服务器作为接入资源）；
6. 备案通过后：域名与传输管理 → 绑定自定义域名（静态网站源站）→ DNSPod 添加 CNAME → 关联免费 SSL 证书强制 HTTPS；
7. 提示：2024-01-01 之后新建的存储桶，默认域名直访已失效（403），必须走自定义域名。

## 上线后建议

- **统计**：百度统计（国内）+ Google Analytics / Plausible（海外）；
- **收录**：将 `sitemap` 提交到百度站长平台与 Google Search Console；
- **企业邮箱**：预算有限可先用阿里云企业邮箱免费版或 Zoho 免费版（绑定自己的域名）。
