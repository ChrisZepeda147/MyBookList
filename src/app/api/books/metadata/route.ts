import { NextRequest, NextResponse } from "next/server";
import {
  fetchGoogleBookMetadata,
  fetchGoogleBookMetadataByVolumeId,
} from "@/lib/google-books";
import {
  ensureBookDescription,
  hasRealDescription,
} from "@/lib/book-descriptions";
import { logGoogleBooksServerFetchFailure } from "@/lib/google-books-errors";
import {
  fetchOpenLibraryDescription,
  fetchOpenLibraryDescriptionByWorkKey,
} from "@/lib/open-library";
import { categoriesFromApi } from "@/lib/categories";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title") ?? "";
  const author = request.nextUrl.searchParams.get("author") ?? "";
  const googleBooksId = request.nextUrl.searchParams.get("id");
  const isbn = request.nextUrl.searchParams.get("isbn");
  const workKey = request.nextUrl.searchParams.get("workKey");
  const lite = request.nextUrl.searchParams.get("lite") === "1";
  const logLabel = title.trim() || googleBooksId || workKey || isbn || "unknown";

  if (!title.trim() && !googleBooksId && !isbn && !workKey) {
    return NextResponse.json(
      { error: "title, id, workKey, or isbn is required" },
      { status: 400 },
    );
  }

  try {
    if (workKey) {
      const byWork = await fetchOpenLibraryDescriptionByWorkKey(workKey);
      if (byWork) {
        const description = ensureBookDescription(byWork);
        return NextResponse.json({
          pageCount: null,
          description,
          coverUrl: null,
          googleBooksId: googleBooksId ?? null,
          apiCategories: [],
          categories: categoriesFromApi([], description, title, author),
          isbn13: null,
          isbn10: null,
        });
      }
    }

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

    if (metadata && hasRealDescription(metadata.description)) {
      return NextResponse.json(metadata);
    }

    if (title.trim()) {
      const openLibraryDescription = await fetchOpenLibraryDescription(
        title,
        author,
      );
      if (openLibraryDescription) {
        const description = ensureBookDescription(openLibraryDescription);
        return NextResponse.json({
          pageCount: metadata?.pageCount ?? null,
          description,
          coverUrl: metadata?.coverUrl ?? null,
          googleBooksId: metadata?.googleBooksId ?? googleBooksId ?? null,
          apiCategories: metadata?.apiCategories ?? [],
          categories:
            metadata?.categories ??
            categoriesFromApi([], description, title, author),
          isbn13: metadata?.isbn13 ?? null,
          isbn10: metadata?.isbn10 ?? null,
        });
      }
    }

    if (!metadata) {
      logGoogleBooksServerFetchFailure(logLabel, "No metadata found (404)");
      return NextResponse.json(
        { error: "No metadata found" },
        { status: 404 },
      );
    }

    return NextResponse.json(metadata);
  } catch (err) {
    logGoogleBooksServerFetchFailure(logLabel, err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch book metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
