/**
 * 死代码审计：找出 global.css 里定义了、但 src/ 下任何文件都没用到的 class，
 * 以及定义了却从没被 var() 引用过的 CSS 变量。
 * 用法：node scripts/audit-dead-css.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const css = readFileSync('src/styles/global.css', 'utf8');
const srcFiles = walk('src');
const haystack = srcFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

/* ---------------- class ---------------- */
const classes = new Set();
for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
  const name = m[1];
  if (name.length > 1) classes.add(name);
}

// 脚本动态加的、或第三方约定，白名单排除
const whitelist = new Set(['is-visible', 'is-active', 'is-on', 'open', 'scrolled', 'no-js', 'js']);
const unusedClasses = [...classes].filter((c) => !haystack.includes(c) && !whitelist.has(c)).sort();

console.log(`CSS 中定义的 class 共 ${classes.size} 个`);
console.log(`src/ 下未出现的 ${unusedClasses.length} 个：`);
for (const c of unusedClasses) {
  const idx = css.indexOf('.' + c);
  const snippet = css.slice(idx, css.indexOf('}', idx) + 1).replace(/\s+/g, ' ').slice(0, 90);
  console.log(`  .${c}\n      ${snippet}`);
}

/* ---------------- 自定义属性 ---------------- */
// 真声明才计入：--name: 且前面不是标识符字符（排除 .btn--ghost:hover 这类修饰符）
const defs = new Set();
for (const m of css.matchAll(/(?<![a-z0-9_-])(--[a-z0-9-]+)\s*:/gi)) defs.add(m[1]);

const refs = new Set();
for (const f of ['src/styles/global.css', ...srcFiles]) {
  const text = f === 'src/styles/global.css' ? css : readFileSync(f, 'utf8');
  for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) refs.add(m[1]);
}

const unusedVars = [...defs].filter((v) => !refs.has(v)).sort();
console.log(`\nCSS 变量 ${defs.size} 个，未被引用 ${unusedVars.length} 个：`);
for (const v of unusedVars) console.log(`  ${v}`);

if (!unusedClasses.length && !unusedVars.length) console.log('\n✓ 没有死代码');
