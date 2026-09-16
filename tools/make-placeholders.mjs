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

// ---------- Tiny canvas ----------
class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.d = Buffer.alloc(w * h * 4); }
  set(x, y, hex) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !hex) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = parseInt(hex.slice(1, 3), 16);
    this.d[i + 1] = parseInt(hex.slice(3, 5), 16);
    this.d[i + 2] = parseInt(hex.slice(5, 7), 16);
    this.d[i + 3] = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
  }
  rect(x, y, w, h, hex) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex); }
  outline(x, y, w, h, hex) { this.rect(x, y, w, 1, hex); this.rect(x, y + h - 1, w, 1, hex); this.rect(x, y, 1, h, hex); this.rect(x + w - 1, y, 1, h, hex); }
  // Draw an ASCII pixel map with a palette, scaled by `s`.
  map(rows, pal, ox = 0, oy = 0, s = 1) {
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const c = pal[ch]; if (c) this.rect(ox + x * s, oy + y * s, s, s, c);
    }));
  }
  save(name) { writeFileSync(join(OUT, name), encodePNG(this.w, this.h, this.d)); console.log('wrote', name); }
}

// ---------- Palette ----------
const P = {
  K: '#1b1b2f', W: '#f4f1de', G: '#3d3d5c', g: '#6b6b8f', R: '#d64545', r: '#ff7b7b', O: '#ff9f43',
  Y: '#ffd166', B: '#4da3ff', b: '#a8d8ff', N: '#8b5a2b', n: '#c68a4d', L: '#5ad45a', l: '#a9f0a0',
  P: '#b57bff', p: '#ff6fb5', T: '#2fd4c8', S: '#c0c0d0', s: '#e8e8f0', E: '#2b2b2b', D: '#5a3a1a',
};

// ---------- Room backgrounds 960x540 ----------
function room(name, { wall, wall2, floor, floorLine, deco }) {
  const c = new Canvas(960, 540);
  c.rect(0, 0, 960, 540, wall);
  for (let y = 0; y < 400; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < 960; x += 40) c.rect(x, y, 20, 20, wall2);
  c.rect(0, 400, 960, 140, floor);
  for (let y = 400; y < 540; y += 20) c.rect(0, y, 960, 2, floorLine);
  for (let x = 0; x < 960; x += 80) c.rect(x, 400, 2, 140, floorLine);
  c.rect(0, 396, 960, 6, '#2b2b2b');
  deco(c);
  c.save(`room-${name}.png`);
}
const windowAt = (c, x, y, sky = '#0f2a4a') => {
  c.rect(x, y, 140, 110, '#1b1b2f'); c.rect(x + 8, y + 8, 124, 94, sky);
  c.rect(x + 66, y + 8, 6, 94, '#1b1b2f'); c.rect(x + 8, y + 52, 124, 6, '#1b1b2f');
  c.rect(x + 80, y + 16, 12, 12, '#ffd166'); c.rect(x + 20, y + 20, 30, 8, '#26436a');
};
room('kitchen', {
  wall: '#4a5a6b', wall2: '#50627a', floor: '#8a8a9a', floorLine: '#6e6e80',
  deco: (c) => {
    for (let y = 300; y < 396; y += 24) for (let x = 240; x < 960; x += 24) c.outline(x, y, 24, 24, '#3c4b5c'); // tiles
    windowAt(c, 780, 80, '#274b6a');
    c.rect(880, 300, 60, 96, '#c0c0d0'); c.rect(886, 306, 48, 40, '#9aa0b8'); c.rect(905, 296, 10, 26, '#e8e8f0'); // sink
    c.rect(640, 70, 40, 60, '#1b1b2f'); c.rect(648, 78, 24, 44, '#f4f1de'); c.rect(652, 84, 16, 16, '#d64545'); // clock/poster
  },
});
room('living', {
  wall: '#3a2f4a', wall2: '#40344f', floor: '#6b4a2b', floorLine: '#5a3a1a',
  deco: (c) => {
    windowAt(c, 760, 60);
    c.rect(280, 80, 120, 90, '#8b5a2b'); c.rect(288, 88, 104, 74, '#2f5d3a'); c.rect(300, 130, 80, 24, '#3d7a4a'); c.rect(330, 100, 16, 16, '#ffd166'); // painting
    c.rect(300, 430, 380, 80, '#a23b3b'); c.rect(312, 442, 356, 56, '#c94f4f'); c.rect(330, 456, 320, 28, '#a23b3b'); // rug
  },
});
room('bedroom', {
  wall: '#2b3560', wall2: '#30396a', floor: '#5a4a6b', floorLine: '#4a3a5a',
  deco: (c) => {
    windowAt(c, 700, 70, '#0b1a3a'); c.rect(760, 86, 8, 8, '#f4f1de'); c.rect(820, 120, 6, 6, '#f4f1de');
    c.rect(300, 100, 60, 60, '#8b5a2b'); c.rect(306, 106, 48, 48, '#c0c0d0'); c.rect(318, 118, 24, 24, '#f4f1de'); // mirror
    c.rect(240, 440, 260, 70, '#7a5c8a'); c.rect(252, 452, 236, 46, '#8f6ea0'); // rug
  },
});

