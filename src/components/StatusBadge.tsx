import type { ReadingStatus } from "@/lib/types";
import { statusLabel } from "@/lib/types";

const styles: Record<ReadingStatus, string> = {
  reading: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-orange-100 text-orange-700",
  dnf: "bg-red-100 text-red-700",
  plan_to_read: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: ReadingStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
