/** Strip legacy base64/blob URLs — only persist public HTTP(S) avatar links. */
export function normalizeAvatarUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "";
}

export function isPersistableAvatarUrl(url: string): boolean {
  return normalizeAvatarUrl(url).length > 0;
}

/** URL safe for <Image src> — http(s) or temporary blob preview while uploading. */
export function resolveAvatarDisplaySrc(
  url: string | null | undefined,
  previewBlobUrl?: string | null,
): string | null {
  if (previewBlobUrl) return previewBlobUrl;
  const normalized = normalizeAvatarUrl(url);
  return normalized || null;
}