// ---------- Robin Hood 48x72 (scaled x3 from 16x24) ----------
{
  const rows = [
    '......LLLL......',
    '.....LLLLLL.....',
    '....LLLLLLLLr...',
    '....LLLLLLLL....',
    '.....nnnnnn.....',
    '....KKKKKKKK....',
    '....KWKKKKWK....',
    '.....nnnnnn.....',
    '......nRRn......',
    '.....LLLLLL.....',
    '....LLLLLLLL....',
    '...nLLLLLLLLn...',
    '...nLLNNNNLLn...',
    '...nLLLLLLLLn...',
    '....LLLLLLLL....',
    '....NNNNNNNN....',
    '....NNN..NNN....',
    '....NNN..NNN....',
    '....NNN..NNN....',
    '....DDD..DDD....',
    '...DDDD..DDDD...',
    '................',
    '................',
    '................',
  ];
  const c = new Canvas(48, 72);
  c.map(rows, P, 0, 0, 3);
  c.save('robin.png');
}

// ---------- Robin scenes 96x96 (24x24 base scaled x4 → drawn at x3 into 96px canvases) ----------
const ROBIN = [
  '......LLLL......','.....LLLLLL.....','....LLLLLLLLr...','....LLLLLLLL....','.....nnnnnn.....','....KKKKKKKK....',
  '....KWKKKKWK....','.....nnnnnn.....','......nRRn......','.....LLLLLL.....','....LLLLLLLL....','...nLLLLLLLLn...',
  '...nLLNNNNLLn...','...nLLLLLLLLn...','....LLLLLLLL....','....NNNNNNNN....','....NNN..NNN....','....NNN..NNN....',
  '....NNN..NNN....','....DDD..DDD....','...DDDD..DDDD...',
];
function robinScene(name, draw) {
  const c = new Canvas(144, 96);
  draw(c);
  c.save(`scenes/${name}.png`);
}
mkdirSync(join(OUT, 'scenes'), { recursive: true });
// 1. Victory: Robin with a sack full of loot
robinScene('victory', (c) => {
  const rows = ROBIN.map((r, i) => (i === 9 ? '.....LLLLLLnn...' : i === 10 ? '....LLLLLLLLn...' : i === 11 || i === 12 || i === 13 ? r.slice(0, 12) + 'n...' : r));
  c.map(rows, P, 20, 12, 3);
  c.rect(78, 30, 40, 52, P.N); c.rect(84, 24, 28, 12, P.D); c.rect(90, 16, 16, 12, P.N); c.rect(94, 20, 8, 4, P.Y); // sack + tie
  c.rect(84, 44, 8, 8, P.Y); c.rect(100, 56, 8, 8, P.Y); c.rect(90, 66, 8, 8, P.Y); c.rect(104, 40, 6, 6, P.T); // coins
  c.rect(128, 20, 6, 6, P.Y); c.rect(6, 40, 6, 6, P.Y); c.rect(132, 60, 6, 6, P.W);
});
// 2. Escaped: Robin running away, empty-handed, motion lines behind
robinScene('escaped', (c) => {
  const rows = [...ROBIN];
  rows[11] = '..nnLLLLLLLLn...'; rows[12] = '.nnLLLNNNNLLnn..'; rows[13] = '....LLLLLLLLn...';
  rows[15] = '....NNNNNNNN....'; rows[16] = '...NNNN..NNNN...'; rows[17] = '..NNN......NNN..';
  rows[18] = '.NNN........NNN.'; rows[19] = 'DDD..........DDD'; rows[20] = 'DDD..........DDD';
  c.map(rows, P, 60, 12, 3);
  [30, 46, 62].forEach((y, i) => { c.rect(10 + i * 6, y, 30 - i * 6, 4, P.s); });
  c.rect(20, 78, 24, 4, P.s); c.rect(50, 84, 16, 4, P.s);
});
// 3. Caught: Robin behind bars
robinScene('caught', (c) => {
  c.rect(0, 0, 144, 96, '#0d0d16');
  const rows = ROBIN.map((r, i) => (i === 6 ? '....KKKKKKKK....' : i === 8 ? '......nnnn......' : r));
  c.map(rows, P, 48, 12, 3);
  for (let x = 12; x < 144; x += 24) { c.rect(x, 0, 8, 96, P.g); c.rect(x, 0, 3, 96, P.s); }
  c.rect(0, 8, 144, 6, P.g); c.rect(0, 82, 144, 6, P.g);
});
// 4. Defeat: puzzled Robin, arms spread wide
robinScene('defeat', (c) => {
  const rows = [...ROBIN];
  rows[6] = '....KWKKKKWK....'; rows[8] = '......nOOn......';
  rows[9] = 'nn...LLLLLL...nn'; rows[10] = '.nnnLLLLLLLLnnn.'; rows[11] = '..nnLLLLLLLLnn..'; rows[12] = '....LLNNNNLL....'; rows[13] = '....LLLLLLLL....';
  c.map(rows, P, 48, 12, 3);
  c.rect(112, 14, 6, 14, P.Y); c.rect(112, 32, 6, 6, P.Y); // question mark-ish
  c.rect(118, 8, 8, 6, P.Y); c.rect(126, 14, 6, 6, P.Y);
});

