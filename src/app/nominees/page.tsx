import { redirect } from "next/navigation";

// LOOP-1 fix: this page used to render a standalone Best Picture nominees
// builder (search/select/reorder/crown a winner) whose Save and Share
// actions were non-functional stubs — nothing was ever persisted to
// Supabase, so anyone who reached /nominees (bookmark, old link, search
// engine — it was never linked from app nav) could build a full ballot and
// lose it with only a toast to show for it. It also duplicated the app's
// real, working ballot-building flow (EditableYearSection / the
// /year/[year] workshop) with a second, broken one, styled in the app's
// retired legacy light theme. Per CLAUDE.md, /year pages are the canonical
// ballot workspace, so /nominees now redirects to Home rather than
// re-rendering the broken builder — mirroring the /awards redirect
// (src/app/awards/page.tsx), which sends its own now-merged legacy page to
// / for the same reason. The now-orphaned builder components
// (BestPictureNominees, NomineesEmptyState) are left in place, unused, and
// flagged as dead code — removing them entirely is a good small follow-up
// cleanup task for whoever has file-deletion permission in their workflow.
export default function NomineesRedirect() {
  redirect("/");
}
