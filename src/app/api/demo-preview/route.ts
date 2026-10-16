import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { loadDemoPreviewPayload } from "@/lib/demo-preview-data";

/** Revalidate the route data every hour on the CDN. */
export const revalidate = 3600;

const getCachedDemoPreview = unstable_cache(
  async () => loadDemoPreviewPayload(),
  ["demo-preview-payload"],
  { revalidate: 3600 },
);

export async function GET() {
  try {
    const payload = await getCachedDemoPreview();

    return NextResponse.json(payload, {
      headers: {
        // First cold visitor may wait on Supabase; everyone else hits cache.
        "Cache-Control":
          "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
        "Vercel-CDN-Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[api/demo-preview]", err);
    return NextResponse.json(
      { error: "Failed to load demo preview." },
      {
        status: 503,
        headers: {
          // Don't cache failures.
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