// ---------- Furniture ----------
{ // fridge 110x220
  const c = new Canvas(110, 220);
  c.rect(0, 0, 110, 220, P.S); c.outline(0, 0, 110, 220, P.K);
  c.rect(0, 80, 110, 4, P.K); c.rect(90, 30, 8, 40, P.G); c.rect(90, 100, 8, 60, P.G);
  c.rect(6, 6, 98, 12, P.s);
  c.save('fridge.png');
}
{ // bed 240x130
  const c = new Canvas(240, 130);
  c.rect(0, 0, 30, 130, P.N); c.rect(210, 30, 30, 100, P.N);
  c.rect(20, 60, 200, 50, P.R); c.rect(20, 50, 200, 14, P.W); c.rect(30, 36, 60, 22, P.W);
  c.rect(20, 110, 200, 8, P.N); c.rect(24, 118, 12, 12, P.D); c.rect(204, 118, 12, 12, P.D);
  c.outline(20, 50, 200, 60, P.K);
  c.save('bed.png');
}
{ // table 200x120
  const c = new Canvas(200, 120);
  c.rect(0, 20, 200, 16, P.n); c.rect(0, 36, 200, 6, P.N);
  c.rect(12, 42, 14, 78, P.N); c.rect(174, 42, 14, 78, P.N);
  c.rect(60, 0, 20, 20, P.W); c.rect(64, 4, 12, 4, P.Y); // bowl
  c.outline(0, 20, 200, 22, P.K);
  c.save('table.png');
}
{ // bag 90x90
  const c = new Canvas(90, 90);
  c.rect(30, 0, 30, 20, '#00000000'); c.outline(30, 4, 30, 24, P.D);
  c.rect(6, 24, 78, 60, P.N); c.rect(6, 24, 78, 12, P.D); c.rect(38, 40, 14, 14, P.Y);
  c.outline(6, 24, 78, 60, P.K);
  c.save('bag.png');
}
{ // shelf 220x150
  const c = new Canvas(220, 150);
  c.rect(0, 0, 220, 150, P.N); c.outline(0, 0, 220, 150, P.K);
  c.rect(8, 8, 204, 60, P.D); c.rect(8, 80, 204, 60, P.D);
  const cols = [P.R, P.B, P.L, P.Y, P.P, P.T, P.O, P.p];
  for (let i = 0; i < 8; i++) { c.rect(14 + i * 24, 20 + (i % 3) * 4, 18, 48 - (i % 3) * 4, cols[i]); }
  for (let i = 0; i < 6; i++) { c.rect(14 + i * 32, 92 + (i % 2) * 6, 24, 48 - (i % 2) * 6, cols[(i + 3) % 8]); }
  c.save('shelf.png');
}

