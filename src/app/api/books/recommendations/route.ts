import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/recommendations";
import { isGoogleBooksRateLimitError } from "@/lib/google-books-errors";
import type { BookEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  let books: BookEntry[] = [];

  try {
    const body = (await request.json()) as { books?: BookEntry[] };
    books = Array.isArray(body.books) ? body.books : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await getRecommendations(books);
    return NextResponse.json(result);
  } catch (err) {
    if (isGoogleBooksRateLimitError(err)) {
      return NextResponse.json(
        { error: "Google Books rate limited", books: [] },
        { status: 429 },
      );
    }

    console.error("[api/books/recommendations]", err);
    return NextResponse.json(
      { error: "Failed to load recommendations" },
      { status: 500 },
    );
  }
}
