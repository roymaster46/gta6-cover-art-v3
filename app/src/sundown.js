// Sundown — the Vice Cover Studio v3 poster renderer. A 1920 x 1080 movie
// poster, painted in code: a striped sunset sky with a skyline and palm
// silhouettes behind seven slanted portrait strips, a whole-poster grade
// (warm wash, seeded film grain, light leaks, vignette, halftone), a chrome
// Anton title on a dark scrim below every chin, and a neon Yellowtail script.
// Faces are never covered: each sample photo carries a measured face box
// (photos.js) and the crop puts the face centre at a fixed anchor height in
// its strip, so the face chin always lands above the title band —
// chin = (0.20 + anchor) * strip height (see faceCropSource), 0.50 * 680 =
// 340 px from a side strip's top (y 580) against the title's top edge
// (baseline 868 - size 240 = 628); the tallest face box (the boss, 0.40 of
// his photo) leaves no shift headroom, so its chin lands at y 614 — still
// 14 px clear of the title. Name tags ride at the strip tops, above
// every face. renderPoster returns a report the studio uses for a face
// safety check: no lettering rect may overlap a face rect.
import { GRADES } from './grades.js';
import { LAYOUTS, POSTER_H, POSTER_W, crewIndexForStrip, panelPoly, pointInPoly } from './layouts.js';

/** Face height as a fraction of its strip's height after cropping. */
const FACE_FRAC = 0.4;
/** Face-centre anchor down its strip: hero 0.32, the rest 0.30. */
const ANCHOR = { hero: 0.32, side: 0.3 };
/** The chrome title: size, baseline, and the scrim band behind it. */
const TITLE_SIZE = 240;
const TITLE_BASELINE = 868;
const SUBTITLE_SIZE = 60;
const SUBTITLE_BASELINE = 902;
const SCRIM_TOP = 570;

