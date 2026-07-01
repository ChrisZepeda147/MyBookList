/** Rich leather and cloth tones for book spines. */
const SPINE_COLORS = [
  "#5c2e1a",
  "#3d4a5c",
  "#4a3728",
  "#2d4a3e",
  "#5c3d2e",
  "#4a2c4a",
  "#2e3d5c",
  "#6b3a2a",
  "#3a4a3a",
  "#4a3040",
  "#7a3b2e",
  "#2c4a5e",
  "#5a4a2a",
  "#3e2a4a",
  "#1e4d40",
] as const;

const SPINE_WIDTH_MIN = 28;
const SPINE_WIDTH_MAX = 45;

/** Edge darkening + leather curve on spines. */
export const SPINE_EDGE_GRADIENT =
  "linear-gradient(90deg, rgba(0,0,0,0.38) 0%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0.04) 82%, rgba(0,0,0,0.45) 100%)";

/** @deprecated Use SPINE_EDGE_GRADIENT + CSS ::before highlight */
export const SPINE_SHADING_GRADIENT = SPINE_EDGE_GRADIENT;

function hashFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash + value.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return hash;
}

export function spineColorForBook(id: string): string {
  return SPINE_COLORS[hashFromString(id) % SPINE_COLORS.length]!;
}

/** Pseudo-random spine width (28–45px) from title length + book id. */
export function spineWidthForBook(id: string, title: string): number {
  const hash = hashFromString(`${id}:${title.length}`);
  const titleFactor = Math.min(title.length, 48) / 48;
  const randomFactor = (hash % 100) / 100;
  const blend = titleFactor * 0.55 + randomFactor * 0.45;
  return Math.round(SPINE_WIDTH_MIN + blend * (SPINE_WIDTH_MAX - SPINE_WIDTH_MIN));
}

/** Natural lean between -1deg and 1deg, stable per book. */
export function spineLeanForBook(id: string): number {
  const hash = hashFromString(`${id}:lean`);
  const normalized = (hash % 200) / 100;
  return Math.round((normalized - 1) * 10) / 10;
}

/** Slight height variation (9rem–10rem) for extra natural variety. */
export function spineHeightForBook(id: string): number {
  const hash = hashFromString(`${id}:height`);
  const rem = 9 + (hash % 5) * 0.25;
  return Math.round(rem * 100) / 100;
}
