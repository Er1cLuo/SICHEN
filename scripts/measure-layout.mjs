/**
 * 布局测量脚本（不依赖 Playwright）：
 * 用系统 Edge/Chrome 的 headless + CDP，量出真实渲染后的图文间距、图片宽度等。
 * 用法：node scripts/measure-layout.mjs <url> [viewportWidth]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://127.0.0.1:4321/workshops';
const width = Number(process.argv[3] ?? 1440);

const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const bin = candidates.find((p) => existsSync(p));

const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
const port = 9333;
const child = spawn(
  bin,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--autoplay-policy=no-user-gesture-required',
    `--window-size=${width},1200`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* 还没起来 */
    }
    await sleep(250);
  }
  throw new Error('CDP 未就绪');
}

const wsUrl = await targets();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

function send(method, params = {}) {
  id += 1;
  const myId = id;
  return new Promise((resolve, reject) => {
    pending.set(myId, (msg) => (msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: myId, method, params }));
    setTimeout(() => pending.has(myId) && (pending.delete(myId), reject(new Error(`${method} 超时`))), 20000);
  });
}

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url });
await sleep(2200);

const expr = `(async () => {
  // 站点开启了 scroll-behavior: smooth，会干扰测量，这里临时改成瞬时滚动
  document.documentElement.style.scrollBehavior = 'auto';
  // 先滚到页面底部，触发懒加载图片，避免把「还没加载」误判成「加载失败」
  const step = window.innerHeight;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 900));
  const num = (n) => Math.round(n * 10) / 10;
  const items = [...document.querySelectorAll('.shop-feature')];
  const container = document.querySelector('.container');
  const cs = getComputedStyle(container);
  const contentW = container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const wrap = document.querySelector('.spec-table__wrap');
  const table = document.querySelector('.spec-table');
  const craft = document.querySelector('.craft-grid');
  const allImgs = [...document.images];
  const failed = allImgs
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => img.getAttribute('src'));
  const pending = allImgs.filter((img) => !img.complete).length;
  const logo = document.querySelector('.brand__mark img');
  const logoBox = logo?.getBoundingClientRect();
  const footerLogo = document.querySelector('.footer .brand__mark img');
  const footerBox = footerLogo?.getBoundingClientRect();
  const footerName = document.querySelector('.footer .brand__name');
  const band = document.querySelector('.media-band');
  const bandBox = band?.getBoundingClientRect();
  const industryImgs = [...document.querySelectorAll('.industry-item img')];
  const firstInd = industryImgs[0];
  const indBox = firstInd?.getBoundingClientRect();

  // 页头：静止态 vs 下滑收缩后的实测尺寸
  const hdr = document.getElementById('siteHeader');
  const brandEl = document.querySelector('.brand__mark');
  const navLinkEl = document.querySelector('.nav__link');
  const headerSnap = () => ({
    h: Math.round(hdr.getBoundingClientRect().height),
    logo: Math.round(brandEl.getBoundingClientRect().height),
    name: getComputedStyle(document.querySelector('.brand__name')).fontSize,
    nav: navLinkEl ? getComputedStyle(navLinkEl).fontSize : null,
    navCount: document.querySelectorAll('.nav .nav__link').length,
    ctaCount: document.querySelectorAll('.nav__cta').length,
    mobileCount: document.querySelectorAll('.mobile-menu__link').length,
    scrolled: hdr.classList.contains('scrolled'),
    // 横向位置：滚动前后必须完全一致，否则就是"左右乱晃"
    navX: [...document.querySelectorAll('.nav .nav__link')].map((el) =>
      Math.round(el.getBoundingClientRect().left),
    ),
    cta: (() => {
      const el = document.querySelector('.nav__cta');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right) };
    })(),
  });
  const headerTop = headerSnap();
  window.scrollTo(0, 500);
  await new Promise((r) => setTimeout(r, 900));
  const headerDown = headerSnap();
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 800));

  // 视频：元数据、能否起播、全屏 API 是否可用
  const vid = document.querySelector('.video-ph video');
  let videoInfo = null;
  if (vid) {
    const ok = await new Promise((res) => {
      if (vid.readyState >= 1) return res(true);
      const t = setTimeout(() => res(false), 20000);
      vid.addEventListener('loadedmetadata', () => { clearTimeout(t); res(true); }, { once: true });
      vid.addEventListener('error', () => { clearTimeout(t); res(false); }, { once: true });
      vid.load();
    });
    const box = vid.getBoundingClientRect();
    videoInfo = {
      src: vid.currentSrc || vid.querySelector('source')?.getAttribute('src'),
      loaded: ok,
      duration: Math.round(vid.duration * 10) / 10,
      size: vid.videoWidth + '×' + vid.videoHeight,
      readyState: vid.readyState,
      poster: !!vid.getAttribute('poster'),
      controls: vid.controls,
      inline: vid.hasAttribute('playsinline'),
      preload: vid.getAttribute('preload'),
      box: num(box.width) + '×' + num(box.height),
      objectFit: getComputedStyle(vid).objectFit,
      playing: false,
      currentTime: 0,
    };
    try {
      const p = vid.play();
      if (p && p.catch) p.catch(() => {});
      await new Promise((r) => setTimeout(r, 2500));
      videoInfo.playing = !vid.paused && vid.currentTime > 0;
      videoInfo.currentTime = Math.round(vid.currentTime * 10) / 10;
      // 起播后重新读：能解码出画面的话 videoWidth 会变成真实尺寸，totalVideoFrames > 0
      videoInfo.sizeAfterPlay = vid.videoWidth + '×' + vid.videoHeight;
      const q = vid.getVideoPlaybackQuality?.();
      videoInfo.decodedFrames = q ? q.totalVideoFrames : null;
      vid.pause();
    } catch (e) {
      videoInfo.playError = String(e);
    }
    try {
      await vid.requestFullscreen();
      await new Promise((r) => setTimeout(r, 500));
      videoInfo.fullscreen = document.fullscreenElement === vid;
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch (e) {
      videoInfo.fullscreen = 'API 直调被拒（无用户手势）';
    }

    videoInfo.controlsList = vid.getAttribute('controlslist');
    videoInfo.pipBlocked = vid.hasAttribute('disablepictureinpicture');
    videoInfo.hasFsButton = !!document.querySelector('.video-ph__fs');
    vid.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 300));
    const vb = vid.getBoundingClientRect();
    videoInfo.clickPoint = {
      x: Math.round(vb.left + vb.width / 2),
      y: Math.round(vb.top + vb.height / 2),
    };
  }
  const footerGrid = document.querySelector('.footer__grid');
  const footerCols = footerGrid
    ? [...footerGrid.children].map((c) => {
        const b = c.getBoundingClientRect();
        const title = c.querySelector('.footer__title, .brand__name');
        return {
          label: (title?.textContent || '品牌').trim(),
          x: num(b.left),
          w: num(b.width),
          contentW: num(
            [...c.children].reduce((m, el) => Math.max(m, el.getBoundingClientRect().width), 0),
          ),
        };
      })
    : null;
  const footerBottom = document.querySelector('.footer__bottom');

  // 平台嵌入（B站）：默认只有封面，点击后才注入 iframe
  const embedWrap = document.querySelector('.video-ph--embed');
  let embedInfo = null;
  if (embedWrap) {
    const poster = embedWrap.querySelector('.video-ph__poster');
    const before = embedWrap.querySelectorAll('iframe').length;
    embedWrap.querySelector('.video-ph__play')?.click();
    await new Promise((r) => setTimeout(r, 800));
    const iframe = embedWrap.querySelector('iframe');
    const eb = embedWrap.getBoundingClientRect();
    embedInfo = {
      posterSrc: poster?.getAttribute('src') ?? null,
      posterLoaded: poster ? poster.complete && poster.naturalWidth > 0 : null,
      iframesBeforeClick: before,
      iframeSrc: iframe?.getAttribute('src') ?? null,
      allowFullscreen: iframe ? iframe.hasAttribute('allowfullscreen') : null,
      box: num(eb.width) + '×' + num(eb.height),
    };
  }

  const heroEl = document.querySelector('.page-hero');
  const heroBg = document.querySelector('.page-hero__bg img');
  const heroBox = heroEl?.getBoundingClientRect();
  const heroBgBox = heroBg?.getBoundingClientRect();
  // 按 object-fit: cover 计算背景图"实际画出"的尺寸与裁切比例
  let heroDraw = null;
  if (heroBg && heroBox) {
    const nw = heroBg.naturalWidth;
    const nh = heroBg.naturalHeight;
    const scale = Math.max(heroBox.width / nw, heroBox.height / nh);
    const drawnW = nw * scale;
    const drawnH = nh * scale;
    heroDraw = {
      natural: nw + '×' + nh,
      aspect: Math.round((nw / nh) * 100) / 100,
      drawn: Math.round(drawnW) + '×' + Math.round(drawnH),
      cropX: Math.max(0, Math.round((1 - heroBox.width / drawnW) * 100)),
      cropY: Math.max(0, Math.round((1 - heroBox.height / drawnH) * 100)),
    };
  }
  return {
    viewport: window.innerWidth,
    contentW: num(contentW),
    hero: heroBox && {
      w: num(heroBox.width),
      h: num(heroBox.height),
      ratio: Math.round((heroBox.width / heroBox.height) * 100) / 100,
      hasBgImage: !!heroBg,
      bgSrc: heroBg?.getAttribute('src') ?? null,
      bgNatural: heroBg ? heroBg.naturalWidth + '×' + heroBg.naturalHeight : null,
      bgBox: heroBgBox ? num(heroBgBox.width) + '×' + num(heroBgBox.height) : null,
      draw: heroDraw,
      croppedPct: heroDraw ? heroDraw.cropY : null,
    },
    footer: footerGrid && {
      gridW: num(footerGrid.getBoundingClientRect().width),
      cols: footerCols,
      bottom: footerBottom
        ? {
            justify: getComputedStyle(footerBottom).justifyContent,
            dir: getComputedStyle(footerBottom).flexDirection,
            children: footerBottom.children.length,
          }
        : null,
    },
    docOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        ? document.documentElement.scrollWidth + 'px > ' + document.documentElement.clientWidth + 'px'
        : false,
    imgTotal: allImgs.length,
    imgFailed: failed,
    imgPending: pending,
    band: bandBox && {
      w: num(bandBox.width),
      h: num(bandBox.height),
      ratio: Math.round((bandBox.width / bandBox.height) * 100) / 100,
      left: num(bandBox.left),
      right: num(document.documentElement.clientWidth - bandBox.right),
      parent: band.parentElement.className + ' (' + num(band.parentElement.getBoundingClientRect().width) + 'px)',
      clientW: num(band.clientWidth),
      scrollW: band.scrollWidth,
      img: band.querySelector('img')?.getAttribute('src'),
    },
    industries: industryImgs.length
      ? {
          count: industryImgs.length,
          loaded: industryImgs.filter((i) => i.complete && i.naturalWidth > 0).length,
          failed: industryImgs
            .filter((i) => i.complete && i.naturalWidth === 0)
            .map((i) => i.getAttribute('src')),
          box: num(indBox.width) + '×' + num(indBox.height),
          natural: firstInd.naturalWidth + '×' + firstInd.naturalHeight,
          src: firstInd.getAttribute('src'),
          fit: getComputedStyle(firstInd).objectFit,
        }
      : null,
    header: { top: headerTop, down: headerDown },
    footerLogo: footerBox && {
      w: num(footerBox.width),
      h: num(footerBox.height),
      natural: footerLogo.naturalWidth + '×' + footerLogo.naturalHeight,
      loaded: footerLogo.complete && footerLogo.naturalWidth > 0,
      nameSize: footerName ? getComputedStyle(footerName).fontSize : null,
    },
    video: videoInfo,
    embed: embedInfo,
    logo: logoBox && {
      src: logo.getAttribute('src'),
      w: num(logoBox.width),
      h: num(logoBox.height),
      natural: logo.naturalWidth + '×' + logo.naturalHeight,
      loaded: logo.complete && logo.naturalWidth > 0,
    },
    table: wrap && {
      wrapW: num(wrap.clientWidth),
      tableW: num(table.getBoundingClientRect().width),
      scrollW: wrap.scrollWidth,
      overflow: wrap.scrollWidth > wrap.clientWidth + 1,
      cols: document.querySelectorAll('.spec-table thead th').length,
      rows: document.querySelectorAll('.spec-table tbody tr').length,
    },
    craft: craft && {
      cols: getComputedStyle(craft).gridTemplateColumns.split(' ').length,
      count: craft.querySelectorAll('.craft-item').length,
      h: num(craft.getBoundingClientRect().height),
    },
    rows: items.map((el) => {
      const media = el.querySelector('.shop-feature__media');
      const info = el.querySelector('.shop-feature__info');
      const hero = el.querySelector('.shop-feature__hero');
      const thumbs = [...el.querySelectorAll('.shop-feature__thumbs .ph')];
      const m = media.getBoundingClientRect();
      const i = info.getBoundingClientRect();
      const h = hero?.getBoundingClientRect();
      return {
        id: el.id,
        imgW: num(m.width),
        imgPct: num((m.width / contentW) * 100),
        // 图片布局：3 张 = 大图 + 2 小图；1~2 张 = 等宽并排
        mode: hero ? '大图+2小图' : '等宽并排',
        imgCount: el.querySelectorAll('.ph').length,
        heroW: h ? num(h.width) : null,
        thumbW: thumbs.map((t) => num(t.getBoundingClientRect().width)),
        gap: num(i.left - m.right),
        infoW: num(i.width),
        mediaH: num(m.height),
        infoH: num(i.height),
        infoOverflow: info.scrollHeight > info.clientHeight + 1,
        infoContentH: num(info.scrollHeight),
        specRows: el.querySelectorAll('.shop-feature__specs dt').length,
        title: el.querySelector('.shop-feature__title')?.textContent?.trim(),
      };
    }),
  };
})()`;