/** A tiny seeded PRNG (mulberry32) so the skyline, palms and grain are stable. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** A five-pointed star path centred at (cx, cy). */
function starPath(ctx, cx, cy, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function tracePoly(ctx, poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** The striped retro sun, painted on its own canvas so the stripes cut cleanly. */
function stripedSun(size, r, palette) {
  const off = document.createElement('canvas');
  off.width = off.height = size;
  const o = off.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const g = o.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, palette.sunCore);
  g.addColorStop(0.55, palette.sunRim);
  g.addColorStop(1, palette.sunRim);
  o.fillStyle = g;
  o.beginPath();
  o.arc(cx, cy, r, 0, Math.PI * 2);
  o.fill();
  // Horizontal gaps, widening toward the bottom of the disc.
  o.globalCompositeOperation = 'destination-out';
  let y = cy + r * 0.05;
  let gap = 3;
  while (y < cy + r) {
    o.fillRect(0, y, size, gap);
    y += gap + r * 0.16;
    gap += 3;
  }
  o.globalCompositeOperation = 'source-over';
  return off;
}

/** A city skyline silhouette along `baseY`, with a few lit windows. */
function drawSkyline(ctx, baseY, color, seed) {
  const rand = rng(seed);
  ctx.fillStyle = color;
  let x = -10;
  while (x < POSTER_W + 10) {
    const w = 34 + rand() * 78;
    const h = 34 + rand() * 108;
    ctx.fillRect(x, baseY - h, w, h);
    if (rand() > 0.55) ctx.fillRect(x + w * 0.2, baseY - h - 16, w * 0.22, 16);
    if (rand() > 0.7) {
      ctx.fillStyle = 'rgba(255, 214, 140, 0.75)';
      for (let k = 0; k < 5; k++) {
        if (rand() > 0.5) ctx.fillRect(x + 6 + rand() * (w - 14), baseY - h + 8 + rand() * (h - 18), 5, 7);
      }
      ctx.fillStyle = color;
    }
    x += w + 4 + rand() * 14;
  }
}

/** A palm silhouette: a leaning trunk and seven drooping fronds. */
function drawPalm(ctx, x, baseY, h, lean, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(5, h * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * h * 0.4, baseY - h * 0.55, x + lean * h, baseY - h);
  ctx.stroke();
  const tx = x + lean * h;
  const ty = baseY - h;
  ctx.lineWidth = Math.max(3, h * 0.028);
  for (let i = 0; i < 7; i++) {
    const a = (-0.15 - i * 0.24) * Math.PI;
    const len = h * (0.42 - Math.abs(i - 3) * 0.035);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.35 - len * 0.22,
      tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.55 + len * 0.3,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** The painted sunset backdrop: sky gradient, striped sun, skyline, palms. */
function drawBackdrop(ctx, grade, layout) {
  const sky = grade.sky;
  const g = ctx.createLinearGradient(0, 0, 0, 940);
  g.addColorStop(0, sky.top);
  g.addColorStop(0.42, sky.mid);
  g.addColorStop(0.62, sky.bot);
  g.addColorStop(0.78, '#1c0a24');
  g.addColorStop(1, '#12061a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  // Horizon glow behind the skyline.
  const haze = ctx.createRadialGradient(960, 240, 40, 960, 240, 900);
  haze.addColorStop(0, sky.haze);
  haze.addColorStop(1, 'rgba(255, 138, 61, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, POSTER_W, 560);
  // The sun, rising behind the strips on the layout's sun side.
  const sunX = layout.sunSide === 'left' ? 300 : 1620;
  const sun = stripedSun(300, 118, sky);
  ctx.drawImage(sun, sunX - 150, 205 - 150);
  // Sun rays fanning out behind the panels.
  ctx.save();
  ctx.translate(sunX, 205);
  ctx.strokeStyle = 'rgba(255, 214, 140, 0.16)';
  ctx.lineWidth = 10;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.08 + i * 0.105);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 130, Math.sin(a) * 130);
    ctx.lineTo(Math.cos(a) * 420, Math.sin(a) * 420);
    ctx.stroke();
  }
  ctx.restore();
  drawSkyline(ctx, 242, 'rgba(16, 4, 28, 0.92)', 90211);
  drawPalm(ctx, 66, 244, 190, -0.16, 'rgba(12, 3, 22, 0.95)');
  drawPalm(ctx, 1854, 244, 168, 0.13, 'rgba(12, 3, 22, 0.95)');
  drawPalm(ctx, layout.sunSide === 'left' ? 1730 : 190, 244, 120, layout.sunSide === 'left' ? 0.1 : -0.1, 'rgba(12, 3, 22, 0.85)');
}

/**
 * The source rectangle of `img` to draw into a panel: centred on the face
 * centre horizontally, and shifted so the face centre lands at the anchor
 * height, with the face `FACE_FRAC` of the panel tall. Zoom shrinks the
 * window around its centre; pan slides it. A null face means cover-fit.
 */
export function faceCropSource(img, face, pw, ph, zoom, ox, oy, hero) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!face) {
    const scale = Math.max(pw / iw, ph / ih);
    const sw = pw / scale;
    const sh = ph / scale;
    return { sx: clamp((iw - sw) / 2 + ox * sw, 0, iw - sw), sy: clamp((ih - sh) / 2 + oy * sh, 0, ih - sh), sw, sh };
  }
  let sh = (face.h * ih) / FACE_FRAC;
  let sw = sh * (pw / ph);
  if (sw > iw) {
    sw = iw;
    sh = sw * (ph / pw);
  }
  if (sh > ih) {
    sh = ih;
    sw = sh * (pw / ph);
  }
  sw /= zoom;
  sh /= zoom;
  sw = Math.min(sw, iw);
  sh = Math.min(sh, ih);
  const fcx = (face.x + face.w / 2) * iw;
  const fcy = (face.y + face.h / 2) * ih;
  const anchor = hero ? ANCHOR.hero : ANCHOR.side;
  return {
    sx: clamp(fcx - sw / 2 + ox * sw, 0, iw - sw),
    sy: clamp(fcy - anchor * sh + oy * sh, 0, ih - sh),
    sw,
    sh,
  };
}

