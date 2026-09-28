/**
 * MP4 结构分析（随机读取，不把整个文件载入内存，可安全用于 GB 级文件）：
 * 输出顶层 box 顺序、moov 是否在文件前部（faststart）、时长/码率、分辨率、编码、偏移表数量。
 * 用法：node scripts/mp4-info.mjs <file.mp4>
 */
import { closeSync, openSync, readSync, statSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('用法：node scripts/mp4-info.mjs <file.mp4>');
  process.exit(1);
}

const size = statSync(file).size;
const fd = openSync(file, 'r');

function readAt(pos, len) {
  const want = Math.max(0, Math.min(len, size - pos));
  const buf = Buffer.alloc(want);
  if (want === 0) return buf;
  const got = readSync(fd, buf, 0, want, pos);
  return got === want ? buf : buf.subarray(0, got);
}

function boxHeader(pos) {
  const b = readAt(pos, 16);
  if (b.length < 8) return null;
  let boxSize = b.readUInt32BE(0);
  const type = b.toString('latin1', 4, 8);
  let header = 8;
  if (boxSize === 1) {
    if (b.length < 16) return null;
    boxSize = Number(b.readBigUInt64BE(8));
    header = 16;
  } else if (boxSize === 0) {
    boxSize = size - pos;
  }
  return { type, size: boxSize, header, start: pos };
}

/** 递归解析内存片段里的 box */
function walk(buf, start, end, out) {
  let off = start;
  while (off + 8 <= end) {
    let boxSize = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    let header = 8;
    if (boxSize === 1) {
      boxSize = Number(buf.readBigUInt64BE(off + 8));
      header = 16;
    } else if (boxSize === 0) {
      boxSize = end - off;
    }
    if (boxSize < header || off + boxSize > end) break;
    out.push({ type, start: off, size: boxSize, header });
    if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) {
      walk(buf, off + header, off + boxSize, out);
    }
    off += boxSize;
  }
  return out;
}

// 顶层 box：只跳读头部，不读内容
const top = [];
let pos = 0;
while (pos + 8 <= size && top.length < 64) {
  const bx = boxHeader(pos);
  if (!bx || bx.size < bx.header) break;
  top.push(bx);
  pos += bx.size;
}

console.log(`文件：${file}`);
console.log(`大小：${(size / 1048576).toFixed(1)} MB`);
console.log(`顶层 box：${top.map((b) => `${b.type}(${b.size})`).join(' → ')}`);

const moov = top.find((b) => b.type === 'moov');
const mdat = top.find((b) => b.type === 'mdat');
if (moov && mdat) {
  console.log(
    `moov 位置：${moov.start} ｜ mdat 位置：${mdat.start} → ${
      moov.start < mdat.start
        ? '✓ moov 在前，支持边下边播（faststart）'
        : '✗ moov 在尾部，需先读到文件末尾才起播（iOS 可能无法播放）'
    }`,
  );
} else if (!moov) {
  console.log('⚠ 顶层未找到 moov');
}

if (moov) {
  const mb = moov.size / 1048576;
  if (mb > 64) {
    console.log(`⚠ moov 体积 ${mb.toFixed(1)} MB，跳过细节解析`);
  } else {
    const buf = readAt(moov.start, moov.size);
    const boxes = walk(buf, 0, buf.length, []);

    const mvhd = boxes.find((b) => b.type === 'mvhd');
    if (mvhd) {
      const p = mvhd.start + mvhd.header;
      const version = buf.readUInt8(p);
      const timescale = version === 1 ? buf.readUInt32BE(p + 20) : buf.readUInt32BE(p + 12);
      const duration =
        version === 1 ? Number(buf.readBigUInt64BE(p + 24)) : buf.readUInt32BE(p + 16);
      const secs = duration / timescale;
      console.log(
        `时长：${secs.toFixed(1)} 秒（${Math.floor(secs / 60)} 分 ${Math.round(secs % 60)} 秒）｜ 平均码率约 ${((size * 8) / secs / 1e6).toFixed(2)} Mbps`,
      );
    }

    for (const tkhd of boxes.filter((b) => b.type === 'tkhd')) {
      const w = buf.readUInt32BE(tkhd.start + tkhd.size - 8) / 65536;
      const h = buf.readUInt32BE(tkhd.start + tkhd.size - 4) / 65536;
      if (w > 0 && h > 0) console.log(`视频分辨率：${w}×${h}（${(w / h).toFixed(2)}:1）`);
      else console.log('音轨：1 条');
    }

    const codecs = ['avc1', 'hev1', 'hvc1', 'av01', 'vp09', 'mp4a'];
    console.log(`编码：${codecs.filter((c) => buf.includes(c)).join(', ') || '未识别'}`);
    console.log(
      `分块偏移表：${boxes.filter((b) => b.type === 'stco' || b.type === 'co64').length} 张`,
    );
  }
}

closeSync(fd);
