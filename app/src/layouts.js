// The five panel arrangements. Every layout is seven full-height vertical
// strips in the classic GTA cover shape: the hero strip rises into the
// sunset band, the other six start below it, faces sit in the upper part of
// each strip (see sundown.js for the face anchor), and the chrome title band
// crosses the strips' lower half, over chests — never over a face.
// A strip is { x, y, w, h, hero }; the poster is 1920 x 1080, strips run
// x 28..1892 with 12 px gutters and all bottoms at y 920 (tagline 932+).
export const POSTER_W = 1920;
export const POSTER_H = 1080;

/** Lays a row of strips out left to right, centred in x 28..1892. */
function row(widths, tops, heroIndex) {
  const gutter = 12;
  const total = widths.reduce((a, b) => a + b, 0) + gutter * (widths.length - 1);
  let x = 28 + (1864 - total) / 2;
  return widths.map((w, i) => {
    const rect = { x: Math.round(x), y: tops[i], w, h: 920 - tops[i], hero: i === heroIndex };
    x += w + gutter;
    return rect;
  });
}

const NARROW = 232;
const HERO_W = 400;

/** The five layouts, in the order the studio lists them. */
export const LAYOUTS = {
  sundown: {
    label: 'Sundown',
    panels: row([NARROW, NARROW, NARROW, HERO_W, NARROW, NARROW, NARROW], [240, 240, 240, 84, 240, 240, 240], 3),
    slant: 0.055, heroSlant: -0.055, sunSide: 'left', sealSide: 'right',
  },
  coast: {
    label: 'Coast Left',
    panels: row([HERO_W, NARROW, NARROW, NARROW, NARROW, NARROW, NARROW], [84, 240, 240, 240, 240, 240, 240], 0),
    slant: 0.055, heroSlant: -0.055, sunSide: 'right', sealSide: 'right',
  },
  strip: {
    label: 'Strip Right',
    panels: row([NARROW, NARROW, NARROW, NARROW, NARROW, NARROW, HERO_W], [240, 240, 240, 240, 240, 240, 84], 6),
    slant: 0.055, heroSlant: -0.055, sunSide: 'right', sealSide: 'left',
  },
  skyline: {
    label: 'Skyline Wide',
    panels: row([205, 205, 205, 560, 205, 205, 205], [240, 240, 240, 84, 240, 240, 240], 3),
    slant: 0.09, heroSlant: -0.09, sunSide: 'left', sealSide: 'right',
  },
  palms: {
    label: 'Palms Arc',
    panels: row([256, 256, 256, 256, 256, 256, 256], [240, 180, 120, 84, 120, 180, 240], 3),
    slant: 0.045, heroSlant: -0.045, sunSide: 'left', sealSide: 'right',
  },
};

/** The layout ids in the order the studio lists them. */
export const LAYOUT_IDS = ['sundown', 'coast', 'strip', 'skyline', 'palms'];

/**
 * The crew member a strip shows: the hero strip always shows the first crew
 * member (the driver), and the other strips show the rest in strip order.
 * The panel list, the photos array and the crew list are all in crew order,
 * so the renderer maps strip -> crew here and the studio maps clicks back.
 */
export function crewIndexForStrip(layout, stripIndex) {
  const heroStrip = layout.panels.findIndex((p) => p.hero);
  if (stripIndex === heroStrip) return 0;
  if (stripIndex < heroStrip) return stripIndex + 1;
  return stripIndex;
}

/** The strip a crew member shows on, the inverse of crewIndexForStrip. */
export function stripIndexForCrew(layout, crewIndex) {
  const heroStrip = layout.panels.findIndex((p) => p.hero);
  if (crewIndex === 0) return heroStrip;
  if (crewIndex <= heroStrip) return crewIndex - 1;
  return crewIndex;
}

/**
 * The slanted parallelogram for a strip: the top edge shifts one way and the
 * bottom edge the other, by slant * height, so the strips lean like the GTA
 * covers. The hero leans the other way, so it pops against the rest.
 */
export function panelPoly(rect, slant, dir) {
  const s = slant * rect.h * dir;
  return [
    [rect.x + s, rect.y],
    [rect.x + rect.w + s, rect.y],
    [rect.x + rect.w - s, rect.y + rect.h],
    [rect.x - s, rect.y + rect.h],
  ];
}

/** True when the point is inside the polygon (ray casting). */
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
