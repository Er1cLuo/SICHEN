/**
 * MP4 faststart 重排（无损，不重新编码）：
 * 把索引块 moov 从文件尾部移到 mdat 之前，并同步修正 stco/co64 里记录的绝对偏移，
 * 这样浏览器可以「边下边播」，iPhone Safari 也能正常起播 / 全屏。
 *
 * 用法：
 *   node scripts/mp4-faststart.mjs public/videos/video.mp4            # 重排并覆盖（自动备份）
 *   node scripts/mp4-faststart.mjs public/videos/video.mp4 --dry-run  # 只看分析结果
 *
 * 备份位置：<项目根>/originals/videos/<文件名>（已在 .gitignore 中，不会被部署）
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const file = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!file) {
  console.error('用法：node scripts/mp4-faststart.mjs <file.mp4> [--dry-run]');
  process.exit(1);
}

const path = resolve(file);
const buf = readFileSync(path);

/** 解析顶层 box 列表 */
function topLevelBoxes(buffer) {
  const boxes = [];
  let off = 0;
  while (off + 8 <= buffer.length) {
    let boxSize = buffer.readUInt32BE(off);
    const type = buffer.toString('latin1', off + 4, off + 8);
    let header = 8;
    if (boxSize === 1) {
      boxSize = Number(buffer.readBigUInt64BE(off + 8));
      header = 16;
    } else if (boxSize === 0) {
      boxSize = buffer.length - off;
    }
    if (boxSize < header || off + boxSize > buffer.length) {
      console.warn(`  ⚠ 跳过异常 box ${type} @${off}（声明长度 ${boxSize}）`);
      break;
    }
    boxes.push({ type, start: off, size: boxSize, header });
    off += boxSize;
  }
  return boxes;
}

/** 递归找出所有 stco / co64 的绝对偏移（返回在 buffer 中的写入位置） */
function chunkOffsetTables(buffer, start, end, found = []) {
  let off = start;
  while (off + 8 <= end) {
    let boxSize = buffer.readUInt32BE(off);
    const type = buffer.toString('latin1', off + 4, off + 8);
    let header = 8;
    if (boxSize === 1) {
      boxSize = Number(buffer.readBigUInt64BE(off + 8));
      header = 16;
    } else if (boxSize === 0) {
      boxSize = end - off;
    }
    if (boxSize < header || off + boxSize > end) break;

    if (type === 'stco' || type === 'co64') {
      const count = buffer.readUInt32BE(off + header + 4);
      const entriesStart = off + header + 8;
      const width = type === 'stco' ? 4 : 8;
      found.push({ type, count, entriesStart, width, boxStart: off, boxEnd: off + boxSize });
    } else if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) {
      chunkOffsetTables(buffer, off + header, off + boxSize, found);
    }
    off += boxSize;
  }
  return found;
}

const boxes = topLevelBoxes(buf);
const moov = boxes.find((b) => b.type === 'moov');
const mdat = boxes.find((b) => b.type === 'mdat');

console.log(`文件：${file}`);
console.log(`大小：${(buf.length / 1048576).toFixed(2)} MB`);
console.log(`顶层 box：${boxes.map((b) => `${b.type}(${b.size})`).join(' → ')}`);

if (!moov || !mdat) {
  console.error('✗ 未找到 moov 或 mdat，无法处理');
  process.exit(1);
}
if (moov.start < mdat.start) {
  console.log('✓ moov 已在 mdat 之前，无需处理');
  process.exit(0);
}

const shift = moov.size;
console.log(`moov 需前移 ${shift} 字节（${(shift / 1024).toFixed(1)} KB）`);

// 组装新文件：mdat 之前的 box → moov → mdat → 其余
const before = boxes.filter((b) => b.start < mdat.start);
const after = boxes.filter((b) => b.start > mdat.start && b !== moov);
const order = [...before, moov, mdat, ...after];

const out = Buffer.alloc(buf.length);
let cursor = 0;
const newStart = new Map();
for (const b of order) {
  buf.copy(out, cursor, b.start, b.start + b.size);
  newStart.set(b, cursor);
  cursor += b.size;
}
if (cursor !== buf.length) {
  console.error(`✗ 组装后长度不一致（${cursor} ≠ ${buf.length}）`);
  process.exit(1);
}

// 修正分块偏移：chunk 数据位于 mdat 内，整体后移了 moov.size
const tables = chunkOffsetTables(out, newStart.get(moov), newStart.get(moov) + moov.size);
let patched = 0;
for (const t of tables) {
  for (let i = 0; i < t.count; i += 1) {
    const p = t.entriesStart + i * t.width;
    if (t.width === 4) {
      const v = out.readUInt32BE(p);
      out.writeUInt32BE(v + shift, p);
    } else {
      const v = Number(out.readBigUInt64BE(p));
      out.writeBigUInt64BE(BigInt(v + shift), p);
    }
    patched += 1;
  }
}
console.log(`修正 ${tables.length} 张偏移表，共 ${patched} 个分块偏移`);

// 校验：所有分块偏移都应落在新 mdat 的数据区内
const newMdatStart = newStart.get(mdat);
const dataLo = newMdatStart + mdat.header;
const dataHi = newMdatStart + mdat.size;
let bad = 0;
for (const t of tables) {
  for (let i = 0; i < t.count; i += 1) {
    const p = t.entriesStart + i * t.width;
    const v = t.width === 4 ? out.readUInt32BE(p) : Number(out.readBigUInt64BE(p));
    if (v < dataLo || v >= dataHi) bad += 1;
  }
}
console.log(
  `新 mdat 数据区：${dataLo} ~ ${dataHi} ｜ 越界偏移 ${bad} 个 ${bad === 0 ? '✓' : '✗'}`,
);

if (bad > 0) {
  console.error('✗ 校验失败，未写入文件');
  process.exit(1);
}

if (dryRun) {
  console.log('（--dry-run，仅分析，未写入）');
  process.exit(0);
}

const backupDir = join(process.cwd(), 'originals', 'videos');
mkdirSync(backupDir, { recursive: true });
const backup = join(backupDir, basename(path));
if (!existsSync(backup)) {
  copyFileSync(path, backup);
  console.log(`已备份原文件 → ${backup.replace(process.cwd() + '\\', '')}`);
} else {
  console.log('备份已存在，跳过备份');
}

writeFileSync(path, out);
console.log(`✓ 已写入：${file}（${(statSync(path).size / 1048576).toFixed(2)} MB）`);
