#!/usr/bin/env node
/**
 * 生成“同名占位 PNG”（扁平极简风格，文件小、编号清晰）。
 *
 * 用法：往 public/images/ 对应目录放入同名真实图片（JPG/PNG/WebP）覆盖即可，代码无需改动。
 *
 * 编号标记说明：占位图【左上角的小方块个数】= 该图在对应图组中的序号
 *   例：company/slider-3.png 左上角有 3 个小方块 → 它就是轮播图的第 3 张。
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '..', 'public', 'images');

/* ---------------- 极简 PNG 编码器（RGBA 8bit，无第三方依赖） ---------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
};

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------------- 扁平线框绘制（同类色块 → PNG 体积小） ---------------- */
function drawFlat(w, h, bg, accent, badge) {
  const px = Buffer.alloc(w * h * 4);
  const fill = (x0, y0, x1, y1, [r, g, b], a = 255) => {
    for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1 | 0); y++) {
      for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1 | 0); x++) {
        const i = (y * w + x) * 4;
        if (a >= 255) {
          px[i] = r;
          px[i + 1] = g;
          px[i + 2] = b;
          px[i + 3] = 255;
        } else {
          px[i] = Math.round(px[i] * (1 - a / 255) + r * (a / 255));
          px[i + 1] = Math.round(px[i + 1] * (1 - a / 255) + g * (a / 255));
          px[i + 2] = Math.round(px[i + 2] * (1 - a / 255) + b * (a / 255));
          px[i + 3] = 255;
        }
      }
    }
  };
  const rectOutline = (x0, y0, x1, y1, color, t) => {
    fill(x0, y0, x1, y0 + t, color);
    fill(x0, y1 - t, x1, y1, color);
    fill(x0, y0, x0 + t, y1, color);
    fill(x1 - t, y0, x1, y1, color);
  };

  // 背景 + 外框
  fill(0, 0, w, h, bg);
  const inset = Math.round(Math.min(w, h) * 0.055);
  rectOutline(inset, inset, w - inset, h - inset, [255, 255, 255], 2);

  // 中央“图片”图形：外框 + 太阳 + 山峰
  const gw = Math.round(w * 0.34);
  const gh = Math.round(h * 0.3);
  const gx = Math.round((w - gw) / 2);
  const gy = Math.round((h - gh) / 2) - Math.round(h * 0.02);
  rectOutline(gx, gy, gx + gw, gy + gh, accent, 3);

  const sunR = Math.round(Math.min(w, h) * 0.035);
  const sunX = gx + Math.round(gw * 0.28);
  const sunY = gy + Math.round(gh * 0.3);
  for (let y = -sunR; y <= sunR; y++) {
    for (let x = -sunR; x <= sunR; x++) {
      const d = Math.hypot(x, y);
      if (d > sunR - 3 && d <= sunR) fill(sunX + x, sunY + y, sunX + x + 1, sunY + y + 1, accent);
    }
  }

  const peakY = gy + Math.round(gh * 0.34);
  const baseY = gy + gh - 4;
  const steps = baseY - peakY;
  for (let k = 0; k < steps; k++) {
    const t = k / steps;
    const leftX = gx + Math.round(gw * 0.5) - Math.round(gw * 0.34 * (1 - t));
    const rightX = gx + Math.round(gw * 0.5) + Math.round(gw * 0.34 * (1 - t));
    fill(leftX, peakY + k, leftX + 3, peakY + k + 1, accent);
    fill(rightX - 3, peakY + k, rightX, peakY + k + 1, accent);
  }

  // 左下角“文案条”
  const barH = Math.max(7, Math.round(h * 0.014));
  const gap = Math.round(barH * 1.1);
  const bx = inset + Math.round(w * 0.02);
  let by = h - inset - Math.round(h * 0.16);
  fill(bx, by, bx + Math.round(w * 0.3), by + barH + 3, [235, 235, 232]);
  by += barH + gap;
  fill(bx, by, bx + Math.round(w * 0.22), by + barH, [150, 150, 156]);
  by += barH + gap * 0.8;
  fill(bx, by, bx + Math.round(w * 0.16), by + barH, [110, 110, 118]);

  // 左上角编号标记
  if (badge && badge > 0) {
    const s = Math.max(14, Math.round(Math.min(w, h) * 0.026));
    const g = Math.round(s * 0.55);
    let x = inset + Math.round(w * 0.02);
    const y = inset + Math.round(h * 0.025);
    for (let n = 0; n < Math.min(badge, 12); n++) {
      fill(x, y, x + s, y + s, accent);
      x += s + g;
    }
  }
  return px;
}

