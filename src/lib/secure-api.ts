/**
 * Secure API Utilities for Voicely
 *
 * These wrappers ensure:
 * 1. Proper error handling (no internal leaks)
 * 2. Type safety
 * 3. Consistent patterns
 */

import { supabase } from "@/integrations/supabase/client";

// Generic error messages (don't expose internals)
const ERROR_MESSAGES = {
  FETCH_ERROR: "שגיאה בטעינת הנתונים",
  SAVE_ERROR: "שגיאה בשמירת הנתונים",
  DELETE_ERROR: "שגיאה במחיקת הנתונים",
  AUTH_ERROR: "נדרשת התחברות מחדש",
  PERMISSION_ERROR: "אין הרשאה לפעולה זו",
} as const;

/**
 * Safely fetch user's own data
 * RLS ensures only own data is returned, but we double-check
 */
export async function fetchOwnData<T>(
  table: string,
  userId: string,
  select: string = "*"
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq("user_id", userId);

    if (error) {
      console.error(`Fetch ${table} error:`, error.message);

      // Check for specific error types
      if (error.message.includes("JWT")) {
        return { data: null, error: ERROR_MESSAGES.AUTH_ERROR };
      }
      if (error.message.includes("permission") || error.message.includes("policy")) {
        return { data: null, error: ERROR_MESSAGES.PERMISSION_ERROR };
      }

      return { data: null, error: ERROR_MESSAGES.FETCH_ERROR };
    }

    return { data: data as T, error: null };
  } catch (e) {
    console.error(`Unexpected error fetching ${table}:`, e);
    return { data: null, error: ERROR_MESSAGES.FETCH_ERROR };
  }
}

/**
 * Check if current user has a specific role
 */
export async function checkUserRole(
  expectedRole: "student" | "teacher" | "admin"
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return data?.role === expectedRole;
}

/**
 * Get current user with role
 */
export async function getCurrentUserWithRole(): Promise<{
  user: { id: string; email: string; role: string } | null;
  error: string | null;
}> {
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { user: null, error: ERROR_MESSAGES.AUTH_ERROR };
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, role, name")
      .eq("id", authUser.id)
      .single();

    if (userError) {
      console.error("User data error:", userError);
      return { user: null, error: ERROR_MESSAGES.FETCH_ERROR };
    }

    return { user: userData, error: null };
  } catch (e) {
    console.error("Unexpected error:", e);
    return { user: null, error: ERROR_MESSAGES.FETCH_ERROR };
  }
}

/**
 * Teacher-only: Fetch student data
 * Only returns students assigned to this teacher (via RLS)
 */
export async function fetchMyStudents<T>(
  teacherId: string,
  select: string = "*"
): Promise<{ data: T[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(select)
      .eq("teacher", teacherId)
      .eq("role", "student");

    if (error) {
      console.error("Fetch students error:", error.message);
      return { data: null, error: ERROR_MESSAGES.FETCH_ERROR };
    }

    return { data: data as T[], error: null };
  } catch (e) {
    console.error("Unexpected error:", e);
    return { data: null, error: ERROR_MESSAGES.FETCH_ERROR };
  }
}

/**
 * Safe error handler for React Query
 * Use in onError callbacks
 */
export function handleQueryError(error: unknown): string {
  if (error instanceof Error) {
    // Log for debugging, but don't expose to user
    console.error("Query error:", error.message);
  }
  return ERROR_MESSAGES.FETCH_ERROR;
}

/**
 * Validate that user can only access their own resources
 * Use before any sensitive operation
 */
export async function validateResourceAccess(
  resourceUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: "not_authenticated" };
  }

  // Own resource - always allowed
  if (user.id === resourceUserId) {
    return { allowed: true };
  }

  // Check if teacher accessing student
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentUser?.role === "admin") {
    return { allowed: true };
  }

  if (currentUser?.role === "teacher") {
    const { data: student } = await supabase
      .from("users")
      .select("teacher")
      .eq("id", resourceUserId)
      .single();

    if (student?.teacher === user.id) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: "not_authorized" };
}
