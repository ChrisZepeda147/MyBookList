const STORAGE_KEY = "mybooklist_ignored_recommendations_v1";
const MAX_STORED = 500;

export function readIgnoredRecommendationIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function addIgnoredRecommendationId(id: string): string[] {
  if (!id || typeof window === "undefined") {
    return readIgnoredRecommendationIds();
  }

  const existing = readIgnoredRecommendationIds();
  if (existing.includes(id)) return existing;

  const next = [...existing, id].slice(-MAX_STORED);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors.
  }
  return next;
}
