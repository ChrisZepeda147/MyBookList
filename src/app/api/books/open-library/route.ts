import { NextRequest, NextResponse } from "next/server";
import { searchOpenLibraryBooks } from "@/lib/open-library-search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchOpenLibraryBooks(query);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[api/books/open-library]", err);
    return NextResponse.json(
      { error: "Failed to search Open Library" },
      { status: 500 },
    );
  }
}
