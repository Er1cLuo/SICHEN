/**
 * 静态资源完整性检查：把 dist 里所有页面引用的本地资源（/xxx 形式的 src、href、
 * srcset、CSS url()）与实际文件比对，列出缺失项。
 * 用法：node scripts/check-assets.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('未找到 dist 目录，请先运行 npm run build');
  process.exit(1);
}

/** 递归收集文件 */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

const refs = new Map(); // 引用的绝对路径 -> 引用它的文件集合

function addRef(url, from) {
  if (!url || !url.startsWith('/')) return;
  if (url.startsWith('//')) return;
  const clean = url.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return;
  if (/\.(html|xml|txt|json)$/i.test(clean) && !clean.startsWith('/images/')) {
    // 页面链接单独处理：允许指向目录
  }
  if (!refs.has(clean)) refs.set(clean, new Set());
  refs.get(clean).add(relative(dist, from));
}

for (const f of htmlFiles) {
  // 去掉 HTML 注释，避免把注释里的示例路径当成真实引用
  const text = readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  // src / href / poster（视频封面）都要检查
  for (const m of text.matchAll(/(?:src|href|poster)="([^"]+)"/g)) addRef(m[1], f);
  for (const m of text.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) addRef(part.trim().split(/\s+/)[0], f);
  }
  for (const m of text.matchAll(/url\((?:"|')?([^"')]+)(?:"|')?\)/g)) addRef(m[1], f);
}

for (const f of cssFiles) {
  const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of text.matchAll(/url\((?:"|')?([^"')]+)(?:"|')?\)/g)) addRef(m[1], f);
}

const missing = [];
const external = [];
for (const [url, from] of refs) {
  if (/^(https?:|mailto:|tel:|data:|#)/i.test(url)) {
    external.push(url);
    continue;
  }
  const target = join(dist, url.replace(/^\//, ''));
  const ok = existsSync(target) || existsSync(join(target, 'index.html'));
  if (!ok) missing.push({ url, from: [...from].join(', ') });
}

const assets = files.filter((f) => !f.endsWith('.html'));
console.log(`dist 文件 ${files.length} 个（页面 ${htmlFiles.length}，其他资源 ${assets.length}）`);
console.log(`本地引用 ${refs.size - external.length} 个，外部/锚点引用 ${external.length} 个`);
console.log('');
if (missing.length === 0) {
  console.log('✓ 所有本地引用的资源都存在');
} else {
  console.log(`⚠ 缺失 ${missing.length} 个资源：`);
  for (const m of missing) console.log(`  ${m.url}   ← 引用自 ${m.from}`);
  process.exitCode = 1;
}

// 额外：列出 dist 里存在但没有任何页面引用的资源（便于清理）
const referencedPaths = new Set(
  [...refs.keys()].filter((u) => !/^(https?:|mailto:|tel:|data:|#)/i.test(u)),
);
const orphans = assets.filter((f) => {
  const url = '/' + relative(dist, f).replace(/\\/g, '/');
  return !referencedPaths.has(url);
});
console.log('');
console.log(`未被任何页面引用的资源：${orphans.length} 个（多为按目录枚举的图片，仅供参考）`);
for (const f of orphans.slice(0, 30)) console.log('  ' + '/' + relative(dist, f).replace(/\\/g, '/'));
if (orphans.length > 30) console.log(`  …还有 ${orphans.length - 30} 个`);