{ // cupboard 200x130 (wall cabinet)
  const c = new Canvas(200, 130);
  c.rect(0, 0, 200, 130, P.n); c.outline(0, 0, 200, 130, P.K);
  c.rect(8, 8, 88, 114, P.N); c.rect(104, 8, 88, 114, P.N); c.outline(8, 8, 88, 114, P.D); c.outline(104, 8, 88, 114, P.D);
  c.rect(84, 54, 8, 20, P.Y); c.rect(108, 54, 8, 20, P.Y);
  c.save('cupboard.png');
}
{ // bin 70x80
  const c = new Canvas(70, 80);
  c.rect(6, 12, 58, 68, P.g); c.rect(2, 6, 66, 10, P.G); c.rect(28, 0, 14, 8, P.G);
  for (let x = 12; x < 60; x += 12) c.rect(x, 22, 4, 52, P.G);
  c.outline(6, 12, 58, 68, P.K);
  c.save('bin.png');
}
{ // sofa 220x120
  const c = new Canvas(220, 120);
  c.rect(0, 30, 220, 70, P.B); c.rect(0, 10, 30, 90, '#2f6fbf'); c.rect(190, 10, 30, 90, '#2f6fbf');
  c.rect(30, 30, 160, 30, '#2f6fbf'); c.rect(34, 62, 74, 34, P.b); c.rect(112, 62, 74, 34, P.b);
  c.rect(10, 100, 14, 16, P.D); c.rect(196, 100, 14, 16, P.D);
  c.outline(0, 10, 220, 90, P.K);
  c.save('sofa.png');
}
{ // tv 160x110 (tv on a stand)
  const c = new Canvas(160, 110);
  c.rect(10, 0, 140, 76, P.K); c.rect(18, 8, 124, 60, '#26436a'); c.rect(30, 20, 40, 20, '#3d7a4a'); c.rect(90, 30, 30, 26, P.Y);
  c.rect(0, 80, 160, 30, P.N); c.rect(6, 86, 148, 18, P.D); c.rect(70, 76, 20, 4, P.g);
  c.save('tv.png');
}
{ // wardrobe 120x280
  const c = new Canvas(120, 280);
  c.rect(0, 0, 120, 280, P.N); c.outline(0, 0, 120, 280, P.K);
  c.rect(8, 8, 50, 264, P.D); c.rect(62, 8, 50, 264, P.D); c.rect(50, 120, 6, 30, P.Y); c.rect(64, 120, 6, 30, P.Y);
  c.rect(14, 14, 38, 100, P.N); c.rect(68, 14, 38, 100, P.N);
  c.save('wardrobe.png');
}
{ // nightstand 90x80
  const c = new Canvas(90, 80);
  c.rect(0, 0, 90, 60, P.n); c.outline(0, 0, 90, 60, P.K); c.rect(10, 10, 70, 18, P.N); c.rect(10, 34, 70, 18, P.N);
  c.rect(40, 16, 10, 6, P.Y); c.rect(40, 40, 10, 6, P.Y); c.rect(6, 60, 12, 20, P.D); c.rect(72, 60, 12, 20, P.D);
  c.save('nightstand.png');
}
{ // chair 80x110
  const c = new Canvas(80, 110);
  c.rect(10, 0, 60, 56, P.N); c.rect(18, 8, 44, 40, P.D); c.rect(6, 56, 68, 14, P.n);
  c.rect(10, 70, 10, 40, P.N); c.rect(60, 70, 10, 40, P.N); c.outline(6, 56, 68, 14, P.K);
  c.save('chair.png');
}
{ // box 70x60
  const c = new Canvas(70, 60);
  c.rect(0, 14, 70, 46, P.n); c.rect(0, 6, 70, 12, P.N); c.outline(0, 6, 70, 54, P.K); c.rect(30, 24, 10, 10, P.D);
  c.rect(20, 0, 30, 8, P.N);
  c.save('box.png');
}

