#!/usr/bin/env node
// Generates placeholder pixel-art PNGs into assets/sprites/.
// Zero dependencies: tiny PNG encoder on top of node's zlib.
// Usage: node tools/make-placeholders.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'sprites');
mkdirSync(join(OUT, 'items'), { recursive: true });

// ---------- PNG encoder ----------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Colour helpers ----------
const hex2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
const parse = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255];
/** Lighten (amt > 0) or darken (amt < 0) a colour, amt in -1..1. */
const shade = (hex, amt) => {
  const [r, g, b, a] = parse(hex);
  const f = (v) => (amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return `#${hex2(f(r))}${hex2(f(g))}${hex2(f(b))}${a < 255 ? hex2(a) : ''}`;
};
const mix = (h1, h2, t) => {
  const a = parse(h1), b = parse(h2);
  return `#${hex2(a[0] + (b[0] - a[0]) * t)}${hex2(a[1] + (b[1] - a[1]) * t)}${hex2(a[2] + (b[2] - a[2]) * t)}`;
};
const alpha = (hex, a) => hex.slice(0, 7) + hex2(a * 255);

// ---------- Tiny canvas ----------
class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.d = Buffer.alloc(w * h * 4); }
  /** Source-over blend so translucent colours (#rrggbbaa) work as shadows/highlights. */
  set(x, y, hex) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !hex) return;
    x = Math.floor(x); y = Math.floor(y);
    const i = (y * this.w + x) * 4;
    const [r, g, b, a] = parse(hex);
    if (a >= 255) { this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255; return; }
    const sa = a / 255, da = this.d[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) this.d[i + k] = Math.round(([r, g, b][k] * sa + this.d[i + k] * da * (1 - sa)) / oa);
    this.d[i + 3] = Math.round(oa * 255);
  }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  rect(x, y, w, h, hex) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex); }
  outline(x, y, w, h, hex) { this.rect(x, y, w, 1, hex); this.rect(x, y + h - 1, w, 1, hex); this.rect(x, y, 1, h, hex); this.rect(x + w - 1, y, 1, h, hex); }
  /** Vertical gradient c1 (top) → c2 (bottom), quantised to `steps` bands for a pixel look. */
  vgrad(x, y, w, h, c1, c2, steps = 6) {
    for (let j = 0; j < h; j++) { const t = Math.floor((j / h) * steps) / Math.max(1, steps - 1); this.rect(x, y + j, w, 1, mix(c1, c2, Math.min(1, t))); }
  }
  hgrad(x, y, w, h, c1, c2, steps = 6) {
    for (let i = 0; i < w; i++) { const t = Math.floor((i / w) * steps) / Math.max(1, steps - 1); this.rect(x + i, y, 1, h, mix(c1, c2, Math.min(1, t))); }
  }
  /** Solid block with light top/left edge and dark bottom/right edge — instant 3D. */
  bevel(x, y, w, h, base, t = 2, ol = null) {
    this.vgrad(x, y, w, h, shade(base, 0.08), shade(base, -0.12), 4);
    this.rect(x, y, w, t, shade(base, 0.35)); this.rect(x, y, t, h, shade(base, 0.25));
    this.rect(x, y + h - t, w, t, shade(base, -0.4)); this.rect(x + w - t, y, t, h, shade(base, -0.3));
    if (ol) this.outline(x, y, w, h, ol);
  }
  /** Rounded rectangle. */
  rrect(x, y, w, h, r, hex) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = i < r ? r - i - 0.5 : i >= w - r ? i - (w - r) + 0.5 : 0;
      const dy = j < r ? r - j - 0.5 : j >= h - r ? j - (h - r) + 0.5 : 0;
      if (dx * dx + dy * dy <= r * r) this.set(x + i, y + j, hex);
    }
  }
  ellipse(cx, cy, rx, ry, hex) {
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1) this.set(cx + i, cy + j, hex);
  }
  circle(cx, cy, r, hex) { this.ellipse(cx, cy, r, r, hex); }
  /** Shaded ball: base colour, darker towards bottom-right, highlight top-left. */
  sphere(cx, cy, rx, ry, base, bands = 4) {
    for (let b = 0; b < bands; b++) {
      const t = b / bands;
      this.ellipse(Math.round(cx + rx * 0.12 * b), Math.round(cy + ry * 0.12 * b), Math.round(rx * (1 - t * 0.75)), Math.round(ry * (1 - t * 0.75)), b === 0 ? shade(base, -0.35) : shade(base, -0.35 + t * 0.5));
    }
    this.ellipse(Math.round(cx - rx * 0.35), Math.round(cy - ry * 0.4), Math.max(1, Math.round(rx * 0.25)), Math.max(1, Math.round(ry * 0.2)), shade(base, 0.6));
  }
  /** Horizontal cylinder (bottle, log): light band near the left third. */
  cyl(x, y, w, h, base) {
    this.hgrad(x, y, w, h, shade(base, -0.3), shade(base, 0.05), 4);
    this.rect(x + Math.round(w * 0.2), y, Math.max(1, Math.round(w * 0.18)), h, shade(base, 0.3));
    this.rect(x + w - Math.max(1, Math.round(w * 0.15)), y, Math.max(1, Math.round(w * 0.15)), h, shade(base, -0.45));
  }
  /** Checkerboard dithering between two colours. */
  dither(x, y, w, h, c1, c2) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, (i + j) % 2 ? c1 : c2); }
  /** Draws a 1px dark outline around every opaque region (pixel-art style). */
  autoOutline(hex = '#1b1b2f') {
    const src = Buffer.from(this.d);
    const op = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : src[(y * this.w + x) * 4 + 3]) > 40;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (op(x, y)) continue;
      if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) this.set(x, y, hex);
    }
  }
  map(rows, pal, ox = 0, oy = 0, s = 1) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (c) this.rect(ox + x * s, oy + y * s, s, s, c); }));
  }
  /** Drop shadow under a rectangle footprint. */
  shadow(x, y, w, h) { this.ellipse(x + w / 2, y + h, Math.round(w / 2), Math.max(2, Math.round(h / 6)), '#00000055'); }
  save(name) { writeFileSync(join(OUT, name), encodePNG(this.w, this.h, this.d)); console.log('wrote', name); }
}

