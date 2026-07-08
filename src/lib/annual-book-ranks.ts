export interface AnnualBookRank {
  id: string;
  minBooks: number;
  /** Inclusive upper bound; `null` means no upper limit. */
  maxBooks: number | null;
  unlockLabel: string;
  title: string;
  description: string;
}

export const ANNUAL_BOOK_RANKS: AnnualBookRank[] = [
  {
    id: "literary-casual",
    minBooks: 0,
    maxBooks: 2,
    unlockLabel: "0–2 books",
    title: "Literary Casual",
    description: "A few great reads this year — quality over quantity.",
  },
  {
    id: "certified-bookworm",
    minBooks: 3,
    maxBooks: 7,
    unlockLabel: "3–7 books",
    title: "Certified Bookworm",
    description: "You're building a steady reading habit.",
  },
  {
    id: "page-turner-pro",
    minBooks: 8,
    maxBooks: 15,
    unlockLabel: "8–15 books",
    title: "Page-Turner Professional",
    description: "Books are a regular part of your routine.",
  },
  {
    id: "absolute-scholar",
    minBooks: 16,
    maxBooks: 30,
    unlockLabel: "16–30 books",
    title: "Absolute Scholar",
    description: "An impressive stack of finished titles this year.",
  },
  {
    id: "knows-everything",
    minBooks: 36,
    maxBooks: null,
    unlockLabel: "36+ books",
    title: "Knows Everything, Avoid At All Costs",
    description: "Legendary output. Proceed with caution at parties.",
  },
];

function isCountInRankRange(count: number, rank: AnnualBookRank): boolean {
  if (count < rank.minBooks) return false;
  if (rank.maxBooks === null) return true;
  return count <= rank.maxBooks;
}

/** Highest annual title earned for books completed in the current calendar year. */
export function getActiveAnnualBookRank(
  completedThisYear: number,
): AnnualBookRank {
  const matched = [...ANNUAL_BOOK_RANKS]
    .reverse()
    .find((rank) => isCountInRankRange(completedThisYear, rank));

  if (matched) return matched;

  // 31–35 books sits between Scholar (16–30) and Oracle (36+); keep Scholar active.
  if (completedThisYear >= 31 && completedThisYear <= 35) {
    return ANNUAL_BOOK_RANKS.find((rank) => rank.id === "absolute-scholar")!;
  }

  return ANNUAL_BOOK_RANKS[0]!;
}

export function isAnnualBookRankUnlocked(
  rank: AnnualBookRank,
  completedThisYear: number,
): boolean {
  return completedThisYear >= rank.minBooks;
}

export function isActiveAnnualBookRank(
  rank: AnnualBookRank,
  completedThisYear: number,
): boolean {
  return getActiveAnnualBookRank(completedThisYear).id === rank.id;
}
