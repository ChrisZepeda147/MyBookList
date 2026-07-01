import { NextRequest, NextResponse } from "next/server";
import { searchGoogleBooks } from "@/lib/google-books";
import { GoogleBooksApiError } from "@/lib/google-books-errors";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchGoogleBooks(query);
    return NextResponse.json(results);
  } catch (err) {
    if (err instanceof GoogleBooksApiError && err.rateLimited) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 429 });
    }

    return NextResponse.json(
      { error: "Failed to search books" },
      { status: 500 },
    );
  }
}