const { result } = await send('Runtime.evaluate', {
  expression: expr,
  returnByValue: true,
  awaitPromise: true,
});
const data = result.value;

// 页面内脚本出错时给出可诊断的信息，而不是直接崩溃
if (!data || !data.rows) {
  console.error('页面测量脚本返回异常：');
  console.error('  返回键 =', data ? Object.keys(data).join(', ') : String(data));
  console.error('  原始结果 =', JSON.stringify(result).slice(0, 400));
  ws.close();
  child.kill();
  process.exit(1);
}

// 用 CDP 合成一次真实双击（浏览器原生双击视频会进全屏），验证「不允许全屏」是否生效
let fsClick = null;
const point = data.video?.clickPoint;
if (point) {
  for (let i = 0; i < 2; i += 1) {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', {
        type,
        x: point.x,
        y: point.y,
        button: 'left',
        clickCount: i + 1,
        buttons: type === 'mousePressed' ? 1 : 0,
      });
    }
  }
  await sleep(1200);
  const check = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.fullscreenElement;
      const vid = document.querySelector('.video-ph video');
      return { tag: el ? el.tagName : null, isVideo: el === vid, pip: document.pictureInPictureElement ? true : false };
    })()`,
    returnByValue: true,
  });
  fsClick = check.result.value;
  await send('Runtime.evaluate', {
    expression: 'document.fullscreenElement && document.exitFullscreen()',
    returnByValue: true,
  });
}

console.log(`视口 ${data.viewport}px ｜ 内容区宽 ${data.contentW}px ｜ 项目数 ${data.rows.length}`);
console.log('');
console.log(
  '项目'.padEnd(22) + '图片宽   占内容%  布局        图片数  大图宽   小图宽      图文间距  信息栏宽  图片高/内容高',
);
for (const r of data.rows) {
  console.log(
    String(r.title ?? r.id).padEnd(20) +
      String(r.imgW).padStart(7) +
      String(r.imgPct + '%').padStart(9) +
      ('  ' + r.mode).padEnd(14) +
      String(r.imgCount).padStart(5) +
      String(r.heroW ?? '—').padStart(9) +
      ('  ' + (r.thumbW.length ? r.thumbW.join('/') : '—')).padEnd(12) +
      String(r.gap).padStart(9) +
      String(r.infoW).padStart(10) +
      ('   ' + r.mediaH + '/' + r.infoContentH + (r.infoOverflow ? ' ⚠溢出' : '')).padStart(14),
  );
}

if (data.table) {
  console.log('');
  console.log(
    `规格表：容器 ${data.table.wrapW}px ｜ 表格 ${data.table.tableW}px ｜ 横向溢出 ${data.table.overflow ? '是（' + data.table.scrollW + 'px）' : '否'} ｜ ${data.table.cols} 列 × ${data.table.rows} 行`,
  );
}
if (data.craft) {
  console.log(`工艺特点：${data.craft.cols} 列 × ${data.craft.count} 张 ｜ 整块高 ${data.craft.h}px`);
}

if (data.logo) {
  console.log('');
  console.log(
    `Logo：${data.logo.src} ｜ 渲染 ${data.logo.w}×${data.logo.h}px ｜ 加载 ${data.logo.loaded ? '成功' : '失败'}`,
  );
}
console.log(
  `图片：共 ${data.imgTotal} 张 ｜ 加载失败 ${data.imgFailed.length} 张${data.imgFailed.length ? ' → ' + data.imgFailed.join(', ') : ''} ｜ 仍在加载 ${data.imgPending} 张（大图较慢，非错误）`,
);

if (data.band) {
  console.log('');
  console.log(
    `内容横幅：${data.band.w}×${data.band.h}px（比例 ${data.band.ratio}:1）｜ 左右留白 ${data.band.left} / ${data.band.right}px ｜ 父级 ${data.band.parent} ｜ 图片 ${data.band.img}`,
  );
}
if (data.industries) {
  const d = data.industries;
  console.log(
    `涉及领域图：${d.count} 张 ｜ 已加载 ${d.loaded} 张 ｜ 失败 ${d.failed.length} 张${d.failed.length ? ' → ' + d.failed.join(', ') : ''}`,
  );
  console.log(`  首图 ${d.src} ｜ 显示 ${d.box}px ｜ 原始 ${d.natural} ｜ object-fit: ${d.fit}`);
}

console.log(
  `横向溢出：${data.docOverflow ? '⚠ 页面可横向滚动 ' + data.docOverflow : '无'}`,
);

if (data.header) {
  const { top, down } = data.header;
  console.log('');
  console.log('页头：');
  console.log(
    `  静止  ${top.h}px ｜ logo ${top.logo}px ｜ 站名 ${top.name} ｜ 导航 ${top.nav} ｜ scrolled=${top.scrolled}`,
  );
  console.log(
    `  下滑  ${down.h}px ｜ logo ${down.logo}px ｜ 站名 ${down.name} ｜ 导航 ${down.nav} ｜ scrolled=${down.scrolled}`,
  );
  console.log(
    `  导航项 ${top.navCount} 个 ｜ 白底 CTA ${top.ctaCount} 个 ｜ 手机菜单项 ${top.mobileCount} 个`,
  );
  const sameNav =
    top.navX.length === down.navX.length && top.navX.every((x, i) => x === down.navX[i]);
  const sameCta =
    top.cta && down.cta && top.cta.left === down.cta.left && top.cta.right === down.cta.right;
  console.log(
    `  导航项 X 坐标：静止 [${top.navX.join(', ')}] → 下滑 [${down.navX.join(', ')}]  ${sameNav ? '✓ 完全没动' : '✗ 有位移'}`,
  );
  console.log(
    `  联系按钮 X：静止 ${top.cta ? top.cta.left + '~' + top.cta.right : '-'} → 下滑 ${down.cta ? down.cta.left + '~' + down.cta.right : '-'}  ${sameCta ? '✓ 完全没动' : '✗ 有位移'}`,
  );
}

if (data.embed) {
  const e = data.embed;
  console.log('');
  console.log('视频（平台嵌入）：');
  console.log(
    `  窗口 ${e.box} ｜ 封面 ${e.posterSrc}（加载${e.posterLoaded ? '成功' : '失败'}）｜ 点击前 iframe 数 ${e.iframesBeforeClick}`,
  );
  console.log(`  点击后 iframe：${e.iframeSrc ?? '未注入 ✗'}`);
  console.log(`  allowfullscreen：${e.allowFullscreen === null ? '—' : e.allowFullscreen}`);
}

if (data.video) {
  const v = data.video;
  console.log('');
  console.log('视频播放器：');
  console.log(`  文件 ${v.src} ｜ 窗口 ${v.box}px ｜ object-fit: ${v.objectFit}`);
  console.log(
    `  元数据${v.loaded ? '已加载' : '加载失败'} ｜ 时长 ${v.duration}s ｜ 分辨率 ${v.size} ｜ readyState ${v.readyState}`,
  );
  console.log(
    `  controls=${v.controls} ｜ playsinline=${v.inline} ｜ preload=${v.preload} ｜ 封面=${v.poster}`,
  );
  console.log(
    `  试播：${v.playing ? '时间轴在走（' + v.currentTime + 's）' : '未开始' + (v.playError ? ' — ' + v.playError : '')} ｜ 起播后画面尺寸 ${v.sizeAfterPlay ?? '-'} ｜ 已解码视频帧 ${v.decodedFrames ?? '未知'}`,
  );
  if (v.playing && v.decodedFrames === 0) {
    console.log('  ⚠ 时间轴在走但没有解码出画面：很可能编码格式浏览器不支持（只有声音）');
  }
  console.log(
    `  全屏禁止：controlsList="${v.controlsList}" ｜ 画中画已禁 ${v.pipBlocked} ｜ 自建全屏按钮 ${v.hasFsButton ? '仍存在 ✗' : '已移除 ✓'}`,
  );
  if (fsClick) {
    console.log(
      `  双击视频实测：${
        fsClick.tag === null ? '未进入全屏 ✓（符合"只允许窗口播放"）' : '进入全屏 ✗ 元素 <' + fsClick.tag + '>'
      }`,
    );
  }
}

if (data.footerLogo) {
  const f = data.footerLogo;
  console.log('');
  console.log(
    `页脚 logo：渲染 ${f.w}×${f.h}px ｜ 图片原始 ${f.natural} ｜ 加载 ${f.loaded ? '成功' : '失败'} ｜ 页脚站名 ${f.nameSize}`,
  );
}

if (data.footer) {
  const f = data.footer;
  console.log('');
  console.log(`页脚：栅格总宽 ${f.gridW}px（左起 x=0 表示与容器内容左边缘对齐）`);
  for (const c of f.cols) {
    console.log(
      `  ${c.label.padEnd(6)} x=${String(c.x).padStart(7)}  列宽 ${String(c.w).padStart(7)}px  内容宽 ${String(c.contentW).padStart(7)}px`,
    );
  }
  const last = f.cols[f.cols.length - 1];
  const containerRight = (f.cols[0]?.x ?? 0) + data.contentW;
  console.log(
    `  末列右边缘 ${Math.round((last.x + last.w) * 10) / 10}px ｜ 容器内容右边缘 ${Math.round(containerRight * 10) / 10}px`,
  );
  if (f.bottom) console.log(`  底栏：${f.bottom.dir} ｜ justify-content: ${f.bottom.justify} ｜ ${f.bottom.children} 个子项`);
}

if (data.hero) {
  const h = data.hero;
  console.log('');
  console.log(
    `页头：${h.w}×${h.h}px（${h.ratio}:1）｜ 背景图 ${h.hasBgImage ? h.bgSrc + '（原图 ' + h.bgNatural + '，铺满 ' + h.bgBox + '）' : '无'}`,
  );
  if (h.hasBgImage) {
    const d = h.draw;
    console.log(
      `  背景图：原图 ${d.natural}（${d.aspect}:1）｜ 画出尺寸 ${d.drawn} ｜ 裁掉 水平 ${d.cropX}% / 垂直 ${d.cropY}%`,
    );
  }
}

ws.close();
child.kill();
try {
  rmSync(profile, { recursive: true, force: true });
} catch {
  /* 忽略 */
}