/** Draws one portrait strip: soft shadow, face-aware photo, grade wash. */
function drawPanel(ctx, member, photo, rect, poly, grade) {
  // Soft drop shadow on the sunset ground.
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#160a20';
  tracePoly(ctx, poly);
  ctx.fill();
  ctx.restore();
  // Photo, clipped to the slanted strip.
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  if (photo?.img) {
    const src = faceCropSource(photo.img, member.face, rect.w, rect.h, photo.zoom, photo.ox, photo.oy, rect.hero);
    ctx.save();
    ctx.filter = grade.filter;
    if (photo.flip) {
      ctx.translate(rect.x + rect.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(rect.x + rect.w / 2), 0);
    }
    ctx.drawImage(photo.img, src.sx, src.sy, src.sw, src.sh, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    wash.addColorStop(0, grade.top);
    wash.addColorStop(1, grade.bottom);
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.fillStyle = '#3a1c4d';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  // Inner edge light at the head, shade at the foot for depth.
  const edge = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  edge.addColorStop(0, 'rgba(255, 240, 220, 0.12)');
  edge.addColorStop(0.2, 'rgba(255, 240, 220, 0)');
  edge.addColorStop(0.75, 'rgba(10, 0, 20, 0)');
  edge.addColorStop(1, 'rgba(10, 0, 20, 0.34)');
  ctx.fillStyle = edge;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // Gold rim keyline + warm-white hairline, drawn after the grade stays crisp.
  ctx.save();
  tracePoly(ctx, poly);
  ctx.strokeStyle = '#f5b301';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'miter';
  ctx.stroke();
  tracePoly(ctx, poly);
  ctx.strokeStyle = 'rgba(255, 233, 168, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** The press-quote top bar: five gold stars, a quote, VOL and WANTED badges. */
function drawTopBar(ctx, state) {
  ctx.fillStyle = '#160a20';
  ctx.fillRect(0, 0, POSTER_W, 72);
  ctx.fillStyle = '#ffc93c';
  for (let i = 0; i < 5; i++) {
    starPath(ctx, 62 + i * 52, 38, 19, 8);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic 700 30px Georgia, serif';
  ctx.fillStyle = '#ffe9a8';
  const quote = `“${state.quote}”`;
  const quoteW = ctx.measureText(quote).width;
  ctx.font = '700 22px Arial, sans-serif';
  const herald = '— THE COAST HERALD';
  const heraldW = ctx.measureText(herald).width;
  const groupCx = 960 - (heraldW + 24) / 2;
  ctx.font = 'italic 700 30px Georgia, serif';
  ctx.fillText(quote, groupCx, 34);
  ctx.font = '700 22px Arial, sans-serif';
  ctx.fillStyle = '#c9a86a';
  ctx.textAlign = 'left';
  ctx.fillText(herald, groupCx + quoteW / 2 + 24, 36);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(1648, 16, 108, 40);
  ctx.fillStyle = '#160a20';
  ctx.font = '800 24px Arial, sans-serif';
  ctx.fillText('VOL. 03', 1662, 44);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(1772, 16, 132, 40);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('★ WANTED ★', 1784, 44);
}

/**
 * The chrome title, drawn on its own canvas so horizontal sun stripes can
 * be cut into the letters, then stamped on at the title baseline.
 */
function drawChromeTitle(ctx, text, baseline, size) {
  const off = document.createElement('canvas');
  off.width = POSTER_W;
  off.height = 420;
  const o = off.getContext('2d');
  o.textAlign = 'center';
  o.textBaseline = 'alphabetic';
  let s = size;
  o.font = `${s}px Anton, "Arial Black", Arial, sans-serif`;
  try {
    o.letterSpacing = '6px';
  } catch { /* older canvas: no tracking */ }
  while (o.measureText(text).width > 1560 && s > 60) {
    s -= 6;
    o.font = `${s}px Anton, "Arial Black", Arial, sans-serif`;
  }
  const y = 300;
  o.lineJoin = 'round';
  o.shadowColor = '#ff2e88';
  o.shadowBlur = 34;
  o.shadowOffsetY = 10;
  o.strokeStyle = '#2a0a2e';
  o.lineWidth = s * 0.085;
  o.strokeText(text, POSTER_W / 2, y);
  o.shadowBlur = 0;
  o.shadowOffsetY = 0;
  const chrome = o.createLinearGradient(0, y - s, 0, y + s * 0.12);
  chrome.addColorStop(0, '#fffbe8');
  chrome.addColorStop(0.32, '#ffd34d');
  chrome.addColorStop(0.55, '#ff7a2f');
  chrome.addColorStop(0.78, '#ff2e88');
  chrome.addColorStop(1, '#a81aff');
  o.fillStyle = chrome;
  o.fillText(text, POSTER_W / 2, y);
  o.globalCompositeOperation = 'source-atop';
  for (let sy = y - s * 0.28; sy < y + s * 0.1; sy += 26) {
    o.fillStyle = 'rgba(42, 10, 46, 0.28)';
    o.fillRect(0, sy, POSTER_W, 8);
  }
  const sheen = o.createLinearGradient(0, y - s, 0, y - s * 0.55);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  o.fillStyle = sheen;
  o.fillRect(0, y - s, POSTER_W, s * 0.55);
  o.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, 0, baseline - 300);
  const w = o.measureText(text).width;
  return { x: POSTER_W / 2 - w / 2, y: baseline - s, w, h: s, size: s };
}

/** The pink neon script subtitle under the chrome title. */
function drawScriptSubtitle(ctx, text, cx, y) {
  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(-0.022);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${SUBTITLE_SIZE}px Yellowtail, Georgia, serif`;
  ctx.shadowColor = '#ff5fa2';
  ctx.shadowBlur = 26;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#4d0a33';
  ctx.lineWidth = 9;
  ctx.strokeText(text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff7fb8';
  ctx.fillText(text, 0, 0);
  ctx.fillStyle = '#ffd7ea';
  ctx.font = `${SUBTITLE_SIZE - 4}px Yellowtail, Georgia, serif`;
  ctx.fillText(text, 0, -3);
  ctx.restore();
  ctx.font = `${SUBTITLE_SIZE}px Yellowtail, Georgia, serif`;
  const w = ctx.measureText(text).width;
  return { x: cx - w / 2, y: y - SUBTITLE_SIZE / 2, w, h: SUBTITLE_SIZE };
}

/** The orange tagline ribbon between the panels and the billing block. */
function drawTaglineStrip(ctx, text) {
  const band = ctx.createLinearGradient(0, 932, 0, 992);
  band.addColorStop(0, '#ff8a2a');
  band.addColorStop(0.5, '#ff5e3a');
  band.addColorStop(1, '#e83e8c');
  ctx.fillStyle = band;
  ctx.fillRect(0, 932, POSTER_W, 60);
  ctx.fillStyle = '#1c0716';
  ctx.fillRect(0, 932, POSTER_W, 4);
  ctx.fillRect(0, 988, POSTER_W, 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 30px Arial, sans-serif';
  try {
    ctx.letterSpacing = '6px';
  } catch { /* older canvas */ }
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillText(text.toUpperCase(), 960, 963);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  try {
    ctx.letterSpacing = '0px';
  } catch { /* older canvas */ }
}

/** A gold starburst seal with the original-art claim. */
function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.beginPath();
  for (let i = 0; i < 48; i++) {
    const rad = i % 2 === 0 ? r : r * 0.86;
    const a = (i * Math.PI) / 24;
    const x = rad * Math.cos(a);
    const y = rad * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#f5b301';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#7a5200';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#7a5200';
  ctx.stroke();
  // The lettering is sized to the seal: the two lines must fit inside the
  // inner circle (diameter 2 * r * 0.66), or the words spill past the edge.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a2400';
  ctx.font = `800 ${Math.round(r * 0.22)}px Arial, sans-serif`;
  ctx.fillText('ORIGINAL', 0, -r * 0.32);
  ctx.fillText('COVER ART', 0, r * 0.06);
  ctx.font = `800 ${Math.round(r * 0.24)}px Arial, sans-serif`;
  ctx.fillText('★★★', 0, r * 0.42);
  ctx.restore();
  return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
}

/** A small barcode with its number, drawn from a fixed seed. */
function drawBarcode(ctx, x, y, w, h) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 8, y - 8, w + 16, h + 30);
  let seed = 90211060217;
  let bx = x;
  ctx.fillStyle = '#111111';
  while (bx < x + w) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const bw = 2 + (seed % 5);
    if (seed % 3 !== 0) ctx.fillRect(bx, y, bw, h);
    bx += bw + 2 + (seed % 3);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '400 17px Arial, sans-serif';
  ctx.fillText('8 90211 060217', x + w / 2, y + h + 2);
}

/** The billing block: credits on the left, COMING SOON and barcode right. */
function drawBilling(ctx) {
  ctx.fillStyle = '#12061a';
  ctx.fillRect(0, 992, POSTER_W, 88);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f5e6c8';
  ctx.font = '800 24px Arial, sans-serif';
  ctx.fillText('A SUNDOWN PICTURE', 28, 1022);
  ctx.fillStyle = '#b9a684';
  ctx.font = '400 19px Arial, sans-serif';
  ctx.fillText('STARRING YOUR CREW  ·  SHOT ON YOUR OWN CAMERA  ·  GRADED AT SUNSET', 28, 1048);
  ctx.fillText('VICE CITY  ·  OCEAN DRIVE  ·  PALMLINE STUDIOS  ·  ALL CHARACTERS ORIGINAL', 28, 1070);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffc93c';
  ctx.font = '800 34px Arial, sans-serif';
  ctx.fillText('COMING SOON', 1610, 1046);
  drawBarcode(ctx, 1660, 1010, 200, 44);
}

/** One panel's role tag: black chip with a gold leading bar, at the strip top. */
function drawNameTag(ctx, text, rect) {
  const pad = 14;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 26px Arial, sans-serif';
  const tw = ctx.measureText(text).width;
  const tagW = Math.min(tw + 34, rect.w - 20);
  const tagH = 40;
  const tagX = rect.x + pad;
  const tagY = rect.y + pad;
  ctx.fillStyle = 'rgba(8, 3, 14, 0.92)';
  ctx.fillRect(tagX, tagY, tagW, tagH);
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(tagX, tagY, 7, tagH);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, tagX + 18, tagY + 29, tagW - 28);
  ctx.restore();
  return { x: tagX, y: tagY, w: tagW, h: tagH };
}

/** Seeded film grain, tiled over the poster. */
let grainTile = null;
function grainCanvas() {
  if (grainTile) return grainTile;
  const rand = rng(90211);
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.floor(rand() * 40);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** Seeded halftone dots, tiled over the poster at a whisper. */
let halftoneTile = null;
function halftoneCanvas() {
  if (halftoneTile) return halftoneTile;
  const c = document.createElement('canvas');
  c.width = c.height = 9;
  const g = c.getContext('2d');
  g.fillStyle = '#000000';
  g.beginPath();
  g.arc(4.5, 4.5, 1.4, 0, Math.PI * 2);
  g.fill();
  halftoneTile = c;
  return c;
}

/**
 * The whole-poster grade: a warm golden wash, seeded film grain, light
 * leaks, a vignette and a halftone whisper, all over the painted poster and
 * under the lettering so the type stays crisp.
 */
function applyGrade(ctx, grade, fx) {
  const wash = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  wash.addColorStop(0, 'rgba(255, 178, 60, 0.07)');
  wash.addColorStop(0.6, 'rgba(255, 122, 61, 0.05)');
  wash.addColorStop(1, 'rgba(190, 30, 110, 0.10)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  if (fx.grain > 0) {
    ctx.save();
    ctx.globalAlpha = 0.04 + 0.1 * fx.grain;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat');
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);
    ctx.restore();
  }
  if (fx.leak > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    let leak = ctx.createRadialGradient(POSTER_W * 0.92, 60, 20, POSTER_W * 0.92, 60, 620);
    leak.addColorStop(0, `rgba(255, 180, 80, ${0.3 * fx.leak})`);
    leak.addColorStop(1, 'rgba(255, 180, 80, 0)');
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);
    leak = ctx.createRadialGradient(60, POSTER_H, 20, 60, POSTER_H, 560);
    leak.addColorStop(0, `rgba(255, 46, 136, ${0.22 * fx.leak})`);
    leak.addColorStop(1, 'rgba(255, 46, 136, 0)');
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = ctx.createPattern(halftoneCanvas(), 'repeat');
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  ctx.restore();
  if (fx.vignette > 0) {
    const v = ctx.createRadialGradient(960, 540, 420, 960, 540, 1250);
    v.addColorStop(0, 'rgba(5, 0, 12, 0)');
    v.addColorStop(1, `rgba(5, 0, 12, ${0.55 * fx.vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  }
}

/** The dark scrim the title band sits on, so the chrome reads over any photo. */
function drawTitleScrim(ctx) {
  const g = ctx.createLinearGradient(0, SCRIM_TOP, 0, 920);
  g.addColorStop(0, 'rgba(8, 2, 16, 0)');
  g.addColorStop(0.25, 'rgba(8, 2, 16, 0.55)');
  g.addColorStop(0.6, 'rgba(8, 2, 16, 0.78)');
  g.addColorStop(1, 'rgba(8, 2, 16, 0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(0, SCRIM_TOP, POSTER_W, 920 - SCRIM_TOP);
}

function rectsOverlap(a, b, pad = 0) {
  return a && b && a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

/**
 * Renders the whole poster onto `ctx` at the poster's native size.
 * `state` holds the title, subtitle, tagline, quote, layout, grade, effects
 * { grain, vignette, leak, slant } and a `photos` array (CREW order) of
 * { img, zoom, ox, oy, flip } or null. Returns a report with every panel's
 * face rect and tag rect plus the lettering rects, and a face-safety verdict.
 */
export function renderPoster(ctx, state) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.sundown;
  const fx = {
    grain: state.effects?.grain ?? 0.6,
    vignette: state.effects?.vignette ?? 0.6,
    leak: state.effects?.leak ?? 0.5,
    slant: state.effects?.slant ?? 1,
  };
  const slantScale = fx.slant;
  ctx.save();
  ctx.clearRect(0, 0, POSTER_W, POSTER_H);
  drawBackdrop(ctx, grade, layout);
  const report = { layout: state.layout, grade: state.grade, panels: [], textRects: [] };
  layout.panels.forEach((rect, i) => {
    // The hero strip shows the first crew member; the rest follow in strip order.
    const crewIndex = crewIndexForStrip(layout, i);
    const member = state.crew[crewIndex];
    const photo = state.photos[crewIndex] ?? null;
    const dir = rect.hero ? -1 : 1;
    const slant = (rect.hero ? layout.heroSlant : layout.slant) * slantScale;
    const poly = panelPoly(rect, Math.abs(slant), dir * Math.sign(slant || 1));
    drawPanel(ctx, member, photo, rect, poly, grade);
    let faceAbs = null;
    if (photo?.img && member.face) {
      const src = faceCropSource(photo.img, member.face, rect.w, rect.h, photo.zoom, photo.ox, photo.oy, rect.hero);
      const f = member.face;
      const fx0 = rect.x + ((f.x * photo.img.naturalWidth - src.sx) / src.sw) * rect.w;
      const fy0 = rect.y + ((f.y * photo.img.naturalHeight - src.sy) / src.sh) * rect.h;
      const fw = (f.w * photo.img.naturalWidth / src.sw) * rect.w;
      const fh = (f.h * photo.img.naturalHeight / src.sh) * rect.h;
      faceAbs = { x: fx0, y: fy0, w: fw, h: fh };
    }
    report.panels.push({ strip: i, crew: crewIndex, rect, poly, hero: rect.hero, face: faceAbs });
  });
  applyGrade(ctx, grade, fx);
  drawTopBar(ctx, state);
  drawTaglineStrip(ctx, state.tagline);
  drawBilling(ctx);
  const sealCx = layout.sealSide === 'left' ? 120 : 1800;
  const sealRect = drawSeal(ctx, sealCx, 156, 78);
  report.textRects.push({ kind: 'seal', ...sealRect });
  drawTitleScrim(ctx);
  const title = state.title.trim().toUpperCase() || 'SUNDOWN';
  const titleRect = drawChromeTitle(ctx, title, TITLE_BASELINE, TITLE_SIZE);
  report.textRects.push({ kind: 'title', ...titleRect });
  const subtitleRect = drawScriptSubtitle(ctx, state.subtitle.trim() || 'Kings of the Coast', POSTER_W / 2, SUBTITLE_BASELINE);
  report.textRects.push({ kind: 'subtitle', ...subtitleRect });
  report.panels.forEach((panel) => {
    const tagRect = drawNameTag(ctx, state.crew[panel.crew].role, panel.rect);
    panel.tag = tagRect;
    report.textRects.push({ kind: 'tag', panel: panel.crew, ...tagRect });
  });
  // Face safety: no lettering over any face.
  report.faceSafe = true;
  report.covered = [];
  for (const p of report.panels) {
    if (!p.face) continue;
    for (const r of report.textRects) {
      if (rectsOverlap(r, p.face, -2)) {
        report.faceSafe = false;
        report.covered.push({ panel: p.crew, by: r.kind });
      }
    }
  }
  ctx.restore();
  return report;
}

/**
 * Renders the poster, then places it on `canvas` at the canvas's own size.
 * A landscape export takes the poster whole. A square or portrait export
 * keeps the whole poster too: it sits fitted on a blurred, darkened crop of
 * itself, so the title is never cut off at the sides the way a plain crop
 * would cut it.
 */
export function renderExport(canvas, state) {
  const poster = document.createElement('canvas');
  poster.width = POSTER_W;
  poster.height = POSTER_H;
  renderPoster(poster.getContext('2d'), state);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#160a20';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (canvas.width === POSTER_W && canvas.height === POSTER_H) {
    ctx.drawImage(poster, 0, 0);
    return;
  }
  const coverScale = Math.max(canvas.width / POSTER_W, canvas.height / POSTER_H);
  const dw = POSTER_W * coverScale;
  const dh = POSTER_H * coverScale;
  ctx.save();
  ctx.filter = 'blur(28px) brightness(0.5) saturate(1.2)';
  ctx.drawImage(poster, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  ctx.restore();
  const fitScale = Math.min(canvas.width / POSTER_W, canvas.height / POSTER_H);
  const fw = POSTER_W * fitScale;
  const fh = POSTER_H * fitScale;
  ctx.drawImage(poster, (canvas.width - fw) / 2, (canvas.height - fh) / 2, fw, fh);
}

/** Hit-tests a poster point against the strips, topmost strip first. */
export function hitPanel(layoutId, x, y, slantScale = 1) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.sundown;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const rect = layout.panels[i];
    const dir = rect.hero ? -1 : 1;
    const slant = (rect.hero ? layout.heroSlant : layout.slant) * slantScale;
    const poly = panelPoly(rect, Math.abs(slant), dir * Math.sign(slant || 1));
    if (pointInPoly(x, y, poly)) return i;
  }
  return -1;
}