// ---------- Palette ----------
const P = {
  K: '#1b1b2f', W: '#f4f1de', G: '#3d3d5c', g: '#6b6b8f', R: '#d64545', r: '#ff7b7b', O: '#ff9f43',
  Y: '#ffd166', B: '#4da3ff', b: '#a8d8ff', N: '#8b5a2b', n: '#c68a4d', L: '#5ad45a', l: '#a9f0a0',
  P: '#b57bff', p: '#ff6fb5', T: '#2fd4c8', S: '#c0c0d0', s: '#e8e8f0', E: '#2b2b2b', D: '#5a3a1a',
  // extra shades for the detailed sprites
  F: '#f1c27d', f: '#d9a066', // skin, skin shadow
  M: '#3a9a3a', m: '#2c7a2c', // green mid / dark
  Q: '#7ee07e',               // green light
  H: '#111120',               // deepest outline
  U: '#ffe9a8',               // warm highlight
  V: '#4a2c14',               // boot dark
};

// ---------- Room backgrounds 960x540 ----------
function room(name, { wall, floor, deco, windowSky }) {
  const c = new Canvas(960, 540);
  // wall: darker near the ceiling, slight vignette
  c.vgrad(0, 0, 960, 400, shade(wall, -0.25), shade(wall, 0.06), 10);
  // fine wallpaper pattern (diamonds every 24px)
  for (let y = 12; y < 396; y += 24) for (let x = ((y / 24) % 2) * 12; x < 960; x += 24) {
    c.set(x, y, shade(wall, 0.18)); c.set(x - 1, y + 1, shade(wall, 0.12)); c.set(x + 1, y + 1, shade(wall, 0.12)); c.set(x, y + 2, shade(wall, 0.06));
  }
  // ceiling cornice
  c.rect(0, 0, 960, 6, shade(wall, 0.3)); c.rect(0, 6, 960, 2, shade(wall, -0.4));
  // baseboard
  c.vgrad(0, 388, 960, 12, shade(wall, 0.35), shade(wall, 0.1), 3); c.rect(0, 398, 960, 2, '#12121c'); c.rect(0, 388, 960, 1, shade(wall, 0.5));
  // floor planks with perspective lightening towards the bottom
  c.vgrad(0, 400, 960, 140, shade(floor, -0.2), shade(floor, 0.1), 7);
  for (let y = 400; y < 540; y += 20) {
    c.rect(0, y, 960, 1, shade(floor, -0.5)); c.rect(0, y + 1, 960, 1, shade(floor, 0.15));
    const off = ((y - 400) / 20) % 2 ? 60 : 0;
    for (let x = off; x < 960; x += 120) { c.rect(x, y, 1, 20, shade(floor, -0.5)); c.rect(x + 1, y, 1, 20, shade(floor, 0.1)); }
    for (let x = off + 20; x < 960; x += 120) c.rect(x + 8, y + 9, 40, 1, shade(floor, -0.15)); // wood grain
  }
  // shadow band right under the wall
  c.rect(0, 400, 960, 6, '#00000033');
  // clue panel side: soft shadow so the panel looks lifted
  c.rect(232, 64, 12, 476, '#00000022');
  if (windowSky) windowAt(c, ...windowSky);
  deco(c);
  c.save(`room-${name}.png`);
}
function windowAt(c, x, y, sky = '#0f2a4a', stars = true) {
  c.rect(x - 6, y - 6, 152, 122, '#00000044'); // frame shadow
  c.bevel(x - 4, y - 4, 148, 118, '#6b4a2b', 3, '#12121c');
  c.vgrad(x + 6, y + 6, 128, 98, shade(sky, -0.2), shade(sky, 0.45), 8);
  if (stars) [[18, 14], [40, 26], [96, 12], [110, 40], [30, 60], [70, 20]].forEach(([sx, sy]) => c.set(x + 6 + sx, y + 6 + sy, '#f4f1de'));
  c.sphere(x + 6 + 96, y + 6 + 24, 9, 9, '#ffe9a8', 2); c.rect(x + 6 + 100, y + 6 + 14, 6, 4, shade(sky, 0.45)); // moon
  c.rect(x + 6, y + 6 + 74, 128, 24, alpha('#0a1a30', 0.6)); // rooftops
  c.rect(x + 6 + 12, y + 6 + 66, 18, 8, alpha('#0a1a30', 0.6)); c.rect(x + 6 + 90, y + 6 + 62, 24, 12, alpha('#0a1a30', 0.6));
  c.rect(x + 68, y + 6, 6, 98, '#4a3018'); c.rect(x + 6, y + 52, 128, 6, '#4a3018'); // cross bars
  c.rect(x + 69, y + 6, 1, 98, '#8b5a2b'); c.rect(x + 6, y + 53, 128, 1, '#8b5a2b');
  c.rect(x + 8, y + 8, 2, 40, alpha('#ffffff', 0.25)); // glass gleam
  c.rect(x + 76, y + 8, 2, 30, alpha('#ffffff', 0.18));
  c.rect(x - 8, y + 114, 156, 6, '#8b5a2b'); c.rect(x - 8, y + 118, 156, 2, '#4a3018'); // sill
}
room('kitchen', {
  wall: '#4d6070', floor: '#8f8fa2', windowSky: [780, 80, '#274b6a'],
  deco: (c) => {
    for (let y = 300; y < 388; y += 22) for (let x = 240; x < 960; x += 22) { c.rect(x, y, 22, 22, '#5d7386'); c.outline(x, y, 22, 22, '#3c4b5c'); c.rect(x + 2, y + 2, 8, 2, alpha('#ffffff', 0.15)); } // tiles
    c.rect(240, 296, 720, 4, '#3c4b5c'); c.rect(240, 296, 720, 1, alpha('#ffffff', 0.25)); // tile top edge
    c.bevel(880, 300, 60, 96, '#c0c0d0', 2, '#12121c'); c.vgrad(886, 306, 48, 40, '#8890a8', '#a8b0c8', 3); c.rect(905, 290, 6, 26, '#e8e8f0'); c.rect(905, 290, 14, 6, '#e8e8f0'); // sink
    c.bevel(640, 70, 40, 60, '#1b1b2f', 2, '#111120'); c.vgrad(648, 78, 24, 44, '#f4f1de', '#d8d4c0', 3); c.sphere(660, 92, 7, 7, '#d64545', 3); c.rect(652, 106, 16, 2, '#c0c0d0'); c.rect(652, 112, 10, 2, '#c0c0d0'); // poster
    c.rect(560, 4, 4, 60, '#3d3d5c'); c.vgrad(540, 60, 44, 14, '#ffd166', '#ff9f43', 2); c.ellipse(562, 74, 22, 4, alpha('#ffe9a8', 0.5)); // hanging lamp
  },
});
room('living', {
  wall: '#3f3352', floor: '#6f4c2c', windowSky: [760, 60, '#0f2a4a'],
  deco: (c) => {
    c.rect(276, 76, 128, 98, '#00000044'); c.bevel(280, 80, 120, 90, '#8b5a2b', 3, '#12121c');
    c.vgrad(288, 88, 104, 74, '#7fb1e6', '#2f5d3a', 6); c.ellipse(340, 108, 10, 10, '#ffe9a8'); c.rect(288, 130, 104, 32, '#2f5d3a'); c.rect(300, 124, 80, 12, '#3d7a4a'); c.rect(320, 118, 30, 10, '#4c9a5a'); // landscape painting
    c.ellipse(490, 470, 200, 42, '#00000033');
    c.ellipse(490, 468, 190, 40, '#a23b3b'); c.ellipse(490, 468, 170, 30, '#c94f4f'); c.ellipse(490, 468, 150, 22, '#a23b3b'); c.ellipse(490, 468, 60, 10, '#e07a7a'); // oval rug
    c.rect(440, 8, 4, 40, '#3d3d5c'); c.rect(540, 8, 4, 40, '#3d3d5c'); c.bevel(430, 46, 124, 10, '#3d3d5c', 1); c.rect(460, 34, 8, 12, '#ffe9a8'); c.rect(500, 34, 8, 12, '#ffe9a8'); c.rect(456, 44, 16, 2, '#ffd166'); c.rect(496, 44, 16, 2, '#ffd166'); // chandelier
  },
});
room('bedroom', {
  wall: '#2f3a68', floor: '#5e4d70', windowSky: [700, 70, '#0b1a3a'],
  deco: (c) => {
    c.rect(296, 96, 68, 68, '#00000044'); c.bevel(300, 100, 60, 60, '#8b5a2b', 3, '#12121c'); c.vgrad(306, 106, 48, 48, '#d8dce8', '#a8b0c8', 4); c.rect(310, 110, 4, 30, alpha('#ffffff', 0.5)); c.rect(316, 110, 2, 20, alpha('#ffffff', 0.3)); // mirror
    c.rrect(240, 438, 260, 72, 14, '#00000033'); c.rrect(238, 436, 260, 72, 14, '#7a5c8a'); c.rrect(250, 448, 236, 48, 10, '#8f6ea0'); c.rrect(262, 458, 212, 28, 8, '#7a5c8a'); // rug
    for (let i = 0; i < 6; i++) { const sx = 420 + i * 46, sy = 20 + (i % 2) * 14; c.set(sx, sy, '#f4f1de'); c.set(sx + 1, sy, '#f4f1de'); c.set(sx, sy + 1, '#f4f1de'); } // glow-in-the-dark stars
    c.rect(560, 10, 60, 8, '#8b5a2b'); c.rect(560, 18, 60, 2, '#4a3018'); [0, 14, 28, 44].forEach((o, i) => c.bevel(566 + o, 20 - [10, 14, 8, 12][i], 12, [10, 14, 8, 12][i], [P.R, P.B, P.Y, P.T][i], 1)); // small shelf with books — behind the top HUD, purely decorative
  },
});