/* ---------------- 地图风格占位（公司位置示意图） ---------------- */
function drawMap(w, h, bg, accent) {
  const px = Buffer.alloc(w * h * 4);
  const fill = (x0, y0, x1, y1, [r, g, b], a = 255) => {
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(h, Math.round(y1)); y++) {
      for (let x = Math.max(0, Math.round(x0)); x < Math.min(w, Math.round(x1)); x++) {
        const i = (y * w + x) * 4;
        if (a >= 255) {
          px[i] = r;
          px[i + 1] = g;
          px[i + 2] = b;
          px[i + 3] = 255;
        } else {
          px[i] = Math.round(px[i] * (1 - a / 255) + r * (a / 255));
          px[i + 1] = Math.round(px[i + 1] * (1 - a / 255) + g * (a / 255));
          px[i + 2] = Math.round(px[i + 2] * (1 - a / 255) + b * (a / 255));
          px[i + 3] = 255;
        }
      }
    }
  };

  fill(0, 0, w, h, bg);
  // 细网格（街区）
  for (let x = 0; x < w; x += 80) fill(x, 0, x + 1, h, [58, 64, 72], 120);
  for (let y = 0; y < h; y += 80) fill(0, y, w, y + 1, [58, 64, 72], 120);
  // 地块
  fill(w * 0.05, h * 0.08, w * 0.28, h * 0.36, [34, 38, 44]);
  fill(w * 0.42, h * 0.54, w * 0.66, h * 0.7, [34, 38, 44]);
  fill(w * 0.76, h * 0.14, w * 0.94, h * 0.34, [34, 38, 44]);
  // 道路
  fill(0, h * 0.42, w, h * 0.42 + 7, [96, 106, 118]);
  fill(w * 0.34, 0, w * 0.34 + 7, h, [96, 106, 118]);
  fill(0, h * 0.74, w, h * 0.74 + 4, [74, 82, 92]);
  fill(w * 0.72, 0, w * 0.72 + 4, h, [74, 82, 92]);

  const cx = Math.round(w * 0.5);
  const cy = Math.round(h * 0.5);
  // 脉冲圈
  for (let y = -90; y <= 90; y++) {
    for (let x = -90; x <= 90; x++) {
      const d = Math.hypot(x, y);
      if (d > 78 && d <= 83) fill(cx + x, cy + y, cx + x + 1, cy + y + 1, accent, 130);
    }
  }
  // 定位标记：圆头 + 尖尾
  const headR = Math.max(16, Math.round(Math.min(w, h) * 0.045));
  const headY = cy - Math.round(headR * 0.9);
  for (let y = -headR; y <= headR; y++) {
    for (let x = -headR; x <= headR; x++) {
      if (Math.hypot(x, y) <= headR) fill(cx + x, headY + y, cx + x + 1, headY + y + 1, accent);
    }
  }
  const tail = headR * 2;
  for (let k = 0; k < tail; k++) {
    const half = Math.round((1 - k / tail) * headR * 0.85);
    fill(cx - half, headY + headR - 2 + k, cx + half, headY + headR - 1 + k, accent);
  }
  return px;
}

/* ---------------- 配色（按分类） ---------------- */
const THEME = {
  company: { bg: [22, 22, 27], accent: [214, 214, 208] },
  equipment: { bg: [18, 23, 28], accent: [150, 186, 200] },
  products: { bg: [26, 22, 17], accent: [200, 168, 120] },
  certificates: { bg: [20, 25, 21], accent: [166, 196, 168] },
  workshops: { bg: [20, 22, 26], accent: [176, 196, 210] },
  map: { bg: [18, 20, 24], accent: [214, 96, 92] },
};

