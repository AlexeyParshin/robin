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

// ---------- Room background 960x540 ----------
{
  const c = new Canvas(960, 540);
  c.rect(0, 0, 960, 540, '#3a2f4a');                       // wall
  for (let y = 0; y < 400; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < 960; x += 40) c.rect(x, y, 20, 20, '#40344f'); // wallpaper
  c.rect(0, 400, 960, 140, '#6b4a2b');                     // floor
  for (let y = 400; y < 540; y += 20) c.rect(0, y, 960, 2, '#5a3a1a');
  for (let x = 0; x < 960; x += 80) c.rect(x, 400, 2, 140, '#5a3a1a');
  c.rect(0, 396, 960, 6, '#2b2b2b');                       // skirting
  c.rect(740, 60, 140, 110, '#1b1b2f'); c.rect(748, 68, 124, 94, '#0f2a4a'); // window
  c.rect(806, 68, 6, 94, '#1b1b2f'); c.rect(748, 112, 124, 6, '#1b1b2f');
  c.rect(820, 76, 12, 12, '#ffd166'); c.rect(760, 80, 30, 8, '#26436a');   // moon & cloud
  c.rect(640, 80, 90, 70, '#8b5a2b'); c.rect(648, 88, 74, 54, '#2f5d3a'); // painting
  c.rect(656, 118, 58, 18, '#3d7a4a'); c.rect(690, 96, 12, 12, '#ffd166');
  c.save('room.png');
}

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