// ---------- Robin Hood: 24x36 map drawn at 2x → 48x72 ----------
const RP = { ...P, X: '#ffe4c4' /* skin highlight */, B: '#4da3ff' /* iris */, Z: '#1f4a2e' /* mask */ };
const ROBIN = [
  '..........QQQQQ.........',
  '........QQLLLLLLQ.r.....',
  '.......QLLLLLLLLLM.rr...',
  '......QLLLLLLLLLLLM.r...',
  '......LLLLLLLLLLLLMM....',
  '.....MMMMMMMMMMMMMMM....',
  '.....nNNNNNNNNNNNNNn....',
  '.....NnNXFFFFFnFFFNN....',
  '.....NNFFFFFFFFFFFFN....',
  '.....NfZZWBZZZWBZZfN....',
  '.....NfZZBHZZZBHZZf.....',
  '......fFFFFFfFFFFFf.....',
  '......fFFfFFFFFfFFf.....',
  '.......fFFFRRRFFFf......',
  '........ffFFFFFff.......',
  '..........fFFf..........',
  '.......MMLLFFLLLMM......',
  '......MLLLLLFLLLLLM.....',
  '....QQLLLLDLLLLLLLLQQ...',
  '....QLLLLLLDLLLLLLLLQ...',
  '....QLLLLLLLDLLLLLLLQ...',
  '....FFLDNNNNNYNNNDLFF...',
  '....ffLLLLLLLDLLLLLff...',
  '......MLLLLLLLLLLLM.....',
  '......MMLLLLLLLLLMM.....',
  '.......NNNNNNNNNNN......',
  '.......NNNNNNNNNNN......',
  '.......NNNN...NNNN......',
  '.......DNNN...NNND......',
  '.......DNNN...NNND......',
  '.......VVVV...VVVV......',
  '......VVVVV...VVVVV.....',
  '.....VVVVVV...VVVVVV....',
  '.....HHHHHH...HHHHHH....',
  '........................',
  '........................',
];
function drawRobin(c, ox, oy, rows = ROBIN, s = 2) {
  const tmp = new Canvas(rows[0].length * s, rows.length * s);
  tmp.map(rows, RP, 0, 0, s);
  tmp.autoOutline('#111120');
  for (let y = 0; y < tmp.h; y++) for (let x = 0; x < tmp.w; x++) {
    const i = (y * tmp.w + x) * 4; if (tmp.d[i + 3]) c.set(ox + x, oy + y, `#${hex2(tmp.d[i])}${hex2(tmp.d[i + 1])}${hex2(tmp.d[i + 2])}${hex2(tmp.d[i + 3])}`);
  }
}
{ const c = new Canvas(48, 72); drawRobin(c, 0, 0); c.save('robin.png'); }

