interface StreakShieldBadgeProps {
  count: number;
  className?: string;
  variant?: "dark" | "light";
}

export function StreakShieldBadge({
  count,
  className = "",
  variant = "dark",
}: StreakShieldBadgeProps) {
  if (count <= 0) return null;

  const colorClass =
    variant === "light" ? "text-sky-600" : "text-sky-300";

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-semibold ${colorClass} ${className}`}
      title={`${count} Streak Shield${count === 1 ? "" : "s"} saved`}
      aria-label={`${count} streak shields`}
    >
      <span aria-hidden>🛡️</span>
      <span>x{count}</span>
    </span>
  );
}
