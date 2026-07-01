import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "profile-avatars";
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function avatarObjectPath(userId: string, file: File): string {
  const extFromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extFromType =
    file.type.split("/")[1]?.replace("jpeg", "jpg").toLowerCase() ?? "jpg";
  const ext = ALLOWED_EXTENSIONS.has(extFromName)
    ? extFromName.replace("jpeg", "jpg")
    : extFromType;
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext.replace("jpeg", "jpg") : "jpg";
  return `${userId}/avatar.${safeExt}`;
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  if (!userId) {
    throw new Error("You must be signed in to upload a profile photo.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 2 MB or smaller.");
  }

  const path = avatarObjectPath(userId, file);

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
