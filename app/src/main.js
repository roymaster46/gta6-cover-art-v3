// Vice Cover Studio v3 — Sundown: wires the poster studio. The sample crew
// loads on open, each strip takes the user's own photo with its own crop, and
// the poster exports as a PNG in 1920 x 1080, 1080 x 1080 or 1080 x 1350.
// A `?shot=` query sets up a fixed scene for a screenshot instead.
import { CREW, SAMPLES, SCENE } from './photos.js';
import { GRADE_IDS, GRADES } from './grades.js';
import { LAYOUTS, LAYOUT_IDS, POSTER_H, POSTER_W, crewIndexForStrip } from './layouts.js';
import { hitPanel, renderExport, renderPoster } from './sundown.js';
import { runShot } from './shots.js';

/** The three export sizes, in the order the studio lists them. */
const EXPORT_SIZES = [
  { id: '1920x1080', label: '1920 × 1080 · landscape', w: 1920, h: 1080 },
  { id: '1080x1080', label: '1080 × 1080 · square', w: 1080, h: 1080 },
  { id: '1080x1350', label: '1080 × 1350 · portrait', w: 1080, h: 1350 },
];

const canvas = document.getElementById('poster');
const status = document.getElementById('status');
const panelList = document.getElementById('panel-list');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('pan-x');
const panYInput = document.getElementById('pan-y');
const faceCheck = document.getElementById('face-check');

const state = {
  title: 'SUNDOWN',
  subtitle: 'Kings of the Coast',
  tagline: 'SEVEN LIVES · ONE SUNSET · NO WAY BACK',
  quote: 'A FEVER DREAM IN NEON',
  layout: 'sundown',
  grade: 'sunset',
  size: '1920x1080',
  effects: { grain: 0.6, vignette: 0.6, leak: 0.5, slant: 1 },
  crew: CREW,
  photos: CREW.map(() => null),
  selected: 0,
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Paints the live preview from the current state, then reports face safety. */
function redraw() {
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const report = renderPoster(canvas.getContext('2d'), state);
  if (report.faceSafe) {
    faceCheck.textContent = 'Face check: clear — no lettering covers a face.';
    faceCheck.className = 'face-ok';
  } else {
    const names = [...new Set(report.covered.map((c) => CREW[c.panel].role))].join(', ');
    faceCheck.textContent = `Face check: lettering covers ${names} — move the title or crop.`;
    faceCheck.className = 'face-bad';
  }
  window.__faceSafe = report.faceSafe;
  window.__lastReport = report;
}

/** The selected panel's photo record, or null when it holds no photo yet. */
function selectedPhoto() {
  return state.photos[state.selected];
}

/** Refreshes the panel list and the selected panel's crop controls. */
function refreshPanelUI() {
  panelList.querySelectorAll('button').forEach((button, i) => {
    button.classList.toggle('selected', i === state.selected);
    button.classList.toggle('empty', state.photos[i] === null);
  });
  const photo = selectedPhoto();
  zoomInput.value = photo ? photo.zoom : 1;
  panXInput.value = photo ? photo.ox : 0;
  panYInput.value = photo ? photo.oy : 0;
  document.getElementById('selected-role').textContent = CREW[state.selected].role;
  document.getElementById('flip').classList.toggle('active', Boolean(photo?.flip));
}

/** Picks a panel to edit, then repaints with it highlighted. */
function selectPanel(i) {
  state.selected = i;
  refreshPanelUI();
  redraw();
}

/** Loads the seven generated portraits as the sample crew. */
async function loadSampleCrew() {
  const loaded = await Promise.all(
    CREW.map(async (member) => {
      try {
        const img = await loadImage(`samples/${member.file}`);
        return { img, zoom: 1, ox: 0, oy: 0, flip: false };
      } catch {
        return null;
      }
    }),
  );
  state.photos = loaded;
  redraw();
}

/** Builds the studio's control buttons: grades, layouts, sizes, panels. */
function buildControls() {
  const gradeBox = document.getElementById('grades');
  GRADE_IDS.forEach((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = GRADES[id].label;
    button.className = 'chip';
    button.addEventListener('click', () => {
      state.grade = id;
      gradeBox.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === button));
      redraw();
    });
    if (id === state.grade) button.classList.add('active');
    gradeBox.appendChild(button);
  });

  const layoutBox = document.getElementById('layouts');
  LAYOUT_IDS.forEach((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = LAYOUTS[id].label;
    button.className = 'chip';
    button.addEventListener('click', () => {
      state.layout = id;
      layoutBox.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === button));
      redraw();
    });
    if (id === state.layout) button.classList.add('active');
    layoutBox.appendChild(button);
  });

  const sizeBox = document.getElementById('sizes');
  EXPORT_SIZES.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = size.label;
    button.className = 'chip';
    button.addEventListener('click', () => {
      state.size = size.id;
      sizeBox.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === button));
    });
    if (size.id === state.size) button.classList.add('active');
    sizeBox.appendChild(button);
  });

  CREW.forEach((member, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-row';
    button.innerHTML = `<span class="panel-num">${i + 1}</span><span>${member.role}</span><span class="panel-place">${member.file.replace('.jpg', '')}</span>`;
    button.addEventListener('click', () => selectPanel(i));
    panelList.appendChild(button);
  });
}

