import { useEffect, useRef } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/supabase";
import { useGuestRankingStoreWithMigration } from "@/hooks/useGuestRankingStore";

export function useAuthMigration(onMigrationSuccess?: (count: number) => void) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const router = useRouter();
  const guestStore = useGuestRankingStoreWithMigration();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const handleAuthStateChange = async () => {
      // Only migrate if user just signed in/up and has guest data
      if (user && guestStore.hasGuestInteracted() && !hasProcessedRef.current) {
        hasProcessedRef.current = true;
        
        try {
          const result = await guestStore.migrateToSupabase(user.id);
          if (result.success && result.migratedCount > 0) {
            console.log(`Successfully migrated ${result.migratedCount} guest ratings`);
            onMigrationSuccess?.(result.migratedCount);
            
            // For OAuth redirects, also redirect to rankings and show welcome message
            if (window.location.pathname === '/' || window.location.pathname.includes('callback')) {
              // Show welcome message for OAuth signup
              setTimeout(() => {
                onMigrationSuccess?.(result.migratedCount);
              }, 100);
              router.push('/rankings');
            } else {
              onMigrationSuccess?.(result.migratedCount);
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
