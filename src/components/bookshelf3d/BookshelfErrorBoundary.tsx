"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches Three.js texture / WebGL failures so the rest of the app keeps working. */
export class BookshelfErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Bookshelf 3D view error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 bg-[#2a1f18] p-6 text-center">
          <p className="text-sm font-medium text-amber-100">Could not load the 3D bookshelf</p>
          <p className="max-w-sm text-xs text-amber-100/70">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
