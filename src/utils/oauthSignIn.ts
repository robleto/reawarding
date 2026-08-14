import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { isNativeApp } from "@/lib/platform";
import { buildSiteUrl } from "@/utils/siteUrl";

export type OAuthProvider = "github" | "apple" | "google" | "facebook";

const NATIVE_REDIRECT_URL = "com.reawarding.app://auth/callback?next=/";

// In the native app, OAuth must run in a proper browser session (ASWebAuthenticationSession
// via @capacitor/browser) rather than the app's own WebView — WKWebView can lose the PKCE
// code_verifier cookie across the cross-domain redirect chain through the provider and back.
// See NativeOAuthBridge for the other half of this (catching the custom-scheme return).
export async function startOAuthSignIn(
  supabase: SupabaseClient<Database>,
  provider: OAuthProvider
): Promise<{ error: string | null }> {
  if (isNativeApp()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: NATIVE_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error: error.message };
    if (data?.url) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
    }
    return { error: null };
  }

  const redirectTo = buildSiteUrl("/auth/callback?next=/") || undefined;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) return { error: error.message };
  if (data?.url) {
    window.location.href = data.url;
  }
  return { error: null };
}