// ---------- Items 32x32 (16x16 maps scaled x2) ----------
const ITEMS = {
  apple: ['......N.........','.....NN.........','....LLN.........','...RRRRRRR......','..RRRRRRRRR.....','.RRRRWRRRRRR....','.RRRRWRRRRRR....','.RRRRRRRRRRR....','.RRRRRRRRRRR....','.RRRRRRRRRRR....','..RRRRRRRRR.....','...RRR.RRR......','................','................','................','................'],
  cheese: ['................','................','........Y.......','......YYYY......','....YYYYYYYY....','..YYYYYYYYYYYY..','.YYOYYYYYOYYYYY.','.YYYYYYYYYYYYYY.','.YYYYYOYYYYYOYY.','.YYYYYYYYYYYYYY.','.YOYYYYYYYYYYYY.','.YYYYYYYYYOYYYY.','.YYYYYYYYYYYYYY.','................','................','................'],
  bread: ['................','................','................','....nnnnnnnn....','...nnnnnnnnnn...','..nNNNNNNNNNNn..','..nNNNNNNNNNNn..','..nNNNNNNNNNNn..','..nNNNNNNNNNNn..','..nNNNNNNNNNNn..','..nNNNNNNNNNNn..','...nnnnnnnnnn...','....nnnnnnnn....','................','................','................'],
  milk: ['................','......SSSS......','......SSSS......','.....SSSSSS.....','....WWWWWWWW....','....WWWWWWWW....','....WWBBBBWW....','....WWBBBBWW....','....WWBBBBWW....','....WWWWWWWW....','....WWWWWWWW....','....WWWWWWWW....','....WWWWWWWW....','....WWWWWWWW....','................','................'],
  coin: ['................','................','.....YYYYYY.....','....YYYYYYYY....','...YYOOOOOOYY...','...YYOYYYYOYY...','...YYOYYYYOYY...','...YYOYYYYOYY...','...YYOYYYYOYY...','...YYOOOOOOYY...','....YYYYYYYY....','.....YYYYYY.....','................','................','................','................'],
  ring: ['................','................','.......TT.......','......TTTT......','......TTTT......','.....YYYYYY.....','....YY....YY....','...YY......YY...','...YY......YY...','...YY......YY...','....YY....YY....','.....YYYYYY.....','................','................','................','................'],
  key: ['................','................','....YYYY........','...YY..YY.......','...YY..YY.......','....YYYY........','.....YY.........','.....YY.........','.....YY.........','.....YYYY.......','.....YY.........','.....YYYY.......','.....YY.........','................','................','................'],
  book: ['................','................','...BBBBBBBBBB...','...BBBBBBBBBB...','...BBWWWWWWBB...','...BBWWWWWWBB...','...BBBBBBBBBB...','...BBBBBBBBBB...','...BBBBBBBBBB...','...BBBBBBBBBB...','...BBBBBBBBBB...','...BBBBBBBBBB...','...WWWWWWWWWW...','................','................','................'],
  candle: ['................','.......Y........','......YOY.......','......YOY.......','.......W........','......WWW.......','......WWW.......','......WWW.......','......WWW.......','......WWW.......','......WWW.......','.....NNNNN......','....NNNNNNN.....','................','................','................'],
  hat: ['................','................','................','......LLLL......','.....LLLLLL.....','....LLLLLLLL....','....LLLLLLLL....','....LLLLLLLL....','....LLLLLLLL....','.LLLLLLLLLLLLLL.','LLLLLLLLLLLLLLLL','.LLLLLLLLLLLLLL.','................','................','................','................'],
  sock: ['................','.....RRRR.......','.....RWWR.......','.....RRRR.......','.....RRRR.......','.....RRRR.......','.....RRRR.......','.....RRRR.......','....RRRRR.......','...RRRRRR.......','..RRRRRRR.......','..RRRRRR........','...RRRR.........','................','................','................'],
  cup: ['................','................','................','...WWWWWWWW.....','...WWWWWWWWSS...','...WWWWWWWWS.S..','...WWWWWWWWS.S..','...WWWWWWWWSS...','...WWWWWWWW.....','...WWWWWWWW.....','....WWWWWW......','................','................','................','................','................'],
  egg: ['................','................','.......WW.......','......WWWW......','.....WWWWWW.....','.....WWWWWW.....','....WWWWWWWW....','....WWWWWWWW....','....WWWWWWWW....','....WWWWWWWW....','.....WWWWWW.....','......WWWW......','................','................','................','................'],
  carrot: ['................','..........LL....','.........LLL....','........LL......','.......OOO......','......OOOO......','......OOO.......','.....OOO........','....OOOO........','....OOO.........','...OOO..........','...OO...........','................','................','................','................'],
  clock: ['................','................','.....SSSSSS.....','....SWWWWWWS....','...SWWWKWWWWS...','...SWWWKWWWWS...','...SWWWKWWWWS...','...SWWWKKKWWS...','...SWWWWWWWWS...','...SWWWWWWWWS...','....SWWWWWWS....','.....SSSSSS.....','................','................','................','................'],
  ball: ['................','................','.....RRRRRR.....','....RRRWWWRR....','...RRRWWWWRRR...','...RRWWWWWRRR...','...RRWWWWRRRR...','...RRRWWRRRRR...','...RRRRRRRRRR...','...RRRRRRRRRR...','....RRRRRRRR....','.....RRRRRR.....','................','................','................','................'],
  pen: ['................','..........BB....','.........BBBB...','........BBBB....','.......BBBB.....','......BBBB......','.....BBBB.......','....BBBB........','...YYBB.........','...YYY..........','...KY...........','................','................','................','................','................'],
  spoon: ['................','................','......SSSS......','.....SSSSSS.....','.....SSSSSS.....','.....SSSSSS.....','......SSSS......','.......SS.......','.......SS.......','.......SS.......','.......SS.......','.......SS.......','.......SS.......','................','................','................'],
  lamp: ['................','......YYYY......','.....YYYYYY.....','....YYYYYYYY....','...YYYYYYYYYY...','..YYYYYYYYYYYY..','.......SS.......','.......SS.......','.......SS.......','.......SS.......','.......SS.......','.....SSSSSS.....','....SSSSSSSS....','................','................','................'],
  necklace: ['................','.....YYYYYY.....','....Y......Y....','...Y........Y...','...Y........Y...','...Y........Y...','...Y........Y...','....Y......Y....','.....Y....Y.....','......Y..Y......','.......TT.......','......TTTT......','.......TT.......','................','................','................'],
};
for (const [name, rows] of Object.entries(ITEMS)) {
  const c = new Canvas(32, 32);
  c.map(rows, P, 0, 0, 2);
  c.save(`items/${name}.png`);
}
