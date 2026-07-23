import { redirect } from "next/navigation";

// Home merged the full year-timeline experience this page used to own
// (explore/awards-as-home). /awards redirects to / rather than re-rendering
// the same page component at a second route: two mounted instances of the
// same page reset each other's in-memory dismiss state on every navigation
// between them, since that state isn't persisted to storage. A redirect
// keeps old links/bookmarks working with no such remount side effect —
// the nav's "Awards" item lands exactly on Home.
export default function AwardsRedirect() {
  redirect("/");
}
