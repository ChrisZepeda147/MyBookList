import { NextRequest, NextResponse } from "next/server";
import {
  descriptionForStorage,
  hasRealDescription,
  isPlaceholderDescription,
} from "@/lib/book-descriptions";
import { fetchGoogleBookMetadata } from "@/lib/google-books";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Temporary one-shot repair for friend accounts that lost descriptions
 * during yesterday's Google Books 429 lockout.
 *
 * POST /api/admin/repair-books
 * Optional header: x-admin-repair-secret (required if ADMIN_REPAIR_SECRET is set)
 */

const REPAIR_TARGETS: Array<{
  email: string;
  titles: string[];
}> = [
  {
    email: "gkbonilla@gmail.com",
    titles: [
      "Badasses",
      "You Are a Badass",
      "The Subtle Art of Not Giving a Fck",
      "The Subtle Art of Not Giving a F*ck",
      "The Four Agreements",
      "Can't Hurt Me",
    ],
  },
  {
    email: "embliss@icloud.com",
    titles: ["Dire Bound", "Fury Bound"],
  },
];

type BookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string;
  description: string | null;
  google_books_id: string | null;
};

type RepairResult = {
  email: string;
  bookId: string;
  title: string;
  author: string;
  status: "updated" | "skipped" | "not_found" | "failed";
  reason?: string;
  descriptionPreview?: string;
};

function titlesMatch(a: string, b: string): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[*']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return normalize(a) === normalize(b) || normalize(a).includes(normalize(b)) || normalize(b).includes(normalize(a));
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_REPAIR_SECRET;
  if (!secret) {
    // Allow in local/dev when no secret is configured.
    return process.env.NODE_ENV !== "production";
  }
  return request.headers.get("x-admin-repair-secret") === secret;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local to run this repair route.",
      },
      { status: 500 },
    );
  }

  const results: RepairResult[] = [];

  for (const target of REPAIR_TARGETS) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", target.email)
      .maybeSingle();

    if (profileError || !profile) {
      for (const title of target.titles) {
        results.push({
          email: target.email,
          bookId: "",
          title,
          author: "",
          status: "not_found",
          reason: profileError?.message ?? "Profile not found for email",
        });
      }
      continue;
    }

    const { data: books, error: booksError } = await supabase
      .from("user_books")
      .select("id, user_id, title, author, description, google_books_id")
      .eq("user_id", profile.id);

    if (booksError || !books) {
      for (const title of target.titles) {
        results.push({
          email: target.email,
          bookId: "",
          title,
          author: "",
          status: "failed",
          reason: booksError?.message ?? "Failed to load user books",
        });
      }
      continue;
    }

    const claimed = new Set<string>();

    for (const wantedTitle of target.titles) {
      const match = (books as BookRow[]).find(
        (book) =>
          !claimed.has(book.id) && titlesMatch(book.title, wantedTitle),
      );

      if (!match) {
        // Skip duplicate title aliases that map to the same book.
        if (
          wantedTitle.includes("Subtle Art") &&
          results.some(
            (r) =>
              r.email === target.email &&
              r.title.toLowerCase().includes("subtle art") &&
              r.status !== "not_found",
          )
        ) {
          continue;
        }

        results.push({
          email: target.email,
          bookId: "",
          title: wantedTitle,
          author: "",
          status: "not_found",
          reason: "No matching book row for this title",
        });
        continue;
      }

      claimed.add(match.id);

      if (
        hasRealDescription(match.description) &&
        !isPlaceholderDescription(match.description)
      ) {
        results.push({
          email: target.email,
          bookId: match.id,
          title: match.title,
          author: match.author,
          status: "skipped",
          reason: "Already has a real description",
          descriptionPreview: match.description?.slice(0, 120) ?? undefined,
        });
        continue;
      }

      try {
        const metadata = await fetchGoogleBookMetadata({
          title: match.title,
          author: match.author,
          googleBooksId: match.google_books_id,
        });

        const description = descriptionForStorage(metadata?.description);
        if (!description) {
          results.push({
            email: target.email,
            bookId: match.id,
            title: match.title,
            author: match.author,
            status: "failed",
            reason: "Google/Open Library returned no usable description",
          });
          continue;
        }

        const patch: {
          description: string;
          google_books_id?: string;
        } = { description };

        if (!match.google_books_id && metadata?.googleBooksId) {
          patch.google_books_id = metadata.googleBooksId;
        }

        const { error: updateError } = await supabase
          .from("user_books")
          .update(patch)
          .eq("id", match.id)
          .eq("user_id", profile.id);

        if (updateError) {
          results.push({
            email: target.email,
            bookId: match.id,
            title: match.title,
            author: match.author,
            status: "failed",
            reason: updateError.message,
          });
          continue;
        }

        results.push({
          email: target.email,
          bookId: match.id,
          title: match.title,
          author: match.author,
          status: "updated",
          descriptionPreview: description.slice(0, 160),
        });

        // Gentle pacing so we don't trip Google again.
        await sleep(350);
      } catch (err) {
        results.push({
          email: target.email,
          bookId: match.id,
          title: match.title,
          author: match.author,
          status: "failed",
          reason: err instanceof Error ? err.message : "Unknown fetch error",
        });
      }
    }
  }

  const summary = {
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    notFound: results.filter((r) => r.status === "not_found").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  return NextResponse.json({
    ok: summary.failed === 0 && summary.notFound === 0,
    summary,
    results,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