// ---------- Robin scenes 144x96 ----------
mkdirSync(join(OUT, 'scenes'), { recursive: true });
function robinScene(name, draw) { const c = new Canvas(144, 96); draw(c); c.save(`scenes/${name}.png`); }
function sack(c, x, y, w, h) {
  c.ellipse(x + w / 2, y + h + 2, w / 2 + 2, 4, '#00000055');
  c.sphere(x + w / 2, y + h / 2 + 4, w / 2, h / 2, '#8b5a2b', 7);
  c.rect(x + w / 2 - 6, y - 2, 12, 8, '#5a3a1a'); c.rect(x + w / 2 - 8, y + 4, 16, 3, '#ffd166'); c.rect(x + w / 2 - 4, y - 8, 8, 6, '#8b5a2b');
  c.autoOutline('#111120');
}
robinScene('victory', (c) => {
  const rows = ROBIN.map((r, i) => (i >= 18 && i <= 21 ? r.slice(0, 19) + 'FF' + r.slice(21) : r));
  drawRobin(c, 24, 12, rows);
  sack(c, 76, 34, 48, 50);
  [[90, 52], [104, 62], [96, 72], [110, 46]].forEach(([x, y]) => c.sphere(x, y, 4, 4, '#ffd166', 2));
  c.sphere(112, 70, 3, 3, '#2fd4c8', 2);
  [[10, 20], [132, 14], [136, 80], [6, 70]].forEach(([x, y]) => { c.rect(x - 1, y - 4, 2, 8, '#ffe9a8'); c.rect(x - 4, y - 1, 8, 2, '#ffe9a8'); });
});
// Robin running to the right, side view (20x32 map at 2x)
const ROBIN_RUN = [
  '.......QQQQQ........',
  '..r..QQLLLLLQ.......',
  '...rrQLLLLLLLLM.....',
  '....LLLLLLLLLLM.....',
  '....LLLLLLLLLLLM....',
  '...MMMMMMMMMMMMMM...',
  '....NNNNNNNNNXFF....',
  '....NnNNNNNFFFFF....',
  '....NNNNZZZWBFFF....',
  '....NNNNZZZBHFFF....',
  '.....NNfFFFFFFFF....',
  '......fFFFFFRFf.....',
  '.......fFFFFFf......',
  '.........fFF........',
  '........MLLLLM......',
  '.......MLLLLLLLM....',
  '.....QQLLLLDLLLLQQ..',
  '....QQLLLLLLDLLLLQQF',
  '...FQLLLLLLLLDLLLLFF',
  '...fLLLLLLLLLLDLLLf.',
  '.....LDNNNNYNNNDL...',
  '......LLLLLLLLLL....',
  '......MLLLLLLLLM....',
  '.......NNNNNNNN.....',
  '......NNNNN.NNNN....',
  '.....NNNN....NNNN...',
  '....NNNN......NNNN..',
  '...NNN.........NNN..',
  '..DNN..........NND..',
  '.VVV............VVV.',
  'VVVV............VVVV',
  'HHHH............HHHH',
];
robinScene('escaped', (c) => {
  // open door on the right: frame, dark night in the doorway, door leaf swung towards us
  c.rect(100, 90, 44, 4, '#00000055');
  c.bevel(102, 6, 40, 86, '#8b5a2b', 3, '#111120');
  c.vgrad(108, 12, 28, 78, '#0b1a3a', '#1e3d66', 6);
  [[112, 20], [126, 16], [120, 34], [131, 44], [114, 50]].forEach(([x, y]) => c.set(x, y, '#f4f1de'));
  c.sphere(128, 26, 5, 5, '#ffe9a8', 2);
  c.rect(108, 74, 28, 16, '#0a1428'); c.rect(108, 70, 8, 4, '#0a1428'); c.rect(124, 66, 12, 8, '#0a1428'); // rooftops
  c.rect(108, 86, 28, 4, '#3a3a5c'); // doorstep
  c.hgrad(90, 10, 14, 80, '#c68a4d', '#8b5a2b', 3); c.outline(90, 10, 14, 80, '#111120'); c.rect(92, 14, 10, 30, alpha('#000000', 0.18)); c.rect(92, 50, 10, 36, alpha('#000000', 0.18)); c.rect(96, 46, 3, 3, '#ffd166'); // door leaf + knob
  c.rect(108, 12, 28, 78, alpha('#ffe9a8', 0.08)); // faint light spilling in
  // Robin running towards the door
  drawRobin(c, 40, 16, ROBIN_RUN);
  c.ellipse(60, 84, 22, 3, alpha('#000000', 0.35));
  // wind: two straight streaks + one swirl
  c.rect(8, 40, 26, 3, alpha('#e8e8f0', 0.9)); c.rect(4, 41, 3, 1, alpha('#e8e8f0', 0.5));
  c.rect(12, 52, 22, 3, alpha('#e8e8f0', 0.9)); c.rect(8, 53, 3, 1, alpha('#e8e8f0', 0.5));
  for (let t = 0; t < Math.PI * 3.2; t += 0.05) { const rr = 2 + t * 1.4, x = Math.round(22 + Math.cos(t) * rr), y = Math.round(68 + Math.sin(t) * rr * 0.8); c.set(x, y, alpha('#e8e8f0', 0.9)); c.set(x, y + 1, alpha('#e8e8f0', 0.9)); }
  c.rect(32, 66, 8, 3, alpha('#e8e8f0', 0.9));
});
robinScene('caught', (c) => {
  c.vgrad(0, 0, 144, 96, '#0a0a12', '#1a1a2c', 6);
  for (let y = 0; y < 96; y += 12) for (let x = 0; x < 144; x += 24) c.outline(x + ((y / 12) % 2) * 12, y, 24, 12, '#141422'); // bricks
  const rows = ROBIN.map((r, i) => (i === 9 ? '.....NfZZZZZZZZZZZfN....' : i === 10 ? '.....NfZZBHZZZBHZZf.....' : i === 12 ? '......fFFFFFFFFFFFf.....' : i === 13 ? '.......fFFFRRRFFFf......' : r));
  drawRobin(c, 48, 12, rows);
  c.ellipse(72, 88, 26, 4, '#00000066');
  for (let x = 10; x < 144; x += 22) { c.cyl(x, 0, 8, 96, '#8a8aa8'); }
  c.bevel(0, 6, 144, 6, '#6b6b8f', 1, '#111120'); c.bevel(0, 82, 144, 6, '#6b6b8f', 1, '#111120');
});
robinScene('defeat', (c) => {
  const rows = [...ROBIN];
  rows[9] = '.....NfZWWBZZZWWBZfN....'; rows[10] = '.....NfZWBHZZZWBHZf.....'; rows[12] = '......fFFFFRRRFFFFf.....'; rows[13] = '.......fFFFRRRFFFf......';
  rows[17] = 'FF....MLLLLLFLLLLLM..FF.'; rows[18] = 'ffFQQLLLLLDLLLLLLLLQQFff'; rows[19] = '..fQQLLLLLLDLLLLLLLQQf..'; rows[20] = '....QLLLLLLLDLLLLLLLQ...';
  drawRobin(c, 48, 12, rows);
  // big question mark
  const Q = ['.YYYY.', 'YY..YY', 'YY..YY', '....YY', '...YY.', '..YY..', '..YY..', '......', '..YY..', '..YY..'];
  c.map(Q, { Y: '#ffd166' }, 106, 6, 4);
  c.rect(108, 8, 2, 6, '#ffe9a8'); c.rect(112, 38, 4, 2, '#ffe9a8');
  c.autoOutline('#111120');
});

