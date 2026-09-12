#!/usr/bin/env node
/**
 * 一键发布脚本：把 dist/ 目录的全部内容上传到腾讯云 COS 存储桶根目录（保持目录结构）。
 *
 * 用法：
 *   1. 复制 .env.example 为 .env，填入你的密钥与桶信息（见文件内注释）
 *   2. npm run publish   —— 先执行 astro build，再把 dist/ 上传到桶
 *      或 npm run upload  —— 跳过构建，仅把现有 dist/ 上传
 *
 * 可选环境变量 COS_CLEAN=true 时，会删除云端已不在本地 dist 中的文件（谨慎使用）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import COS from 'cos-nodejs-sdk-v5';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/* ---------------- 读取根目录 .env（简单解析） ---------------- */
function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile();

const SECRET_ID = process.env.COS_SECRET_ID;
const SECRET_KEY = process.env.COS_SECRET_KEY;
const BUCKET = process.env.COS_BUCKET; // 例如 sicenweb-1250000000（含 APPID 后缀）
const REGION = process.env.COS_REGION || 'ap-guangzhou';
const CLEAN = process.env.COS_CLEAN === 'true';

if (!SECRET_ID || !SECRET_KEY || !BUCKET) {
  console.error('[发布] 缺少配置：请在项目根目录创建 .env（参照 .env.example）');
  console.error('       需要：COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET');
  process.exit(1);
}
if (!fs.existsSync(DIST)) {
  console.error(`[发布] 未找到目录 ${DIST}，请先运行 npm run build`);
  process.exit(1);
}

const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY });

/* ---------------- 文件类型映射（保证浏览器正确渲染而不是下载） ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};
const contentType = (filePath) =>
  MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

/* ---------------- 收集本地文件 ---------------- */
function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(DIST, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else {
      out.push({ key: rel, filePath: full, size: fs.statSync(full).size });
    }
  }
  return out;
}

/* ---------------- SDK 封装（Promise 化） ---------------- */
const putObject = (params) =>
  new Promise((resolve, reject) =>
    cos.putObject(params, (err, data) => (err ? reject(err) : resolve(data)))
  );
const sliceUpload = (params) =>
  new Promise((resolve, reject) =>
    cos.sliceUploadFile(params, (err, data) => (err ? reject(err) : resolve(data)))
  );
const getBucket = (params) =>
  new Promise((resolve, reject) =>
    cos.getBucket(params, (err, data) => (err ? reject(err) : resolve(data)))
  );
const deleteObjects = (params) =>
  new Promise((resolve, reject) =>
    cos.deleteMultipleObject(params, (err, data) => (err ? reject(err) : resolve(data)))
  );

/* ---------------- 上传（限制并发） ---------------- */
async function uploadAll(files) {
  const CONCURRENCY = 6;
  let done = 0;
  let index = 0;
  const failed = [];

  async function worker() {
    while (index < files.length) {
      const file = files[index++];
      try {
        const params = {
          Bucket: BUCKET,
          Region: REGION,
          Key: file.key,
          ContentType: contentType(file.filePath),
        };
        // 大文件（如视频）用分片上传；小文件直接传 Buffer
        if (file.size > 20 * 1024 * 1024) {
          await sliceUpload({ ...params, FilePath: file.filePath });
        } else {
          await putObject({ ...params, Body: fs.readFileSync(file.filePath) });
        }
        done++;
        console.log(`  ✓ ${file.key}`);
      } catch (err) {
        failed.push({ key: file.key, err });
        console.error(`  ✗ ${file.key} —— ${err.message || err}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

  const totalMB = (files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2);
  console.log(`\n[发布] 完成：成功 ${done}/${files.length} 个文件，共 ${totalMB} MB`);
  if (failed.length) {
    console.error(`[发布] ${failed.length} 个文件上传失败，请检查后重试。`);
    process.exitCode = 1;
  }
}

/* ---------------- 可选：清理云端多余文件 ---------------- */
const CLEANABLE_EXT = new Set(
  Object.keys(MIME).filter((e) => e !== '.htm' && e !== '.mjs')
);

async function removeStale(localKeys) {
  const remoteKeys = [];
  let marker = '';
  for (;;) {
    const data = await getBucket({
      Bucket: BUCKET,
      Region: REGION,
      Prefix: '',
      Marker: marker || undefined,
    });
    for (const obj of data.Contents || []) remoteKeys.push(obj.Key);
    if (data.IsTruncated !== 'true') break;
    marker = data.NextMarker || data.Contents?.[data.Contents.length - 1]?.Key || '';
  }

  const stale = remoteKeys.filter(
    (key) => !localKeys.has(key) && CLEANABLE_EXT.has(path.extname(key).toLowerCase())
  );
  if (!stale.length) {
    console.log('[发布] 云端没有多余文件需要清理。');
    return;
  }

  console.warn(`\n[发布] 将删除云端 ${stale.length} 个已不在本地的文件：`);
  stale.forEach((key) => console.warn(`  - ${key}`));
  // 每批最多 1000 个
  for (let i = 0; i < stale.length; i += 1000) {
    const batch = stale.slice(i, i + 1000).map((Key) => ({ Key }));
    await deleteObjects({ Bucket: BUCKET, Region: REGION, Objects: batch });
  }
  console.log('[发布] 清理完成。');
}

/* ---------------- 主流程 ---------------- */
async function main() {
  console.log(`[发布] 目标桶：${BUCKET}（${REGION}）`);
  console.log(`[发布] 本地目录：${DIST}\n`);

  const files = collectFiles(DIST);
  if (!files.length) {
    console.error('[发布] dist 目录为空，请先运行 npm run build');
    process.exit(1);
  }

  await uploadAll(files);

  if (CLEAN) {
    const localKeys = new Set(files.map((f) => f.key));
    try {
      await removeStale(localKeys);
    } catch (err) {
      console.error(`[发布] 清理失败：${err.message || err}`);
    }
  }

  console.log('\n[发布] 全部完成。可稍候通过你的域名验证访问。');
}

main().catch((err) => {
  console.error('[发布] 出现错误：', err);
  process.exit(1);
});
