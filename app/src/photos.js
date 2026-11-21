// The Sundown crew: seven original portraits made with an image model for
// this entry, plus one wide Vice City scene. Every portrait carries its face
// box, measured from the generated image as fractions of the photo, so the
// renderer can crop face-aware: the face is centred in its panel and never
// covered by the title band. `face` is { x, y, w, h } in 0..1 photo space;
// the scene has no face, so it is cover-fit instead.
export const CREW = [
  { id: 'driver', role: 'THE DRIVER', file: 'driver.jpg', face: { x: 0.28, y: 0.19, w: 0.45, h: 0.34 } },
  { id: 'boss', role: 'THE BOSS', file: 'boss.jpg', face: { x: 0.25, y: 0.15, w: 0.52, h: 0.40 } },
  { id: 'mechanic', role: 'THE MECHANIC', file: 'mechanic.jpg', face: { x: 0.25, y: 0.17, w: 0.42, h: 0.30 } },
  { id: 'captain', role: 'THE CAPTAIN', file: 'captain.jpg', face: { x: 0.20, y: 0.18, w: 0.60, h: 0.34 } },
  { id: 'rider', role: 'THE RIDER', file: 'rider.jpg', face: { x: 0.27, y: 0.16, w: 0.46, h: 0.29 } },
  { id: 'lookout', role: 'THE LOOKOUT', file: 'lookout.jpg', face: { x: 0.27, y: 0.18, w: 0.46, h: 0.29 } },
  { id: 'wheelman', role: 'THE WHEELMAN', file: 'wheelman.jpg', face: { x: 0.22, y: 0.20, w: 0.54, h: 0.35 } },
];

/** The wide sunset scene, usable in any panel (cover-fit, no face). */
export const SCENE = { id: 'scene', role: 'OCEAN DRIVE', file: 'scene.jpg', face: null };

/** All eight sample photos, in the order the studio's sample picker lists them. */
export const SAMPLES = [...CREW, SCENE];