// ---------- Furniture ----------
function wood(c, x, y, w, h, base = P.N, t = 2) {
  c.bevel(x, y, w, h, base, t);
  for (let j = y + 4; j < y + h - 4; j += 6) c.rect(x + 3 + ((j / 6) % 3) * 4, j, Math.max(4, w - 10 - ((j / 6) % 3) * 6), 1, alpha('#000000', 0.12)); // grain
}
{ // fridge 110x220
  const c = new Canvas(110, 220);
  c.rect(4, 214, 102, 6, '#00000055');
  c.hgrad(0, 0, 110, 216, '#d8d8e6', '#a8a8bc', 6);
  c.rect(0, 0, 110, 4, '#eeeef6'); c.rect(0, 0, 4, 216, '#e0e0ec'); c.rect(106, 0, 4, 216, '#8c8ca0'); c.rect(0, 212, 110, 4, '#7c7c90');
  c.rect(0, 78, 110, 3, '#6a6a80'); c.rect(0, 81, 110, 1, '#f0f0f8'); // door split
  c.vgrad(90, 26, 9, 42, '#8c8ca0', '#5c5c70', 3); c.rect(91, 27, 2, 40, '#e8e8f0'); // top handle
  c.vgrad(90, 96, 9, 70, '#8c8ca0', '#5c5c70', 3); c.rect(91, 97, 2, 68, '#e8e8f0'); // bottom handle
  c.rect(8, 8, 2, 60, alpha('#ffffff', 0.5)); c.rect(8, 90, 2, 110, alpha('#ffffff', 0.4)); // gleam
  c.rrect(16, 100, 22, 16, 3, '#d64545'); c.rect(18, 102, 8, 4, '#ff7b7b'); // magnet note
  c.rrect(44, 106, 14, 14, 7, '#4da3ff'); c.rect(46, 108, 4, 4, '#a8d8ff');
  c.rect(0, 206, 110, 10, '#3d3d5c'); c.rect(0, 206, 110, 1, '#6b6b8f'); // base kick
  c.autoOutline('#111120');
  c.save('fridge.png');
}
{ // bed 240x130
  const c = new Canvas(240, 130);
  c.rect(12, 122, 216, 8, '#00000055');
  wood(c, 0, 0, 30, 126, P.N); wood(c, 210, 26, 30, 100, P.N); c.rect(4, 4, 22, 6, shade(P.N, 0.4)); // head/foot boards
  c.vgrad(20, 64, 200, 46, '#d64545', '#9a2e2e', 5); // blanket
  for (let x = 30; x < 210; x += 24) c.rect(x, 74, 12, 30, alpha('#000000', 0.1)); // folds
  c.rect(20, 64, 200, 3, '#ff7b7b'); c.rect(20, 100, 200, 2, alpha('#000000', 0.2));
  c.vgrad(20, 50, 200, 14, '#ffffff', '#d8d4c0', 3); // sheet fold
  c.rrect(30, 34, 64, 26, 6, '#e8e4d0'); c.rrect(32, 36, 60, 12, 5, '#ffffff'); c.rect(40, 52, 44, 2, alpha('#000000', 0.1)); // pillow
  wood(c, 20, 110, 200, 8, P.D, 1); c.rect(24, 118, 12, 10, P.D); c.rect(204, 118, 12, 10, P.D);
  c.autoOutline('#111120');
  c.save('bed.png');
}
{ // table 200x120
  const c = new Canvas(200, 120);
  c.rect(10, 114, 180, 6, '#00000055');
  wood(c, 12, 42, 14, 76, P.N); wood(c, 174, 42, 14, 76, P.N); c.rect(24, 48, 152, 6, shade(P.D, -0.2)); // legs + stretcher
  wood(c, 0, 20, 200, 18, P.n, 3); c.rect(0, 20, 200, 2, shade(P.n, 0.5)); c.rect(0, 38, 200, 6, P.D); c.rect(0, 43, 200, 1, shade(P.D, -0.4));
  c.ellipse(70, 22, 18, 4, '#00000033');
  c.sphere(70, 12, 16, 9, '#f4f1de', 3); c.ellipse(70, 8, 12, 3, '#ffd166'); c.sphere(64, 6, 4, 4, '#d64545', 2); c.sphere(74, 5, 4, 4, '#5ad45a', 2); // fruit bowl
  c.rect(130, 8, 14, 14, '#4da3ff'); c.rect(132, 6, 10, 2, '#a8d8ff'); c.rect(134, 10, 2, 8, alpha('#ffffff', 0.6)); // glass
  c.autoOutline('#111120');
  c.save('table.png');
}
{ // bag 90x90
  const c = new Canvas(90, 90);
  c.rect(6, 84, 78, 6, '#00000055');
  c.rrect(30, 2, 30, 30, 10, '#5a3a1a'); c.rrect(34, 6, 22, 26, 8, '#00000000'); c.rect(34, 6, 22, 26, '#00000000');
  // handle as a ring: draw dark ring then clear the middle by re-drawing transparent is not possible; use outline shapes
  const cc = new Canvas(90, 90); cc.rrect(30, 2, 30, 30, 10, '#5a3a1a'); for (let j = 6; j < 32; j++) for (let i = 34; i < 56; i++) { const k = (j * 90 + i) * 4; cc.d[k + 3] = 0; }
  for (let y = 0; y < 90; y++) for (let x = 0; x < 90; x++) { const k = (y * 90 + x) * 4; if (cc.d[k + 3]) c.set(x, y, '#5a3a1a'); }
  c.rect(32, 4, 26, 2, '#8b5a2b');
  c.vgrad(6, 24, 78, 60, '#a96f37', '#6e4520', 6); c.rect(6, 24, 78, 12, '#5a3a1a'); c.rect(6, 24, 78, 2, '#8b5a2b'); // body + flap
  c.rect(8, 36, 2, 46, alpha('#ffffff', 0.15)); c.rect(80, 36, 2, 46, alpha('#000000', 0.25));
  c.rect(6, 36, 78, 1, alpha('#000000', 0.35)); c.rect(12, 30, 66, 1, alpha('#000000', 0.25)); // stitching
  c.rrect(38, 38, 14, 16, 3, '#ffd166'); c.rect(40, 40, 4, 4, '#ffe9a8'); c.rect(43, 46, 4, 6, '#b8860b'); // buckle
  c.rect(6, 74, 78, 2, alpha('#000000', 0.2));
  c.autoOutline('#111120');
  c.save('bag.png');
}
{ // shelf 220x150 — open back so a marker BEHIND / BETWEEN the books shows through the gaps
  const c = new Canvas(220, 150);
  wood(c, 0, 0, 220, 8, P.N, 1); wood(c, 0, 68, 220, 12, P.N, 2); wood(c, 0, 140, 220, 10, P.N, 2);
  wood(c, 0, 0, 8, 150, P.N, 1); wood(c, 212, 0, 8, 150, P.N, 1);
  c.rect(8, 8, 204, 6, alpha('#000000', 0.25)); c.rect(8, 80, 204, 6, alpha('#000000', 0.25)); // shadow under boards
  const cols = [P.R, P.B, P.L, P.Y, P.P, P.T, P.O, P.p];
  const book = (x, y, w, h, col) => { c.hgrad(x, y, w, h, shade(col, 0.15), shade(col, -0.3), 3); c.rect(x, y + 4, w, 2, shade(col, 0.5)); c.rect(x, y + h - 8, w, 2, shade(col, 0.5)); c.rect(x + 1, y + 10, w - 2, 4, alpha('#f4f1de', 0.6)); c.rect(x, y, w, 1, shade(col, 0.4)); };
  for (let i = 0; i < 8; i++) book(14 + i * 24, 20 + (i % 3) * 4, 18, 48 - (i % 3) * 4, cols[i]);
  [14, 42, 70, 128, 156, 184].forEach((x, i) => book(x, 92 + (i % 2) * 6, 22, 48 - (i % 2) * 6, cols[(i + 3) % 8]));
  c.autoOutline('#111120');
  c.save('shelf.png');
}
{ // cupboard 200x130 (wall cabinet)
  const c = new Canvas(200, 130);
  wood(c, 0, 0, 200, 130, P.n, 3);
  [8, 104].forEach((x) => { wood(c, x, 8, 88, 114, P.N, 2); c.rect(x + 8, 16, 72, 98, alpha('#000000', 0.12)); c.outline(x + 8, 16, 72, 98, shade(P.N, -0.4)); c.rect(x + 9, 17, 70, 1, shade(P.N, 0.3)); });
  c.vgrad(84, 54, 8, 22, '#ffe9a8', '#c9a038', 3); c.vgrad(108, 54, 8, 22, '#ffe9a8', '#c9a038', 3);
  c.rect(0, 126, 200, 4, alpha('#000000', 0.3));
  c.autoOutline('#111120');
  c.save('cupboard.png');
}
{ // bin 70x80
  const c = new Canvas(70, 80);
  c.rect(6, 76, 58, 4, '#00000055');
  c.cyl(6, 12, 58, 66, '#7a7a9a');
  for (let x = 12; x < 60; x += 12) { c.rect(x, 22, 4, 50, shade('#7a7a9a', -0.35)); c.rect(x + 4, 22, 1, 50, shade('#7a7a9a', 0.25)); } // ribs
  c.rect(6, 70, 58, 3, shade('#7a7a9a', -0.4));
  c.bevel(2, 6, 66, 10, '#5c5c78', 2); c.bevel(28, 0, 14, 8, '#5c5c78', 1); // lid + knob
  c.autoOutline('#111120');
  c.save('bin.png');
}
{ // sofa 220x120
  const c = new Canvas(220, 120);
  c.rect(6, 114, 208, 6, '#00000055');
  c.vgrad(30, 30, 160, 32, '#4d8fe0', '#2f6fbf', 4); c.rect(30, 30, 160, 3, '#7fb8ff'); // backrest
  [0, 190].forEach((x) => { c.vgrad(x, 10, 30, 90, '#5a9cf0', '#2a62ad', 5); c.rect(x + 2, 10, 26, 3, '#a8d8ff'); c.rect(x + 12, 14, 6, 80, alpha('#ffffff', 0.12)); }); // armrests
  c.vgrad(30, 60, 160, 40, '#3f83d6', '#2a62ad', 4);
  [34, 112].forEach((x) => { c.rrect(x, 62, 74, 34, 6, '#a8d8ff'); c.rrect(x + 2, 64, 70, 14, 5, '#cfe8ff'); c.rect(x + 4, 90, 66, 4, alpha('#000000', 0.15)); c.rect(x + 36, 66, 2, 26, alpha('#000000', 0.08)); }); // cushions
  c.rrect(90, 36, 40, 22, 4, '#ff9f43'); c.rrect(92, 38, 36, 8, 3, '#ffd166'); // throw pillow
  wood(c, 10, 100, 14, 16, P.D, 1); wood(c, 196, 100, 14, 16, P.D, 1); c.rect(30, 100, 160, 4, alpha('#000000', 0.35));
  c.autoOutline('#111120');
  c.save('sofa.png');
}
{ // tv 160x110
  const c = new Canvas(160, 110);
  c.rect(4, 106, 152, 4, '#00000055');
  wood(c, 0, 80, 160, 30, P.N, 2); c.rect(6, 86, 148, 18, alpha('#000000', 0.25)); c.rect(78, 88, 4, 14, shade(P.N, 0.3)); c.rect(40, 94, 8, 2, '#ffd166'); c.rect(112, 94, 8, 2, '#ffd166'); // stand with drawers
  c.bevel(10, 0, 140, 76, '#26263a', 3, null); c.rect(70, 76, 20, 4, '#4a4a66');
  c.vgrad(18, 8, 124, 60, '#3a6fa8', '#1a3a5c', 5);
  c.rect(30, 20, 40, 20, '#3d7a4a'); c.rect(34, 24, 14, 6, '#5ad45a'); c.sphere(105, 42, 14, 13, '#ffd166', 3); c.rect(18, 8, 124, 2, alpha('#ffffff', 0.35)); c.rect(20, 10, 2, 40, alpha('#ffffff', 0.25)); // picture + glare
  c.set(140, 70, '#5ad45a'); c.set(141, 70, '#5ad45a'); // power led
  c.autoOutline('#111120');
  c.save('tv.png');
}
{ // wardrobe 120x280
  const c = new Canvas(120, 280);
  c.rect(4, 276, 112, 4, '#00000055');
  wood(c, 0, 0, 120, 276, P.N, 3);
  [8, 62].forEach((x) => { wood(c, x, 8, 50, 262, P.D, 2); c.rect(x + 6, 14, 38, 100, alpha('#000000', 0.15)); c.outline(x + 6, 14, 38, 100, shade(P.N, 0.2)); c.rect(x + 6, 126, 38, 130, alpha('#000000', 0.1)); c.outline(x + 6, 126, 38, 130, shade(P.N, 0.2)); });
  c.vgrad(50, 120, 6, 30, '#ffe9a8', '#c9a038', 3); c.vgrad(64, 120, 6, 30, '#ffe9a8', '#c9a038', 3);
  c.rect(0, 0, 120, 6, shade(P.N, 0.35)); c.rect(0, 264, 120, 6, shade(P.D, -0.3));
  c.autoOutline('#111120');
  c.save('wardrobe.png');
}
{ // nightstand 90x80
  const c = new Canvas(90, 80);
  c.rect(4, 76, 82, 4, '#00000055');
  wood(c, 6, 60, 12, 20, P.D, 1); wood(c, 72, 60, 12, 20, P.D, 1);
  wood(c, 0, 0, 90, 62, P.n, 2); c.rect(0, 0, 90, 3, shade(P.n, 0.45));
  [10, 34].forEach((y) => { wood(c, 10, y, 70, 18, P.N, 1); c.rect(12, y + 2, 66, 1, shade(P.N, 0.35)); c.vgrad(40, y + 6, 10, 6, '#ffe9a8', '#c9a038', 2); });
  c.autoOutline('#111120');
  c.save('nightstand.png');
}
{ // chair 80x110
  const c = new Canvas(80, 110);
  c.rect(6, 106, 68, 4, '#00000055');
  wood(c, 10, 0, 8, 60, P.N, 1); wood(c, 62, 0, 8, 60, P.N, 1); // back posts
  [8, 22, 36].forEach((y) => wood(c, 18, y, 44, 8, P.D, 1)); // slats
  wood(c, 6, 56, 68, 14, P.n, 2); c.rrect(10, 52, 60, 8, 3, '#d64545'); c.rect(12, 53, 56, 2, '#ff7b7b'); // seat + cushion
  wood(c, 10, 70, 10, 40, P.N, 1); wood(c, 60, 70, 10, 40, P.N, 1); c.rect(20, 84, 40, 4, P.D);
  c.autoOutline('#111120');
  c.save('chair.png');
}
{ // box 70x60
  const c = new Canvas(70, 60);
  c.rect(2, 56, 66, 4, '#00000055');
  c.vgrad(0, 14, 70, 44, '#d3a26a', '#a06f3c', 5);
  c.rect(0, 14, 2, 44, shade('#d3a26a', 0.3)); c.rect(68, 14, 2, 44, shade('#a06f3c', -0.3));
  c.rect(0, 30, 70, 8, '#c9a15a'); c.rect(0, 30, 70, 1, '#e0c080'); c.rect(0, 37, 70, 1, '#8a6a30'); // tape
  c.bevel(0, 6, 70, 12, P.N, 2); c.rect(20, 0, 30, 8, P.N); c.rect(20, 0, 30, 2, shade(P.N, 0.35)); // open lid flaps
  c.rect(28, 40, 14, 10, alpha('#000000', 0.25)); c.rect(30, 42, 10, 6, '#5a3a1a'); // label
  c.autoOutline('#111120');
  c.save('box.png');
}

