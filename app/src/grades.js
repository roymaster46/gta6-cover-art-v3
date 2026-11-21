// The colour grades: each one tints every panel photo with a warm wash and
// a small saturation lift, and paints its own sunset sky, so the seven
// portraits feel shot on the same evening. A grade is a canvas filter plus
// top/bottom overlay colours for the photos, and a sky palette the renderer
// paints behind the panels: skyTop/skyMid/skyBot for the sky gradient,
// sunCore/sunRim for the striped sun, and haze for the horizon glow.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.18) contrast(1.06)',
    top: 'rgba(255, 122, 61, 0.10)',
    bottom: 'rgba(190, 30, 110, 0.30)',
    sky: { top: '#2a0a4a', mid: '#c73e7a', bot: '#ff8a3d', sunCore: '#ffe9a8', sunRim: '#ff5e3a', haze: 'rgba(255, 138, 61, 0.55)' },
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.32) contrast(1.08)',
    top: 'rgba(160, 40, 200, 0.20)',
    bottom: 'rgba(255, 40, 140, 0.22)',
    sky: { top: '#12063a', mid: '#7a1fa2', bot: '#ff2e88', sunCore: '#ffd7ea', sunRim: '#ff2e88', haze: 'rgba(255, 46, 136, 0.50)' },
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.12) contrast(1.04)',
    top: 'rgba(255, 178, 44, 0.14)',
    bottom: 'rgba(255, 96, 20, 0.18)',
    sky: { top: '#3a1c10', mid: '#d97a1f', bot: '#ffc93c', sunCore: '#fffbe8', sunRim: '#ff9a1f', haze: 'rgba(255, 201, 60, 0.55)' },
  },
  dusk: {
    label: 'Dusk Blue',
    filter: 'saturate(1.05) contrast(1.05)',
    top: 'rgba(30, 60, 140, 0.20)',
    bottom: 'rgba(120, 40, 160, 0.20)',
    sky: { top: '#060d2e', mid: '#27408f', bot: '#e86a92', sunCore: '#ffe9c9', sunRim: '#ff7a5c', haze: 'rgba(232, 106, 146, 0.45)' },
  },
  palm: {
    label: 'Palm Teal',
    filter: 'saturate(1.22) contrast(1.05)',
    top: 'rgba(20, 160, 150, 0.16)',
    bottom: 'rgba(255, 110, 60, 0.24)',
    sky: { top: '#062a2e', mid: '#0f7a6e', bot: '#ff9a3d', sunCore: '#fff3c4', sunRim: '#ff7a2f', haze: 'rgba(255, 154, 61, 0.50)' },
  },
  rose: {
    label: 'Rose Fade',
    filter: 'saturate(1.26) contrast(1.06)',
    top: 'rgba(255, 90, 160, 0.18)',
    bottom: 'rgba(140, 20, 90, 0.26)',
    sky: { top: '#2e0a2e', mid: '#a81e6e', bot: '#ff7ab8', sunCore: '#ffe3f0', sunRim: '#ff4d9d', haze: 'rgba(255, 122, 184, 0.50)' },
  },
};

/** The grade ids in the order the studio lists them. */
export const GRADE_IDS = ['sunset', 'neon', 'golden', 'dusk', 'palm', 'rose'];
