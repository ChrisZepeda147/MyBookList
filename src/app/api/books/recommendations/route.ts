import { NextRequest, NextResponse } from "next/server";
import {
  getRecommendations,
  getRecommendationsFromTopRated,
} from "@/lib/recommendations";
import type { BookEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  let books: BookEntry[] = [];
  let mode: "top-rated" | "full" = "top-rated";

  try {
    const body = (await request.json()) as {
      books?: BookEntry[];
      mode?: "top-rated" | "full";
    };
    books = Array.isArray(body.books) ? body.books : [];
    if (body.mode === "full") mode = "full";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result =
      mode === "full"
        ? await getRecommendations(books)
        : await getRecommendationsFromTopRated(books);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/books/recommendations]", err);
    return NextResponse.json(
      { error: "Failed to load recommendations" },
      { status: 500 },
    );
  }
}
