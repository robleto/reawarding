"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Films/Rankings/Lists each have two implementations: a global, editable
// "workbench" page (/films, /rankings, /lists) and a read-only,
// friend-facing copy under [username]/*. In "personal" view mode the owner
// has no use for the read-only copy of their own content — it's the exact
// same information they can already edit at the workbench — so send them
// there instead of rendering a duplicate. Visitors, and the owner in
// "public" preview mode, are unaffected and get the [username]/* page as
// normal; `isOwnProfile` is false for the former and viewMode is "public"
// for the latter, so `shouldRedirect` stays false in both cases.
export function useRedirectOwnerToWorkbench(
  workbenchHref: string,
  isOwnProfile: boolean,
  viewMode: "personal" | "public"
) {
  const router = useRouter();
  const shouldRedirect = isOwnProfile && viewMode === "personal";

  useEffect(() => {
    if (shouldRedirect) router.replace(workbenchHref);
  }, [shouldRedirect, workbenchHref, router]);

  return shouldRedirect;
}
