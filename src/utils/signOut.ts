"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

function isMissingSessionError(error: unknown) {
  if (!error) return false;
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : String(error);
  return /AuthSessionMissingError|Auth session missing/i.test(message);
}

async function clearServerSession() {
  const response = await fetch("/auth/signout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Server sign-out failed with status ${response.status}`);
  }
}

async function clearClientSession(supabase: SupabaseClient<Database>) {
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error && !isMissingSessionError(error)) {
      throw error;
    }
  } catch (error) {
    if (!isMissingSessionError(error)) {
      throw error;
    }
  }
}

function clearClientAuthStorage() {
  if (typeof window === "undefined") return;

  const authStorageKeyPattern =
    /^(sb-.*(?:auth-token|access-token|refresh-token|code-verifier)|supabase\.auth\.token)$/i;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key && authStorageKeyPattern.test(key)) {
      window.localStorage.removeItem(key);
    }
  }

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key && authStorageKeyPattern.test(key)) {
      window.sessionStorage.removeItem(key);
    }
  }

  const cookies = document.cookie.split(";").map((cookie) => cookie.trim()).filter(Boolean);
  for (const cookie of cookies) {
    const [rawName] = cookie.split("=");
    if (!rawName) continue;
    if (/^sb-.*(?:auth-token|access-token|refresh-token|code-verifier)$/i.test(rawName)) {
      document.cookie = `${rawName}=; Max-Age=0; path=/`;
    }
  }
}

export async function signOutEverywhere(supabase: SupabaseClient<Database>) {
  let serverError: unknown = null;
  let clientError: unknown = null;

  try {
    await clearServerSession();
  } catch (error) {
    serverError = error;
  }

  try {
    await clearClientSession(supabase);
  } catch (error) {
    clientError = error;
  } finally {
    clearClientAuthStorage();
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (session) {
    throw new Error("Client auth session still exists after sign-out");
  }

  if (serverError) {
    throw serverError;
  }

  if (clientError) {
    throw clientError;
  }
}
