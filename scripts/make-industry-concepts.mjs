#!/usr/bin/env node
/**
 * 生成「涉及领域」概念图（SVG 矢量插画，站点暗色风格）
 * 输出：public/images/industries/<name>.svg
 *
 * 【已弃用 · 2026】8 个领域已全部换成实拍照片 public/images/industries/<name>.jpg，
 * 页面引用也已指向 .jpg。本脚本仅作备用（例如将来新增领域又没有实拍图时，
 * 可先生成一张概念图顶替），运行前请确认不要覆盖已有 .jpg 引用。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'images', 'industries');

const W = 1200;
const H = 900;

/** 通用外框：暗色渐变 + 光晕 + 细网格 + 同心圆 */
const shell = (accent) => `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stop-color="#1a1a21"/>
      <stop offset="55%" stop-color="#101014"/>
      <stop offset="100%" stop-color="#0a0a0c"/>
    </linearGradient>
    <radialGradient id="glow" cx="38%" cy="22%" r="82%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="${accent}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M80 0H0V80" fill="none" stroke="rgba(255,255,255,0.028)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <circle cx="600" cy="450" r="310" fill="none" stroke="rgba(255,255,255,0.05)"/>
  <circle cx="600" cy="450" r="225" fill="none" stroke="rgba(255,255,255,0.07)"/>
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="rgba(255,255,255,0.06)"/>`;

/** 齿轮（cx, cy, 半径, 齿数） */
const gear = (cx, cy, r, teeth = 10) => {
  const lines = [];
  for (let i = 0; i < teeth; i++) {
    const a = (Math.PI * 2 * i) / teeth;
    lines.push(
      `<line x1="${(cx + Math.cos(a) * (r - 4)).toFixed(1)}" y1="${(cy + Math.sin(a) * (r - 4)).toFixed(1)}" x2="${(cx + Math.cos(a) * (r + 14)).toFixed(1)}" y2="${(cy + Math.sin(a) * (r + 14)).toFixed(1)}"/>`
    );
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}"/>${lines.join('')}<circle cx="${cx}" cy="${cy}" r="${Math.round(r * 0.32)}"/>`;
};

