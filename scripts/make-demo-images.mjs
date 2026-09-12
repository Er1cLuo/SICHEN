#!/usr/bin/env node
/**
 * 生成演示用本地图片（SVG）到 public/images/demo/。
 * 仅用于演示"加真实图片"的流程；正式内容请换成自己的照片（JPG/PNG），
 * 放到 public/images/ 后在页面里引用 /images/xxx.jpg 即可。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'images', 'demo');

// 简单确定性随机数（同一 seed 每次生成一致）
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * 生成一张演示图 SVG
 * @param {object} o
 * @param {string} o.file   文件名
 * @param {string} o.cn     中文标签（如 "冲压车间 · 演示图"）
 * @param {string} o.en     英文小标（如 "STAMPING · DEMO"）
 * @param {string} o.accent 强调色（描边/光晕）
 * @param {number} o.w      宽
 * @param {number} o.h      高
 * @param {number} o.seed   随机种子
 */
function make({ file, cn, en, accent, w = 1200, h = 900, seed = 1 }) {
  const r = rng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const rad = Math.min(w, h) * 0.3;
  const rings = [];
  for (let i = 0; i < 3; i++) {
    rings.push({
      cx: w * (0.15 + r() * 0.7),
      cy: h * (0.15 + r() * 0.7),
      r: rad * (0.25 + r() * 0.5),
    });
  }
  const hex = (x, y, r) => {
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 3) * k - Math.PI / 6;
      pts.push(`${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const sheen = [0, 0, w, h * 0.16, w * 0.22, 0].map((v) => v.toFixed(1)).join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stop-color="#191920"/>
      <stop offset="55%" stop-color="#101015"/>
      <stop offset="100%" stop-color="#0a0a0c"/>
    </linearGradient>
    <radialGradient id="glow" cx="38%" cy="26%" r="85%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.16"/>
      <stop offset="60%" stop-color="${accent}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <polygon points="${sheen}" fill="url(#sheen)"/>
  <rect x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.9}" height="${h * 0.9}" fill="none" stroke="${accent}" stroke-opacity="0.16"/>
  ${rings
    .map(
      (c) =>
        `<circle cx="${c.cx.toFixed(1)}" cy="${c.cy.toFixed(1)}" r="${c.r.toFixed(1)}" fill="none" stroke="${accent}" stroke-opacity="0.10"/>`
    )
    .join('\n  ')}
  <polygon points="${hex(cx + rad * 0.28, cy, rad * 0.42)}" fill="none" stroke="${accent}" stroke-opacity="0.55"/>
  <polygon points="${hex(cx + rad * 0.28, cy, rad * 0.3)}" fill="none" stroke="${accent}" stroke-opacity="0.28"/>
  <circle cx="${(cx + rad * 0.28).toFixed(1)}" cy="${cy.toFixed(1)}" r="${(rad * 0.07).toFixed(1)}" fill="${accent}" fill-opacity="0.5"/>
  <text x="${w * 0.06}" y="${h * 0.88}" font-family="'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif" font-size="${Math.round(h * 0.055)}" letter-spacing="${Math.round(w * 0.006)}" fill="#e9e9e5">${cn}</text>
  <text x="${w * 0.06}" y="${h * 0.88 + Math.round(h * 0.075)}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="${Math.round(h * 0.024)}" letter-spacing="${Math.round(w * 0.008)}" fill="#8d8d94">${en}</text>
</svg>
`;
  const filePath = path.join(OUT_DIR, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, svg, 'utf8');
  console.log('生成:', filePath);
}

make({
  file: 'demo-hero.svg',
  cn: '精密制造 · 演示主视觉',
  en: 'SICEN HARDWARE · DEMO HERO',
  accent: '#d6d6d0',
  w: 1920,
  h: 1080,
  seed: 11,
});
make({
  file: 'demo-factory.svg',
  cn: '公司环境 · 演示图',
  en: 'FACILITY · DEMO',
  accent: '#c9d1d6',
  seed: 22,
});
make({
  file: 'demo-workshop.svg',
  cn: '制造实力 · 演示车间',
  en: 'WORKSHOP · DEMO',
  accent: '#d6d6d0',
  w: 1920,
  h: 900,
  seed: 33,
});
make({
  file: 'demo-stamping.svg',
  cn: '精密冲压件 · 演示图',
  en: 'STAMPING · DEMO',
  accent: '#b8c4cc',
  seed: 44,
});
make({
  file: 'demo-machining.svg',
  cn: '精密机加工件 · 演示图',
  en: 'MACHINING · DEMO',
  accent: '#a9b7ae',
  seed: 55,
});
make({
  file: 'demo-fasteners.svg',
  cn: '紧固件与连接件 · 演示图',
  en: 'FASTENERS · DEMO',
  accent: '#c3b9a8',
  seed: 66,
});
make({
  file: 'demo-finishing.svg',
  cn: '钣金与表面处理 · 演示图',
  en: 'FINISHING · DEMO',
  accent: '#aab6c0',
  seed: 77,
});
