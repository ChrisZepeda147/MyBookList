interface AccountLoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md";
  label?: string;
}

export function AccountLoadingSpinner({
  className,
  size = "md",
  label = "Loading",
}: AccountLoadingSpinnerProps) {
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <div
      className={className ?? "flex min-h-[70vh] items-center justify-center"}
    >
      <div
        className={`${sizeClass} animate-spin rounded-full border-4 border-blue-600 border-t-transparent`}
        role="status"
        aria-label={label}
      />
    </div>
  );
}
