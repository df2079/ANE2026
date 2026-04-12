import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { normalizeEmail } from "@/lib/utils";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isMissingSessionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { name?: string; message?: string; status?: number; code?: string };
  const message = maybeError.message?.toLowerCase() ?? "";
  const name = maybeError.name ?? "";

  return (
    name === "AuthSessionMissingError" ||
    message.includes("auth session missing") ||
    message.includes("session missing") ||
    maybeError.status === 400
  );
}

export function getAllowedAdminEmails() {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAllowedAdminEmails().includes(normalizeEmail(email));
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isMissingSessionError(error)) {
      return null;
    }

    throw error;
  }
  const { user } = data;
  return user;
}

export async function requireAdminUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || !isAllowedAdminEmail(user.email)) {
    redirect("/admin/login");
  }

  return user;
}
