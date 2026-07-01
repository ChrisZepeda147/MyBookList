import type { GoogleVolume } from "@/lib/google-books-client";

export const MISSING_DESCRIPTION_FALLBACK =
  "No description available for this edition. Add your own notes or summary in the edit panel!";

export function cleanDescription(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;

  let text = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\r\n/g, "\n")
    .trim();

  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text.length > 0 ? text : null;
}

/** Always returns display-ready description text (never blank). */
export function ensureBookDescription(
  raw: string | null | undefined,
): string {
  return cleanDescription(raw) ?? MISSING_DESCRIPTION_FALLBACK;
}

export function isPlaceholderDescription(
  description: string | null | undefined,
): boolean {
  if (!description?.trim()) return true;
  return description.trim() === MISSING_DESCRIPTION_FALLBACK;
}

export function hasRealDescription(
  description: string | null | undefined,
): boolean {
  return Boolean(cleanDescription(description)) && !isPlaceholderDescription(description);
}

export function descriptionFromVolume(
  volume: GoogleVolume | null | undefined,
): string | null {
  return cleanDescription(volume?.volumeInfo?.description);
}

export function bestDescriptionFromVolumes(
  volumes: GoogleVolume[],
): string | null {
  let best: string | null = null;
  for (const volume of volumes) {
    const desc = descriptionFromVolume(volume);
    if (desc && (!best || desc.length > best.length)) {
      best = desc;
    }
  }
  return best;
}

export function bestDescriptionFromTexts(
  descriptions: Array<string | null | undefined>,
): string | null {
  let best: string | null = null;
  for (const raw of descriptions) {
    const desc = cleanDescription(raw);
    if (desc && (!best || desc.length > best.length)) {
      best = desc;
    }
  }
  return best;
}

export function hasDescriptionText(
  description: string | null | undefined,
): boolean {
  return hasRealDescription(description);
}
