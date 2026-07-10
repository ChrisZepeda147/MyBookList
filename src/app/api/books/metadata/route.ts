import { NextRequest, NextResponse } from "next/server";
import {
  fetchGoogleBookMetadata,
  fetchGoogleBookMetadataByVolumeId,
} from "@/lib/google-books";
import { hasRealDescription } from "@/lib/book-descriptions";

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
    if (googleBooksId) {
      const byVolume = await fetchGoogleBookMetadataByVolumeId(googleBooksId);
      if (byVolume && hasRealDescription(byVolume.description)) {
        return NextResponse.json(byVolume);
      }
    }

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
