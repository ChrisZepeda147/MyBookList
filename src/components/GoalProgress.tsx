"use client";

import { Target } from "lucide-react";

interface GoalProgressProps {
  title: string;
  current: number;
  goal: number;
  unit: string;
  progress: number;
}

export function GoalProgress({
  title,
  current,
  goal,
  unit,
  progress,
}: GoalProgressProps) {
  const pct = Math.round(progress);
  const remaining = Math.max(0, goal - current);
  const reached = current >= goal && goal > 0;

  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-amber-50/50 p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-lg bg-blue-100 p-1.5">
          <Target className="h-4 w-4 text-blue-600" />
        </span>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-blue-700">
        {current.toLocaleString()}
        <span className="ml-1.5 text-lg font-medium text-slate-500">
          of {goal.toLocaleString()} {unit}
        </span>
      </p>

      <p className="mt-1 text-sm text-slate-600">
        {reached
          ? "You hit this goal — nice work!"
          : `${remaining.toLocaleString()} ${unit} left · ${pct}% of your goal`}
      </p>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-blue-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            reached
              ? "bg-gradient-to-r from-amber-400 to-amber-500"
              : "bg-gradient-to-r from-blue-500 to-blue-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