/** Binds the text fields, the photo inputs, the crop and effect sliders. */
function bindInputs() {
  const bindText = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      redraw();
    });
  };
  bindText('title', 'title');
  bindText('subtitle', 'subtitle');
  bindText('tagline', 'tagline');
  bindText('quote', 'quote');

  const bindEffect = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state.effects[key] = Number(e.target.value) / 100;
      redraw();
    });
  };
  bindEffect('fx-grain', 'grain');
  bindEffect('fx-vignette', 'vignette');
  bindEffect('fx-leak', 'leak');
  bindEffect('fx-slant', 'slant');

  document.getElementById('panel-photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = await loadImage(URL.createObjectURL(file));
    state.photos[state.selected] = { img, zoom: 1, ox: 0, oy: 0, flip: false };
    state.crew = state.crew.map((m, i) => (i === state.selected ? { ...m, face: null } : m));
    refreshPanelUI();
    redraw();
    status.textContent = `${CREW[state.selected].role} photo updated — nothing leaves your device.`;
    e.target.value = '';
  });

  document.getElementById('fill-all').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = await loadImage(URL.createObjectURL(file));
    state.photos = CREW.map(() => ({ img, zoom: 1, ox: 0, oy: 0, flip: false }));
    state.crew = CREW.map((m) => ({ ...m, face: null }));
    refreshPanelUI();
    redraw();
    status.textContent = 'One photo now fills all seven strips.';
    e.target.value = '';
  });

  document.getElementById('sample-crew').addEventListener('click', async () => {
    state.crew = CREW;
    await loadSampleCrew();
    refreshPanelUI();
    status.textContent = 'Sample crew loaded — swap any strip with your own photo.';
  });

  document.getElementById('load-scene').addEventListener('click', async () => {
    const img = await loadImage(`samples/${SCENE.file}`);
    state.photos[state.selected] = { img, zoom: 1, ox: 0, oy: 0, flip: false };
    state.crew = state.crew.map((m, i) => (i === state.selected ? { ...m, face: null } : m));
    refreshPanelUI();
    redraw();
    status.textContent = `Sunset scene loaded into ${CREW[state.selected].role}.`;
  });

  zoomInput.addEventListener('input', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.zoom = Number(zoomInput.value);
    redraw();
  });
  panXInput.addEventListener('input', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.ox = Number(panXInput.value);
    redraw();
  });
  panYInput.addEventListener('input', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.oy = Number(panYInput.value);
    redraw();
  });
  document.getElementById('flip').addEventListener('click', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.flip = !photo.flip;
    refreshPanelUI();
    redraw();
  });
  document.getElementById('reset-crop').addEventListener('click', () => {
    const photo = selectedPhoto();
    if (!photo) return;
    photo.zoom = 1;
    photo.ox = 0;
    photo.oy = 0;
    photo.flip = false;
    refreshPanelUI();
    redraw();
  });

  document.getElementById('export').addEventListener('click', () => {
    const size = EXPORT_SIZES.find((s) => s.id === state.size) ?? EXPORT_SIZES[0];
    const out = document.createElement('canvas');
    out.width = size.w;
    out.height = size.h;
    renderExport(out, state);
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sundown-cover-${size.w}x${size.h}.png`;
      a.click();
      status.textContent = `Saved sundown-cover-${size.w}x${size.h}.png`;
    }, 'image/png');
  });

  // Clicking the preview picks the strip under the pointer, then the crew
  // member that strip shows (the hero strip shows the first crew member).
  canvas.addEventListener('click', (e) => {
    const box = canvas.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * POSTER_W;
    const y = ((e.clientY - box.top) / box.height) * POSTER_H;
    const hit = hitPanel(state.layout, x, y, state.effects.slant);
    if (hit >= 0) selectPanel(crewIndexForStrip(LAYOUTS[state.layout], hit));
  });
}

/** The sample photo ids, for the studio's sample picker note. */
void SAMPLES;

buildControls();
bindInputs();
refreshPanelUI();

const shot = new URLSearchParams(location.search).get('shot');
async function start() {
  // The chrome title and neon script need their real fonts before the first
  // paint, or the canvas falls back to a system font for that frame.
  try {
    await Promise.all([
      document.fonts.load('240px Anton'),
      document.fonts.load('64px Yellowtail'),
      document.fonts.ready,
    ]);
  } catch { /* fonts fall back to the system stack */ }
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), async ({ layout, grade, size, title }) => {
      state.layout = layout;
      state.grade = grade;
      state.size = size;
      if (title) {
        state.title = title;
        document.getElementById('title').value = title;
      }
      await loadSampleCrew();
      refreshPanelUI();
      if (size !== '1920x1080') {
        const dims = size.split('x').map(Number);
        const out = document.createElement('canvas');
        out.width = dims[0];
        out.height = dims[1];
        renderExport(out, state);
        canvas.width = dims[0];
        canvas.height = dims[1];
        canvas.getContext('2d').drawImage(out, 0, 0);
      }
    });
  } else {
    await loadSampleCrew();
    refreshPanelUI();
  }
}
start();
