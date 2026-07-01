"use client";

import { useState } from "react";
import { Pencil, Timer, Trash2, X, Check } from "lucide-react";
import type { ReadingSessionLogEntry } from "@/lib/types";
import { useReadingSessionLog } from "@/hooks/useReadingSessionLog";
import {
  deleteReadingSessionLog,
  updateReadingSessionLogPages,
} from "@/lib/reading-session-log";
import { useAuth } from "@/providers/AuthProvider";

function formatSessionDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes.toFixed(minutes % 1 === 0 ? 0 : 1)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const VISIBLE_ROWS_BEFORE_SCROLL = 6;

export function ReadingSessionHistory() {
  const { user } = useAuth();
  const { sessions, reload } = useReadingSessionLog();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEndPage, setEditEndPage] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function startEdit(session: ReadingSessionLogEntry) {
    setEditingId(session.id);
    setEditEndPage(String(session.endPage));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditEndPage("");
    setEditError(null);
  }

  function saveEdit(session: ReadingSessionLogEntry) {
    if (!user?.id) return;

    const parsed = parseInt(editEndPage, 10);
    if (!Number.isFinite(parsed) || parsed < session.startPage) {
      setEditError(`End page must be at least ${session.startPage}.`);
      return;
    }

    const updated = updateReadingSessionLogPages(user.id, session.id, parsed);
    if (!updated) {
      setEditError("Could not update this session.");
      return;
    }

    cancelEdit();
    reload();
  }

  function handleDelete(session: ReadingSessionLogEntry) {
    if (!user?.id) return;

    const confirmed = window.confirm(
      `Delete this reading session for "${session.bookTitle}"?`,
    );
    if (!confirmed) return;

    if (editingId === session.id) cancelEdit();
    deleteReadingSessionLog(user.id, session.id);
    reload();
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Timer className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-slate-900">
          Reading Sessions
        </h2>
      </div>

      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Finish a timed session or log pages manually from a book&apos;s detail
          page to track your reading history and streak.
        </p>
      ) : (
        <div
          className={`mt-4 overflow-x-auto ${
            sessions.length > VISIBLE_ROWS_BEFORE_SCROLL
              ? "max-h-[min(28rem,70vh)] overflow-y-auto rounded-xl border border-slate-100"
              : ""
          }`}
        >
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4 font-semibold">Date</th>
                <th className="pb-2 pr-4 font-semibold">Book</th>
                <th className="pb-2 pr-4 text-right font-semibold">Minutes</th>
                <th className="pb-2 pr-4 text-right font-semibold">Pages</th>
                <th className="pb-2 pr-4 text-right font-semibold">Pages/hr</th>
                <th className="pb-2 text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sessions.map((session) => {
                const isEditing = editingId === session.id;

                return (
                  <tr key={session.id} className="text-slate-700">
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-500">
                      {formatSessionDate(session.date)}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-800">
                        {session.bookTitle}
                      </p>
                      <p className="text-xs text-slate-500">
                        {session.bookAuthor}
                        {session.pagesRead > 0 && !isEditing && (
                          <span className="text-slate-400">
                            {" "}
                            · p. {session.startPage}→{session.endPage}
                          </span>
                        )}
                      </p>
                      {isEditing && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label className="text-xs text-slate-500">
                            Start{" "}
                            <span className="font-medium text-slate-700">
                              {session.startPage}
                            </span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            End
                            <input
                              type="number"
                              min={session.startPage}
                              value={editEndPage}
                              onChange={(e) => {
                                setEditEndPage(e.target.value);
                                setEditError(null);
                              }}
                              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </label>
                          {editError && (
                            <p className="w-full text-xs text-red-600">
                              {editError}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {session.secondsRead > 0
                        ? formatMinutes(session.minutesRead)
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {session.pagesRead}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums text-emerald-700">
                      {session.pagesPerHour > 0
                        ? session.pagesPerHour.toFixed(1)
                        : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(session)}
                              className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50"
                              aria-label="Save page edit"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              aria-label="Cancel edit"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(session)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                              aria-label="Edit pages read"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(session)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete session"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
