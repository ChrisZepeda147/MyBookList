import { resolveBookCategoryTags } from "@/lib/categories";

const TYPE_COLORS: Record<string, string> = {
  Fiction: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
  "Non-Fiction": "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
};

const GENRE_PALETTE = [
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-fuchsia-100 text-fuchsia-700",
];

interface CategoryBadgesProps {
  categories: string[];
  apiCategories?: string[];
  description?: string | null;
  title?: string | null;
  subtitle?: string | null;
  author?: string | null;
  compact?: boolean;
}

export function CategoryBadges({
  categories,
  apiCategories,
  description,
  title,
  subtitle,
  author,
  compact = false,
}: CategoryBadgesProps) {
  const labels = resolveBookCategoryTags(
    apiCategories,
    categories,
    description,
    title,
    author,
    subtitle,
  );

  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {labels.map((label, i) => {
        const isType = label === "Fiction" || label === "Non-Fiction";
        const colorClass = isType
          ? (TYPE_COLORS[label] ?? GENRE_PALETTE[0])
          : GENRE_PALETTE[(i - 1) % GENRE_PALETTE.length];

        return (
          <span
            key={`${label}-${i}`}
            className={`rounded-full font-medium ${compact ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"} ${colorClass}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