// ---------- Items 32x32, drawn 1:1 with shading ----------
const item = (name, draw) => { const c = new Canvas(32, 32); draw(c); c.autoOutline('#111120'); c.save(`items/${name}.png`); };
item('apple', (c) => { c.sphere(16, 18, 11, 10, '#d64545', 5); c.rect(15, 5, 2, 6, '#5a3a1a'); c.ellipse(20, 8, 4, 2, '#5ad45a'); c.rect(11, 12, 2, 3, '#ff9f9f'); });
item('cheese', (c) => { for (let j = 0; j < 14; j++) c.rect(3 + Math.round(j * 0.9), 12 + j, 26 - Math.round(j * 0.9), 1, mix('#ffe08a', '#e0a830', j / 14)); c.rect(3, 10, 26, 3, '#fff0b0'); [[9, 16], [19, 20], [14, 23], [24, 15]].forEach(([x, y]) => c.ellipse(x, y, 2, 1, '#c98a1a')); });
item('bread', (c) => { c.sphere(16, 18, 13, 8, '#c68a4d', 4); c.rect(4, 18, 24, 6, '#a96b30'); c.rect(6, 22, 20, 3, '#8b5a2b'); [8, 15, 22].forEach((x) => c.rect(x, 12, 4, 1, '#ffe9a8')); });
item('milk', (c) => { c.bevel(9, 10, 14, 19, '#f4f1de', 1); c.rect(9, 7, 14, 4, '#d8d4c0'); c.rect(12, 3, 8, 5, '#c0c0d0'); c.rect(11, 15, 10, 8, '#4da3ff'); c.rect(13, 17, 6, 2, '#a8d8ff'); c.rect(10, 11, 1, 16, alpha('#ffffff', 0.7)); });
item('coin', (c) => { c.sphere(16, 16, 11, 11, '#ffd166', 4); c.ellipse(16, 16, 7, 7, '#e0a830'); c.ellipse(16, 16, 5, 5, '#ffd166'); c.rect(15, 12, 2, 8, '#c98a1a'); c.rect(13, 14, 6, 1, '#c98a1a'); c.rect(13, 18, 6, 1, '#c98a1a'); });
item('ring', (c) => { c.ellipse(16, 19, 9, 9, '#ffd166'); c.ellipse(16, 19, 6, 6, '#00000000'); const tmp = c; for (let j = 13; j <= 25; j++) for (let i = 10; i <= 22; i++) if (((i - 16) ** 2 + (j - 19) ** 2) <= 36) tmp.d[(j * 32 + i) * 4 + 3] = 0; c.rect(8, 22, 3, 3, '#c98a1a'); c.rect(22, 22, 3, 3, '#c98a1a'); c.sphere(16, 8, 5, 5, '#2fd4c8', 3); c.rect(14, 5, 2, 2, '#ffffff'); });
item('key', (c) => { c.ellipse(11, 10, 6, 6, '#ffd166'); c.ellipse(11, 10, 3, 3, '#c98a1a'); for (let j = 8; j <= 12; j++) for (let i = 9; i <= 13; i++) if (((i - 11) ** 2 + (j - 10) ** 2) <= 4) c.d[(j * 32 + i) * 4 + 3] = 0; c.rect(15, 9, 12, 3, '#ffd166'); c.rect(15, 9, 12, 1, '#ffe9a8'); c.rect(22, 12, 2, 4, '#ffd166'); c.rect(26, 12, 2, 5, '#ffd166'); c.rect(6, 6, 2, 2, '#ffe9a8'); });
item('book', (c) => { c.bevel(6, 5, 20, 24, '#4da3ff', 1); c.rect(6, 5, 4, 24, '#2f6fbf'); c.rect(26, 7, 2, 22, '#f4f1de'); c.rect(8, 29, 20, 1, '#d8d4c0'); c.rrect(12, 10, 11, 8, 1, '#f4f1de'); c.rect(14, 12, 7, 1, '#4da3ff'); c.rect(14, 15, 5, 1, '#4da3ff'); c.rect(10, 5, 1, 24, alpha('#ffffff', 0.35)); });
item('candle', (c) => { c.cyl(11, 12, 10, 14, '#f4f1de'); c.bevel(6, 25, 20, 5, '#c68a4d', 1); c.rect(15, 9, 2, 4, '#3d3d5c'); c.sphere(16, 6, 3, 5, '#ff9f43', 2); c.rect(15, 5, 2, 3, '#ffe9a8'); c.rect(11, 12, 10, 2, '#ffffff'); c.rect(13, 14, 1, 4, '#ffffff'); });
item('hat', (c) => { c.ellipse(16, 23, 14, 4, '#2c7a2c'); c.ellipse(16, 22, 14, 3, '#3a9a3a'); c.sphere(16, 15, 9, 9, '#5ad45a', 4); c.rect(7, 19, 18, 3, '#2c7a2c'); c.rect(22, 8, 2, 6, '#ff7b7b'); c.rect(24, 6, 2, 4, '#d64545'); c.rect(9, 19, 2, 2, '#ffd166'); });
item('sock', (c) => { c.hgrad(11, 4, 9, 14, '#e05050', '#b03030', 3); c.rect(11, 4, 9, 3, '#f4f1de'); c.rect(11, 8, 9, 1, '#f4f1de'); for (let j = 0; j < 8; j++) c.rect(11 - j, 17 + j, 9 + j, 1, mix('#e05050', '#b03030', j / 8)); c.ellipse(9, 25, 6, 3, '#c04040'); c.rect(4, 22, 3, 3, '#f4f1de'); c.rect(12, 5, 1, 12, alpha('#ffffff', 0.35)); });
item('cup', (c) => { c.cyl(7, 8, 16, 18, '#f4f1de'); c.rect(7, 8, 16, 2, '#ffffff'); c.rect(9, 10, 12, 3, '#8b5a2b'); c.ellipse(26, 16, 4, 5, '#e0dcc8'); c.ellipse(26, 16, 2, 3, '#00000000'); for (let j = 13; j <= 19; j++) for (let i = 24; i <= 28; i++) if (((i - 26) ** 2 / 4 + (j - 16) ** 2 / 9) <= 1) c.d[(j * 32 + i) * 4 + 3] = 0; c.rect(8, 26, 14, 2, '#d8d4c0'); c.rect(12, 14, 4, 6, '#d64545'); });
item('egg', (c) => { c.sphere(16, 17, 9, 12, '#f4f1de', 4); c.ellipse(13, 10, 2, 3, '#ffffff'); c.set(19, 20, '#e0dcc8'); c.set(12, 22, '#e0dcc8'); });
item('carrot', (c) => { for (let j = 0; j < 20; j++) c.rect(16 - Math.round((20 - j) * 0.28), 10 + j, Math.max(1, Math.round((20 - j) * 0.56)), 1, mix('#ffb060', '#e07020', j / 20)); c.rect(13, 12, 1, 12, alpha('#ffffff', 0.4)); [4, 9, 14].forEach((y) => c.rect(12, 10 + y, 8 - Math.round(y / 3), 1, alpha('#000000', 0.15))); c.rect(15, 3, 2, 8, '#3a9a3a'); c.rect(12, 5, 3, 6, '#5ad45a'); c.rect(18, 4, 3, 7, '#5ad45a'); });
item('clock', (c) => { c.sphere(16, 17, 12, 12, '#c0c0d0', 3); c.ellipse(16, 17, 9, 9, '#f4f1de'); c.set(16, 10, '#1b1b2f'); c.set(16, 24, '#1b1b2f'); c.set(9, 17, '#1b1b2f'); c.set(23, 17, '#1b1b2f'); c.rect(16, 12, 1, 6, '#1b1b2f'); c.rect(16, 17, 5, 1, '#1b1b2f'); c.rect(16, 17, 1, 1, '#d64545'); c.ellipse(9, 6, 3, 3, '#ffd166'); c.ellipse(23, 6, 3, 3, '#ffd166'); c.rect(10, 4, 2, 2, '#ffe9a8'); });
item('ball', (c) => { c.sphere(16, 16, 12, 12, '#d64545', 5); for (let j = 4; j <= 28; j++) { const w = Math.sqrt(144 - (j - 16) ** 2); c.rect(Math.round(16 - w), j, Math.round(w * 2), 1, j < 12 || j > 20 ? alpha('#f4f1de', 0.95) : '#00000000'); } c.sphere(16, 16, 12, 12, '#d6454500', 1); c.rect(6, 12, 20, 8, '#d64545'); c.rect(6, 12, 20, 1, '#ff7b7b'); c.rect(6, 19, 20, 1, '#a03030'); c.ellipse(11, 9, 2, 1, '#ffffff'); c.rect(4, 12, 24, 8, '#d6454500'); c.rrect(4, 12, 24, 8, 0, '#00000000'); });
item('pen', (c) => { for (let j = 0; j < 18; j++) c.rect(22 - j, 4 + j, 4, 1, mix('#7fb8ff', '#2f6fbf', j / 18)); c.rect(23, 4, 3, 3, '#a8d8ff'); for (let j = 0; j < 4; j++) c.rect(5 - j + 2, 22 + j, 3, 1, '#ffd166'); c.rect(5, 26, 2, 2, '#1b1b2f'); for (let j = 0; j < 18; j++) c.set(23 - j, 4 + j, alpha('#ffffff', 0.4)); });
item('spoon', (c) => { c.sphere(16, 9, 6, 7, '#c0c0d0', 3); c.ellipse(16, 9, 3, 4, '#a0a0b8'); for (let j = 0; j < 16; j++) c.rect(15, 15 + j, 3, 1, mix('#d8d8e6', '#8888a0', j / 16)); c.rect(15, 15, 1, 14, alpha('#ffffff', 0.5)); });
item('lamp', (c) => { for (let j = 0; j < 12; j++) c.rect(16 - 5 - j, 3 + j, 10 + j * 2, 1, mix('#ffe9a8', '#e0a830', j / 12)); c.rect(11, 3, 10, 1, '#fff5d0'); c.rect(12, 5, 2, 8, alpha('#ffffff', 0.5)); c.cyl(14, 15, 4, 10, '#c0c0d0'); c.sphere(16, 27, 8, 3, '#c0c0d0', 2); c.ellipse(16, 15, 9, 2, alpha('#ffe9a8', 0.5)); });
item('necklace', (c) => { for (let a = 0; a <= Math.PI; a += 0.12) { const x = Math.round(16 + Math.cos(a + Math.PI) * 10), y = Math.round(10 + Math.sin(a) * 12); c.set(x, y, '#ffd166'); c.set(x, y - 1, '#ffe9a8'); } c.rect(6, 3, 20, 1, '#ffd166'); c.sphere(16, 24, 4, 5, '#2fd4c8', 3); c.rect(15, 21, 1, 2, '#ffffff'); c.sphere(9, 18, 2, 2, '#ff6fb5', 2); c.sphere(23, 18, 2, 2, '#ff6fb5', 2); });
