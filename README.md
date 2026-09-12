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
│   ├── pages/               # 5 个页面（index/about/products/workshops/contact）
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
| `workshops.astro` 车间描述与参数 | 四大车间的真实描述、设备与产能参数 | 图片按同名文件覆盖即可 |

## 日常维护：改文字 / 加图片视频 / 发布

### 文字内容在哪里改（所有文件都在 `src/` 下）

| 想改什么 | 打开文件 |
|---|---|
| 导航菜单、顶部 logo 文案 | `src/components/Header.astro` |
| 页脚简介、地址/电话/版权行 | `src/components/Footer.astro` |
| 全站标题、SEO 描述、站点信息 | `src/layouts/Layout.astro` |
| 首页各区块、数据统计、车间卡片 | `src/pages/index.astro` |
| 关于我们（简介/理念/历程/资质） | `src/pages/about.astro` |
| 产品中心（产品卡片/流程/图集） | `src/pages/products.astro` |
| 车间概貌（冷镦/CNC/搓牙/光学筛选四大车间） | `src/pages/workshops.astro` |
| 联系我们（地址/电话/留言表单） | `src/pages/contact.astro` |
| 全站配色/字体/间距 | `src/styles/global.css`（顶部 `:root` 变量） |

**规律**：每个页面文件顶部 `---` 之间的数组（如 `stats`、`businesses`、`workshops`、`timeline`、`products`、`contactItems`）就是列表数据——想增删卡片/条目就在这里改；`---` 以下的正文 HTML 是页面里的段落文案。

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

### 公司位置地图

「联系我们」页的**公司位置**区块使用高德**静态地图**（图片，加载快、无需前端 SDK），Key 通过环境变量注入：

| 变量 | 说明 |
|---|---|
| `PUBLIC_AMAP_KEY` | 高德 **Web 服务** Key（[高德开放平台](https://lbs.amap.com/)申请，免费）；不配置则自动回退为位置示意图 |
| `PUBLIC_AMAP_LOCATION` | 公司坐标（GCJ-02），默认 `113.414460,22.348405`（由高德地理编码反查"中山市三乡镇皇冠路"得到） |

- **本地**：复制 `.env.example` 为 `.env` 填入 Key（`.env` 不进仓库）
- **线上**：EdgeOne Pages → 项目设置 → 环境变量，添加同名变量后重新部署
- 同时页面提供「高德地图导航 / 百度地图导航 / 复制地址」按钮，地址与坐标也写进了 JSON-LD（`PostalAddress` + `GeoCoordinates`），利于地图与本地搜索收录
- 想换成可交互地图（可缩放拖拽）：改用高德 JS API 或地图组件 iframe，改 `src/pages/contact.astro` 顶部的 `mapImage` 逻辑即可

### 预览与构建

```bash
npm run dev       # 本地实时预览 http://localhost:4321（改完即时刷新）
npm run build     # 构建静态文件到 dist/
npm run preview   # 本地预览构建产物
```

## 部署：EdgeOne Pages（GitHub 自动部署）

本项目通过 GitHub 仓库 `Er1cLuo/SICHEN` 与腾讯云 EdgeOne Pages 联动：**push 即自动构建部署**，无需本地打包上传。

| 配置项 | 值 |
|---|---|
| 框架预设 | `Astro` |
| 根目录 | `./` |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| Node 版本 | `22.17.1`（已由 `.nvmrc` 固定） |

也可用 EdgeOne CLI 手动部署：`npm i -g edgeone && edgeone login`，然后 `npm run deploy:edgeone`。

完整步骤（仓库导入、域名绑定、HTTPS、HSTS/OCSP 取舍、备案与排错）见 **`docs/EdgeOne-部署指南.md`**。

## 上线后建议

- **统计**：百度统计（国内）+ Google Analytics / Plausible（海外）；
- **收录**：将 `sitemap` 提交到百度站长平台与 Google Search Console；
- **企业邮箱**：预算有限可先用阿里云企业邮箱免费版或 Zoho 免费版（绑定自己的域名）。
