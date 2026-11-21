// Fixed scenes for screenshots: ?shot=cover shows the exported poster alone,
// ?shot=editor shows the studio with the sample crew loaded, ?shot=wide the
// Skyline Wide layout, ?shot=square the square export. `layout`, `grade`
// and `size` pick the scene's options; `title` overrides the chrome title.
// window.__shotReady is set once the poster has been painted.
export async function runShot(shot, query, setup) {
  const layout = query.get('layout') ?? 'sundown';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1920x1080';
  const title = query.get('title') ?? null;
  if (shot === 'cover' || shot === 'wide' || shot === 'square') document.body.classList.add('shot-cover');
  await setup({ layout, grade, size, title, shot });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // The title carries the live face-safety verdict for headless verification.
  document.title = `shot-ready faceSafe=${window.__faceSafe === true}`;
  window.__shotReady = true;
}
