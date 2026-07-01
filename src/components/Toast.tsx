"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  message: string;
  onDismiss?: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 200);
    }, 3000);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-medium text-emerald-800 shadow-lg shadow-emerald-100/80 ring-1 ring-emerald-100">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        {message}
      </div>
    </div>
  );
}