const ICONS = {
  // 新能源：太阳 + 光伏板 + 闪电
  energy: {
    accent: '#c9b6d8',
    body: `
      <circle cx="300" cy="82" r="30"/>
      <line x1="300" y1="20" x2="300" y2="36"/><line x1="300" y1="128" x2="300" y2="144"/>
      <line x1="238" y1="82" x2="254" y2="82"/><line x1="346" y1="82" x2="362" y2="82"/>
      <line x1="257" y1="39" x2="268" y2="50"/><line x1="332" y1="114" x2="343" y2="125"/>
      <line x1="343" y1="39" x2="332" y2="50"/><line x1="268" y1="114" x2="257" y2="125"/>
      <polygon points="56,232 252,232 322,384 126,384"/>
      <line x1="88" y1="288" x2="289" y2="288"/>
      <line x1="118" y1="340" x2="305" y2="340"/>
      <line x1="140" y1="232" x2="188" y2="384"/>
      <line x1="214" y1="232" x2="262" y2="384"/>
      <polyline points="246,138 202,232 248,232 206,332" stroke="${'#a9d8b4'}" stroke-width="7"/>`,
  },
  // 汽车制造：轿车轮廓
  automotive: {
    accent: '#a8c4dc',
    body: `
      <path d="M40,272 L58,196 Q70,156 114,154 L246,154 Q292,156 308,196 L330,240 Q346,252 346,272 L346,288 L40,288 Z"/>
      <path d="M114,154 L150,102 L234,102 L250,154"/>
      <line x1="92" y1="222" x2="140" y2="222"/>
      <line x1="252" y1="222" x2="300" y2="222"/>
      <circle cx="114" cy="292" r="34"/><circle cx="114" cy="292" r="13"/>
      <circle cx="272" cy="292" r="34"/><circle cx="272" cy="292" r="13"/>
      <line x1="16" y1="334" x2="384" y2="334"/>`,
  },
  // 建筑工程：塔吊 + 楼体
  construction: {
    accent: '#d8c6a8',
    body: `
      <rect x="40" y="204" width="122" height="180"/>
      <line x1="40" y1="250" x2="162" y2="250"/><line x1="40" y1="296" x2="162" y2="296"/><line x1="40" y1="342" x2="162" y2="342"/>
      <line x1="80" y1="204" x2="80" y2="384"/><line x1="121" y1="204" x2="121" y2="384"/>
      <rect x="222" y="62" width="14" height="322"/>
      <line x1="118" y1="62" x2="362" y2="62"/>
      <line x1="229" y1="44" x2="130" y2="62"/><line x1="229" y1="44" x2="340" y2="62"/>
      <rect x="330" y="68" width="36" height="22"/>
      <line x1="152" y1="62" x2="152" y2="122"/>
      <path d="M138,122 q14,28 28,0"/>
      <line x1="16" y1="384" x2="384" y2="384"/>`,
  },
  // 自动化器械：机械臂 + 齿轮
  automation: {
    accent: '#9fc6bc',
    body: `
      <rect x="118" y="328" width="176" height="52" rx="8"/>
      <line x1="200" y1="328" x2="176" y2="236"/>
      <line x1="176" y1="236" x2="252" y2="162"/>
      <circle cx="200" cy="328" r="13"/><circle cx="176" cy="236" r="13"/><circle cx="252" cy="162" r="13"/>
      <line x1="252" y1="162" x2="322" y2="196"/>
      <line x1="322" y1="196" x2="348" y2="172"/><line x1="332" y1="214" x2="358" y2="192"/>
      ${gear(92, 128, 44, 10)}`,
  },
  // 信息通讯：信号塔 + 电波
  telecom: {
    accent: '#a6c8e0',
    body: `
      <line x1="152" y1="380" x2="190" y2="122"/>
      <line x1="248" y1="380" x2="210" y2="122"/>
      <line x1="164" y1="322" x2="236" y2="322"/>
      <line x1="173" y1="262" x2="227" y2="262"/>
      <line x1="182" y1="204" x2="218" y2="204"/>
      <line x1="164" y1="322" x2="227" y2="262"/><line x1="236" y1="322" x2="173" y2="262"/>
      <line x1="173" y1="262" x2="218" y2="204"/><line x1="227" y1="262" x2="182" y2="204"/>
      <circle cx="200" cy="106" r="11"/>
      <path d="M158,74 A58,58 0 0 0 158,140"/>
      <path d="M132,50 A92,92 0 0 0 132,164"/>
      <path d="M242,74 A58,58 0 0 1 242,140"/>
      <path d="M268,50 A92,92 0 0 1 268,164"/>
      <line x1="16" y1="384" x2="384" y2="384"/>`,
  },
  // 办公设备：显示器 + 打印机
  office: {
    accent: '#c8c8d8',
    body: `
      <rect x="66" y="48" width="234" height="150" rx="10"/>
      <rect x="90" y="72" width="186" height="102"/>
      <line x1="183" y1="198" x2="183" y2="230"/>
      <line x1="138" y1="230" x2="228" y2="230"/>
      <rect x="126" y="214" width="150" height="42"/>
      <rect x="88" y="254" width="232" height="122" rx="10"/>
      <line x1="126" y1="296" x2="282" y2="296"/>
      <rect x="268" y="270" width="36" height="14"/>
      <line x1="16" y1="384" x2="384" y2="384"/>`,
  },
  // 家用电器：冰箱 + 洗衣机 + 电视
  appliance: {
    accent: '#d6bcd0',
    body: `
      <rect x="56" y="58" width="120" height="322" rx="12"/>
      <line x1="56" y1="180" x2="176" y2="180"/>
      <line x1="146" y1="108" x2="146" y2="152"/><line x1="146" y1="210" x2="146" y2="262"/>
      <rect x="218" y="178" width="164" height="202" rx="12"/>
      <circle cx="300" cy="288" r="50"/><circle cx="300" cy="288" r="34"/>
      <line x1="238" y1="208" x2="288" y2="208"/>
      <circle cx="352" cy="210" r="7"/>
      <rect x="228" y="58" width="152" height="96" rx="8"/>
      <rect x="242" y="72" width="124" height="68"/>
      <line x1="16" y1="384" x2="384" y2="384"/>`,
  },
  // 模具机床：机床 + 模具型腔 + 齿轮
  mold: {
    accent: '#b6c2cc',
    body: `
      <rect x="86" y="322" width="234" height="56" rx="8"/>
      <rect x="268" y="122" width="56" height="204"/>
      <rect x="166" y="152" width="104" height="66" rx="6"/>
      <line x1="218" y1="218" x2="218" y2="250"/>
      <rect x="108" y="250" width="184" height="30"/>
      <rect x="70" y="70" width="124" height="112" rx="8"/>
      <circle cx="132" cy="126" r="28"/>
      <line x1="70" y1="204" x2="194" y2="204"/>
      ${gear(318, 78, 34, 9)}
      <line x1="16" y1="384" x2="384" y2="384"/>`,
  },
};

const NAMES = {
  energy: '新能源',
  automotive: '汽车制造',
  construction: '建筑工程',
  automation: '自动化器械',
  telecom: '信息通讯',
  office: '办公设备',
  appliance: '家用电器',
  mold: '模具机床',
};

fs.mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
for (const [key, data] of Object.entries(ICONS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${NAMES[key]}">
  ${shell(data.accent)}
  <g transform="translate(400,244)" fill="none" stroke="#dededa" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    ${data.body.trim()}
  </g>
</svg>
`;
  const file = path.join(OUT_DIR, `${key}.svg`);
  fs.writeFileSync(file, svg, 'utf8');
  total += Buffer.byteLength(svg);
  console.log(`✓ ${(key + '.svg').padEnd(18)} ${NAMES[key].padEnd(6)} ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
}
console.log(`\n共 ${Object.keys(ICONS).length} 张概念图（SVG），合计 ${(total / 1024).toFixed(1)} KB`);
