interface SitePageHeaderProps {
  title: string;
  subtitle: string;
  titleRewardClassName?: string | null;
}

export function SitePageHeader({
  title,
  subtitle,
  titleRewardClassName = null,
}: SitePageHeaderProps) {
  return (
    <header className="space-y-3">
      <h1
        className={`font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${
          titleRewardClassName ?? "text-blue-800"
        }`}
      >
        {title}
      </h1>
      <p className="max-w-2xl border-l-4 border-amber-300/90 pl-4 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
        {subtitle}
      </p>
    </header>
  );
}
