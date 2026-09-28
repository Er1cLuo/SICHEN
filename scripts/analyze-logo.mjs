/**
 * 分析 logo SVG 的实际图形范围，推导更贴合的正方形 viewBox。
 * 用法：node scripts/analyze-logo.mjs <svg 路径>
 */
import { createRequire } from 'node:module';

const require = createRequire('C:/Users/27242/.dsh/profiles/node_modules/');
const sharp = require('sharp');

const file = process.argv[2];
const N = 512;

const { data, info } = await sharp(file, { density: 96 })
  .resize(N, N, { fit: 'fill' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const bg = [data[0], data[1], data[2]];
const ink = new Uint8Array(N * N);
for (let y = 0; y < N; y += 1) {
  for (let x = 0; x < N; x += 1) {
    const i = (y * N + x) * info.channels;
    const d =
      Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
    ink[y * N + x] = d > 24 ? 1 : 0;
  }
}

const rows = new Array(N).fill(0);
const cols = new Array(N).fill(0);
let total = 0;
for (let y = 0; y < N; y += 1) {
  for (let x = 0; x < N; x += 1) {
    if (ink[y * N + x]) {
      rows[y] += 1;
      cols[x] += 1;
      total += 1;
    }
  }
}

const pct = (v) => Math.round((v / N) * 1000) / 10;
const bbox = (arr, minCount) => {
  let lo = -1;
  let hi = -1;
  for (let i = 0; i < N; i += 1) {
    if (arr[i] >= minCount) {
      if (lo < 0) lo = i;
      hi = i;
    }
  }
  return [lo, hi];
};

const [rl, rh] = bbox(rows, 1);
const [cl, ch] = bbox(cols, 1);
const [rl2, rh2] = bbox(rows, N * 0.01);
const [cl2, ch2] = bbox(cols, N * 0.01);

console.log(`背景色 rgb(${bg.join(',')})  总墨迹 ${Math.round((total / (N * N)) * 10000) / 100}%`);
console.log(`含杂点全范围: x ${pct(cl)}~${pct(ch + 1)}%  y ${pct(rl)}~${pct(rh + 1)}%`);
console.log(
  `主图形范围:   x ${pct(cl2)}~${pct(ch2 + 1)}%  y ${pct(rl2)}~${pct(rh2 + 1)}%`,
);

const u = (v) => Math.round((v / N) * 2048);
const x0 = u(cl2);
const x1 = u(ch2 + 1);
const y0 = u(rl2);
const y1 = u(rh2 + 1);
console.log(`主图形 2048 坐标: x ${x0}~${x1}  y ${y0}~${y1}  宽 ${x1 - x0} 高 ${y1 - y0}`);

const cx = (x0 + x1) / 2;
const cy = (y0 + y1) / 2;
const side = Math.max(x1 - x0, y1 - y0);
const padded = Math.round(side * 1.16);
const vx = Math.round(cx - padded / 2);
const vy = Math.round(cy - padded / 2);
console.log(`建议正方形 viewBox: ${vx} ${vy} ${padded} ${padded}`);
console.log(
  `填充率对比: 原始 viewBox 下图形占 ${pct(cl2)}~${pct(ch2 + 1)}%（宽 ${pct(ch2 + 1 - cl2)}%）→ 收紧后约 ${Math.round(((x1 - x0) / padded) * 100)}% × ${Math.round(((y1 - y0) / padded) * 100)}%`,
);
