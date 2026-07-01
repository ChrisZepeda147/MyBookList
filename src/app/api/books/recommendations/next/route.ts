import { NextRequest, NextResponse } from "next/server";
import { fetchNextRecommendation } from "@/lib/recommendations";
import { isGoogleBooksRateLimitError } from "@/lib/google-books-errors";
import { bookHasDisplayableCover } from "@/lib/cover-url";
import type { BookEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  let books: BookEntry[] = [];
  let ignoredIds: string[] = [];
  let excludeIds: string[] = [];

  try {
    const body = (await request.json()) as {
      books?: BookEntry[];
      ignoredIds?: string[];
      excludeIds?: string[];
    };
    books = Array.isArray(body.books) ? body.books : [];
    ignoredIds = Array.isArray(body.ignoredIds) ? body.ignoredIds : [];
    excludeIds = Array.isArray(body.excludeIds) ? body.excludeIds : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const book = await fetchNextRecommendation(books, { ignoredIds, excludeIds });

    if (!book || !bookHasDisplayableCover(book, "list")) {
      return NextResponse.json({ book: null });
    }

    return NextResponse.json({ book });
  } catch (err) {
    if (isGoogleBooksRateLimitError(err)) {
      return NextResponse.json(
        { error: "Google Books rate limited", book: null },
        { status: 429 },
      );
    }

    console.error("[api/books/recommendations/next]", err);
    return NextResponse.json(
      { error: "Failed to load replacement recommendation" },
      { status: 500 },
    );
  }
}
