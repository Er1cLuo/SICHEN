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
├── public/                  # 静态资源（logo.svg、404.html 等，构建时原样复制到 dist 根目录）
├── src/
│   ├── components/          # 组件：页头/页脚/占位图/卡片等
│   ├── layouts/
│   │   └── Layout.astro     # 全站布局（SEO/JSON-LD/导航/页脚）
│   ├── pages/               # 5 个页面（index/about/products/workshops/contact）
│   └── styles/
│       └── global.css       # 全站设计系统
├── scripts/                 # 维护脚本（占位图生成、体积/图片/布局自检，见下）
├── docs/                    # 交付文档（EdgeOne 部署指南、文案填写表）
├── originals/               # 原图/原视频备份（不进仓库、不参与构建）
├── astro.config.mjs
└── package.json
```

## 目前仍是占位、待替换的内容

站点已上线（https://www.sicenhardware.com），域名、地址、电话、邮箱、备案号都已是正式信息。下面这些**还是线框占位图或待核实文案**（共 29 张占位图，用 `node scripts/check-assets.mjs` 可随时复查）：

| 位置 | 占位数量 | 怎么换成实拍 |
|---|---|---|
| 产品中心 · 其他异形类 `products/other/` | 6 张 | 把实拍图按同名放进对应目录即可覆盖（`.jpg/.jpeg/.png/.webp` 都认，页面构建时自动识别扩展名） |
| 产品中心 · 车床件 `products/turning/` | 3 张 | 同上 |
| 产品中心 · 冲压垫片 `products/washer/` | 3 张 | 同上 |
| 厂区展示 · 搓牙车间 `factory/rolling-*`、`cold-heading-*` | 12 张 | 放入 `public/images/factory/` 同名覆盖 |
| 厂区展示 · 搓牙车间概述图 `workshops/thread-rolling-1.png` | 1 张 | 建议横版 16:9 实拍 |
| 资质证书 `certificates/cert-1/2.png` | 2 张 | 扫描件横版（3:2 或 4:3），图注在 `about.astro` 的 `certGallery` 里改 |
| 关于我们 · 办公与展厅 `company/office-1.png` | 1 张 | 放入 `public/images/company/` 同名覆盖 |
| 微信二维码 `company/wechat-qr.png` | 1 张 | **目前是示例二维码，必须换成业务微信真实二维码**（方形，≥600×600） |
| 首页数据统计（15+ 年 / 500+ 客户 / 15+ 出口国家 / 98.5% 一次合格率） | — | 起草数值，请核实后改 `index.astro` 的 `stats` 数组 |
| 公司简介、发展历程、理念等正文 | — | 起草文案，见各页面 `---` 之间的数组与正文 |
| `PUBLIC_AMAP_KEY` | — | 未配置时地图回退成位置示意图；在 EdgeOne 环境变量里加上后重新部署 |

> 产品中心 6 类共 42 张图，其中 30 张已是实拍；首页轮播、涉及领域 8 张、厂区展示大部分车间、三页页头大图都已是实拍照片。

域名出现的地方共 4 处，换域名要一起改：`astro.config.mjs` 的 `site`、`public/sitemap.xml`、`public/robots.txt`、`src/layouts/Layout.astro` 的 JSON-LD。

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
| 厂区展示（冷镦成型/搓牙/数控加工/光学筛选/仓储/包装，6 部分 14 个车间） | `src/pages/workshops.astro` |
| 联系我们（地址/电话/微信/地图，无留言表单） | `src/pages/contact.astro` |
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

1. 把 MP4 放进 `public/videos/`（封面图同名放 `video.jpg` 即可）；
2. 到首页的 `<VideoPlaceholder />` 处加 `src` 与 `poster`：
   ```
   <VideoPlaceholder src="/videos/video.mp4" poster="/videos/video.jpg" label="品牌视频" />
   ```
   > 只要视频还没开始播放，窗口里显示的就是 `poster` 封面图。
3. 播放器固定在 16:9 窗口内播放（宽为内容的 3/4）。
4. **当前线上用的是 B站 平台嵌入**（`<VideoPlaceholder embed="…" poster="/videos/video.jpg" />`）：页面先只显示封面 + 播放按钮，点击后才注入 iframe（首屏不加载播放器、不拖慢速度），嵌入模式**允许全屏**。
5. 本地视频模式（`<VideoPlaceholder src="/videos/video.mp4" poster="…" />`）按"只允许窗口播放"处理：**不提供全屏**（`controlsList="nofullscreen"` + 画中画禁用 + 脚本兜底）。

**导出视频时必须满足的规格**（这是踩过坑的清单，务必照做）：

| 项目 | 规格 | 原因 |
|---|---|---|
| **视频编码** | **H.264（AVC）**，不要 H.265 / HEVC | 实测 4K H.265 在 Chrome 里时间轴在走但**一帧都解不出来**（只有声音没有画面）；Firefox 完全不支持 HEVC |
| 封装 / 音频 | MP4 容器 + AAC 音频（128 kbps） | 全平台通用 |
| 分辨率 / 帧率 | 1920×1080 或 1280×720，25 或 30 fps | 网页播放足够 |
| 码率 | **不超过 2 Mbps** | 5 分钟片子按 2 Mbps 约 78 MB；按 3 Mbps 就是 117 MB，**超过 GitHub 单文件 100 MB 硬上限会直接拒收推送** |
| 体积 | **≤ 100 MB（硬性），建议 ≤ 50 MB** | GitHub 单文件上限 100 MB；EdgeOne「直接上传」单文件上限 25 MB |
| 优化选项 | 勾选「Web 优化 / 流式 / Fast Start / Optimize for streaming」 | 让索引 `moov` 位于文件开头，浏览器可边下边播；否则 iPhone 可能完全无法播放 |
| 封面 | 16:9，1920×1080 即可 | 与播放器 16:9 窗口吻合，不会拉伸变形 |

**导完自检**（两条命令，能看出编码、码率、索引位置是否合格）：

```
node scripts/mp4-info.mjs  public/videos/video.mp4   # 看 编码 / 码率 / moov 位置
node scripts/mp4-faststart.mjs public/videos/video.mp4   # 若 moov 在尾部，无损重排到开头（原文件备份到 originals/videos/，不入仓库）
```

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

## 维护脚本（都在 `scripts/` 下，用 `node scripts/xxx.mjs` 运行）

| 脚本 | 用途 |
|---|---|
| `make-placeholder-pngs.mjs` | 生成还没换成实拍的线框占位图。**已存在的文件一律跳过**，不会覆盖真实照片（加 `--force` 才会覆盖） |
| `check-assets.mjs` | 构建后核对：页面引用的图片/视频是否都存在，`public/` 里有没有没人引用的孤图 |
| `audit-dead-css.mjs` | 审计 `global.css`：定义了却没被页面用到的 class、定义了却没被 `var()` 引用的 CSS 变量 |
| `measure-layout.mjs` | 用系统 Chrome/Edge 的 headless + CDP 量真实渲染结果（图文间距、图片宽度、页头滚动是否抖动）：`node scripts/measure-layout.mjs http://127.0.0.1:4322/workshops 1440` |
| `optimize-images.ps1` | 把 `public/images` 下的照片批量压成适合网页的 JPEG，原图备份到 `originals/` |
| `mp4-info.mjs` / `mp4-faststart.mjs` | 自检自托管视频的编码/码率/索引位置；必要时无损把索引 `moov` 挪到文件开头 |
| `analyze-logo.mjs` | 换了 `public/logo.svg` 后，重新推算贴合图形的正方形 viewBox |
| `make-content-sheet.mjs` | 重新生成 `docs/思晨五金-网站文案填写表.xlsx` |

典型顺序：改内容 → `npm run build` → `node scripts/check-assets.mjs` 查缺图 →（动过样式再跑）`node scripts/audit-dead-css.mjs` → `node scripts/measure-layout.mjs` 量效果 → push 自动部署。

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
