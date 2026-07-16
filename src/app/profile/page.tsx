"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Profile editing lives in /settings now. This route is kept as a redirect
// so old links/bookmarks to /profile still land somewhere useful.
export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings");
  }, [router]);

  return null;
}
