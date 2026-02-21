import { useEffect, useRef } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/supabase";
import { useGuestRankingStoreWithMigration } from "@/hooks/useGuestRankingStore";
import { ensureUserWatchlist } from "./watchlist";

export function useAuthMigration(onMigrationSuccess?: (count: number) => void) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const router = useRouter();
  const guestStore = useGuestRankingStoreWithMigration();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const handleAuthStateChange = async () => {
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      // Skip bootstrapping when auth is transitioning (e.g., during sign-out).
      if (!session || session.user.id !== user.id) return;

      // Ensure user has a Watchlist (idempotent)
      try {
        await ensureUserWatchlist(supabase, user.id);
      } catch (e) {
        console.warn("ensureUserWatchlist failed:", e);
      }

      // Only migrate if user just signed in/up and has guest data
      if (guestStore.hasGuestInteracted() && !hasProcessedRef.current) {
        hasProcessedRef.current = true;
        try {
          const result = await guestStore.migrateToSupabase(user.id);
          if (result.success && result.migratedCount > 0) {
            onMigrationSuccess?.(result.migratedCount);
            if (window.location.pathname === '/' || window.location.pathname.includes('callback')) {
              setTimeout(() => {
                onMigrationSuccess?.(result.migratedCount);
              }, 100);
              // Redirect to homepage (awards-first experience) instead of /rankings
              router.push('/');
            }
          }
        } catch (error) {
          console.error("Error migrating guest data:", error);
        }
      }
    };

    handleAuthStateChange();
  }, [user, guestStore, onMigrationSuccess, router]);

  // Reset the processing flag when user changes
  useEffect(() => {
    if (!user) {
      hasProcessedRef.current = false;
    }
  }, [user]);
}
