import { useUser } from "@/hooks/useUser";

// Single source of truth for "is the logged-in session the owner of the
// profile being viewed" across the [username] tree. Compares by id, not
// username — a username compare can go stale (case, rename) in ways an id
// never does. Was previously reimplemented four different ways (username
// compare via ProfileContext, id compare via three different auth hooks, or
// not checked at all) across layout.tsx, page.tsx, awards/, watchlist/,
// lists/, collections/, rankings/, films/ — that drift is what let the
// stats-on-every-tab and ranking-row-spacing bugs slip through.
export function useIsProfileOwner(profileId: string | null | undefined): boolean {
  const { userId } = useUser();
  return !!profileId && userId === profileId;
}