/* ---------------- 生成清单：[路径, 宽, 高, 分类, 编号] ---------------- */
const files = [
  // 公司（slider-1/slider-2/facade 已是真实照片 .jpg，不再生成占位）
  ['company/slider-3.png', 1600, 900, 'company', 3],
  ['company/slider-4.png', 1600, 900, 'company', 4],
  ['company/office-1.png', 1200, 900, 'company', 0],
  ['company/team-1.png', 1200, 900, 'company', 0],
  ['company/map-1.png', 1920, 800, 'map', 0],
  // 器械设备（hero / lab-1 / machine-1 / machine-2 / qc-1 已是真实照片 .jpg）
  ['equipment/workshop-1.png', 1600, 900, 'equipment', 0],
  ['equipment/workshop-stamping.png', 1200, 900, 'equipment', 0],
  ['equipment/workshop-cnc.png', 1200, 900, 'equipment', 0],
  ['equipment/warehouse-1.png', 1200, 900, 'equipment', 4],
  // 产品 8 类
  ['products/stamping-1.png', 1200, 900, 'products', 1],
  ['products/machining-1.png', 1200, 900, 'products', 2],
  ['products/fasteners-1.png', 1200, 900, 'products', 3],
  ['products/sheet-metal-1.png', 1200, 900, 'products', 4],
  ['products/spring-1.png', 1200, 900, 'products', 5],
  ['products/turning-1.png', 1200, 900, 'products', 6],
  ['products/mold-1.png', 1200, 900, 'products', 7],
  ['products/finishing-1.png', 1200, 900, 'products', 8],
  // 产品实拍图集 8 张
  ['products/gallery-1.png', 1200, 900, 'products', 1],
  ['products/gallery-2.png', 1200, 900, 'products', 2],
  ['products/gallery-3.png', 1200, 900, 'products', 3],
  ['products/gallery-4.png', 1200, 900, 'products', 4],
  ['products/gallery-5.png', 1200, 900, 'products', 5],
  ['products/gallery-6.png', 1200, 900, 'products', 6],
  ['products/gallery-7.png', 1200, 900, 'products', 7],
  ['products/gallery-8.png', 1200, 900, 'products', 8],
  // 认证证书 6 张
  ['certificates/cert-1.png', 1200, 900, 'certificates', 1],
  ['certificates/cert-2.png', 1200, 900, 'certificates', 2],
  ['certificates/cert-3.png', 1200, 900, 'certificates', 3],
  ['certificates/cert-4.png', 1200, 900, 'certificates', 4],
  ['certificates/cert-5.png', 1200, 900, 'certificates', 5],
  ['certificates/cert-6.png', 1200, 900, 'certificates', 6],
  // 车间概貌（cnc-1/2/3、cold-heading-1、optical-sorting-1 已是真实照片 .jpg）
  ['workshops/cold-heading-2.png', 1200, 900, 'workshops', 2],
  ['workshops/cold-heading-3.png', 1200, 900, 'workshops', 3],
  ['workshops/thread-rolling-1.png', 1600, 900, 'workshops', 1],
  ['workshops/thread-rolling-2.png', 1200, 900, 'workshops', 2],
  ['workshops/thread-rolling-3.png', 1200, 900, 'workshops', 3],
  ['workshops/optical-sorting-2.png', 1200, 900, 'workshops', 2],
  ['workshops/optical-sorting-3.png', 1200, 900, 'workshops', 3],
];

/**
 * 安全保护：默认【不覆盖已存在的图片】。
 * 因为 public/images 下的同名文件可能已被替换为真实照片，误运行本脚本会覆盖它们。
 * 如确实需要重新生成占位图，请显式加 --force（会覆盖，谨慎使用）：
 *     node scripts/make-placeholder-pngs.mjs --force
 */
const FORCE = process.argv.includes('--force');

let total = 0;
let skipped = 0;
for (const [rel, w, h, cat, badge] of files) {
  const { bg, accent } = THEME[cat];
  const filePath = path.join(BASE, rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!FORCE && fs.existsSync(filePath)) {
    const sizeKb = fs.statSync(filePath).size / 1024;
    skipped++;
    console.log(`↷ 跳过（已存在，未覆盖）${rel.padEnd(34)} 现有 ${sizeKb.toFixed(1)} KB`);
    continue;
  }

  const buf = encodePng(
    w,
    h,
    cat === 'map' ? drawMap(w, h, bg, accent) : drawFlat(w, h, bg, accent, badge)
  );
  fs.writeFileSync(filePath, buf);
  total += buf.length;
  console.log(
    `✓ ${rel.padEnd(34)} ${w}x${h}  ${(buf.length / 1024).toFixed(1)} KB${badge ? `  [编号 ${badge}]` : ''}`
  );
}
console.log(
  `\n共 ${files.length} 张：新生成 ${files.length - skipped} 张，跳过（已存在）${skipped} 张，合计写入 ${(total / 1024 / 1024).toFixed(2)} MB`
);
if (skipped > 0 && !FORCE) {
  console.log('提示：跳过的文件被视为"已有真实图片"。如确需覆盖，请加 --force 参数运行。');
}
