"use client";

import { useEffect, useRef, useState } from "react";

const LIST_DESCRIPTION_MAX_LINES = 5;

interface ListBookDescriptionProps {
  description: string;
  loading?: boolean;
}

export function ListBookDescription({
  description,
  loading = false,
}: ListBookDescriptionProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [description]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;

    const measure = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [description, expanded]);

  const showToggle = overflows || expanded;

  if (loading) {
    return (
      <p className="text-sm italic text-slate-400">Looking up description…</p>
    );
  }

  return (
    <div className="min-w-0">
      <p
        ref={textRef}
        className={`book-description-text text-sm leading-relaxed text-slate-500 ${
          expanded ? "" : "line-clamp-5"
        }`}
      >
        {description}
      </p>
      {showToggle ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          className="mt-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export { LIST_DESCRIPTION_MAX_LINES };
