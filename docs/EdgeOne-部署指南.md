# 部署到腾讯云 EdgeOne Pages 指南

> 项目：思晨五金制品有限公司官网（Astro 静态站）
> 本地路径：`F:\DeepSeek-Harness`　构建产物：`dist/`

EdgeOne Pages 的免费套餐即可托管本项目，并支持**中国大陆节点加速**（自定义域名需完成 ICP 备案——你已完成）。

---

## 一、控制台构建配置（三条路线通用）

EdgeOne Pages 控制台 → 项目 →「项目设置 - 构建部署配置」：

| 配置项 | 填写值 | 说明 |
|---|---|---|
| 框架预设 | `Astro` | 选后会自动填充下面几项 |
| 根目录 | `./` | 仓库根目录 |
| 构建命令 | `npm run build` | 即 `astro build` |
| 输出目录 | `dist` | Astro 默认输出 |
| 安装命令 | `npm install`（自动检测） | 仓库含 `package-lock.json`，npm 8/9/10 均支持 |
| Node 版本 | `22.17.1` | 预装版本之一；根目录已有 `.nvmrc`（22.17.1），Pages 会按它自动切换 |

环境变量：**不要**把 `COS_SECRET_ID` / `COS_SECRET_KEY` 填进来——这是静态站，构建不需要任何密钥。

---

## 二、路线 A：Git 仓库自动部署（推荐，长期最省事）

1. 把本地仓库推送到 GitHub 或 Gitee：

   ```bash
   cd F:\DeepSeek-Harness
   git remote add origin https://github.com/你的账号/sicen-hardware-website.git
   git push -u origin main
   ```

2. EdgeOne Pages 控制台 → **创建项目 → 导入 Git 仓库** → 授权并选择该仓库；
3. 按上面「构建配置」确认参数 → 部署；
4. 部署完成会得到一个默认域名（形如 `xxx.edgeone.app`），可先用它验收；
5. 以后**改完代码 push 即自动重新部署**（图片同名覆盖后 push 也自动生效）。

> 密钥安全：`.gitignore` 已排除 `.env`，仓库里只有 `.env.example` 模板，可放心推送。

## 三、路线 B：CLI 一键部署（不建 Git 仓库也能用）

```bash
# 1) 安装并登录（选 China 站点）
npm install -g edgeone
edgeone login
edgeone whoami

# 2) 在项目目录一键部署（CLI 会自动构建并上传）
cd F:\DeepSeek-Harness
npm run deploy:edgeone          # = edgeone pages deploy -n sicen-hardware
```

手动构建 + 上传产物（等价命令）：

```bash
npm run build
edgeone pages deploy ./dist -n sicen-hardware
```

CI / 无人值守（用 API Token，控制台可生成）：

```powershell
$env:EDGEONE_API_TOKEN = "你的Token"
npm run build
edgeone pages deploy ./dist -n sicen-hardware -e production -t $env:EDGEONE_API_TOKEN
```

> 注意：CLI `deploy` 关联"已存在项目"时，该项目必须是**直接上传**类型。

## 四、路线 C：控制台直接上传（零配置，最直观）

本地执行 `npm run build` → 控制台「直接上传」→ 把 **`dist` 文件夹（或打包成 zip）** 拖进去即可。
缺点是每次更新都要手动上传；适合临时验证。

---

## 五、绑定自定义域名 + HTTPS

1. EdgeOne Pages 项目 → **域名管理 → 自定义域名** → 添加 `www.sicenhardware.com`；
2. 控制台会给出一个 **CNAME 目标地址**；
3. 到 [DNSPod](https://console.dnspod.cn/) 修改解析：
   - 若 `www` 之前已指向 COS，请**把那条 CNAME 的记录值改成 EdgeOne 的目标**（同一主机记录只能有一条 CNAME）；
   - `sicenhardware.com`（裸域）建议用"显性 URL"301 跳到 `www`；
   - `sicenhardware.cn` 可单独再绑一次（备案通过的前提下）。
4. **HTTPS**：域名管理 → HTTPS 配置 → **申请免费证书**（DNS 自动验证），签发后开启强制 HTTPS；
5. 验证：`https://www.sicenhardware.com` 首页、`/about`、`/products`、`/news`、`/contact`，以及访问一个不存在的地址看是否显示自定义 404（`public/404.html` 已就绪）。

---

## 六、EdgeOne Pages 与 COS 的关系

| 方案 | 特点 |
|---|---|
| COS 静态托管 | 便宜、文件直接可控；需自己绑域名/证书；已有 `npm run publish` 一键上传 |
| **EdgeOne Pages** | 构建+部署+全球（含中国大陆）加速一体，自动 HTTPS，push 即上线 |
| 两者并存 | 可让 EdgeOne Pages 作为主站（www），COS 保留为备份/图床；互不影响 |

迁移后如果不再需要 COS，可在 COS 控制台清空并删除存储桶（保留 `scripts/upload.mjs` 与 `.env` 也无妨）。

## 七、常见问题

- **构建失败**：优先看构建日志；常见原因是 Node 版本不匹配（本项目已用 `.nvmrc` 固定 22.17.1）。
- **页面 404**：确认输出目录填的是 `dist`（不是 `dist/` 之外的路径）。
- **图片不显示**：图片必须在 `public/` 下（构建时才被复制到站点根）；路径以 `/images/...` 开头。
- **改了图不生效**：CDN 有缓存，可在控制台刷新缓存，或稍等几分钟。
- **想改用国内加速**：确保绑定域名已备案，且项目部署在 EdgeOne 中国站（`edgeone login` 选 China）。
