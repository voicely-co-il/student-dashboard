/**
 * Secure Storage Utilities for Voicely
 *
 * IMPORTANT: Voice recordings are biometric data.
 * Always use signed URLs with short expiry times.
 * Never expose public URLs for recordings.
 */

import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "recordings";
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Upload a recording to the user's private folder
 * @param file - The audio file to upload
 * @param userId - The user's ID (used as folder name)
 * @param filename - Optional custom filename
 * @returns The file path (not a public URL!)
 */
export async function uploadRecording(
  file: File,
  userId: string,
  filename?: string
): Promise<{ path: string; error: Error | null }> {
  const extension = file.name.split(".").pop() || "mp3";
  const safeName = filename || `${Date.now()}.${extension}`;
  const path = `${userId}/${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false, // Don't overwrite existing files
    });

  if (error) {
    // Don't expose internal error messages
    console.error("Upload error:", error);
    return { path: "", error: new Error("שגיאה בהעלאת הקובץ") };
  }

  return { path, error: null };
}

/**
 * Get a signed URL for a recording
 * NEVER use getPublicUrl for recordings!
 *
 * @param path - The file path in storage
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Signed URL that expires
 */
export async function getRecordingUrl(
  path: string,
  expiresIn: number = DEFAULT_EXPIRY_SECONDS
): Promise<{ url: string; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Signed URL error:", error);
    return { url: "", error: new Error("שגיאה בגישה לקובץ") };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * Delete a recording
 * Only the owner can delete their recordings (enforced by RLS)
 *
 * @param path - The file path to delete
 */
export async function deleteRecording(
  path: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    console.error("Delete error:", error);
    return { error: new Error("שגיאה במחיקת הקובץ") };
  }

  return { error: null };
}

/**
 * List user's recordings
 * RLS ensures only own recordings are returned
 *
 * @param userId - The user's ID (folder name)
 */
export async function listRecordings(userId: string): Promise<{
  files: { name: string; createdAt: string; size: number }[];
  error: Error | null;
}> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(userId, {
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    console.error("List error:", error);
    return { files: [], error: new Error("שגיאה בטעינת הקבצים") };
  }

  const files =
    data?.map((file) => ({
      name: file.name,
      createdAt: file.created_at,
      size: file.metadata?.size || 0,
    })) || [];

  return { files, error: null };
}
