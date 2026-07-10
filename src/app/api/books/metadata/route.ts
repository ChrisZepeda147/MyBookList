import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleBookMetadata } from "@/lib/google-books";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title") ?? "";
  const author = request.nextUrl.searchParams.get("author") ?? "";
  const googleBooksId = request.nextUrl.searchParams.get("id");
  const isbn = request.nextUrl.searchParams.get("isbn");
  const lite = request.nextUrl.searchParams.get("lite") === "1";

  if (!title.trim() && !googleBooksId && !isbn) {
    return NextResponse.json(
      { error: "title, id, or isbn is required" },
      { status: 400 },
    );
  }

  try {
    const metadata = await fetchGoogleBookMetadata({
      title,
      author,
      googleBooksId,
      isbn,
      lite,
    });

    if (!metadata) {
      return NextResponse.json(
        { error: "No metadata found" },
        { status: 404 },
      );
    }

    return NextResponse.json(metadata);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch book metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
