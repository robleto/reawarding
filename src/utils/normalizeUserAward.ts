export interface UserAward {
  year: number;
  category: string;
  winnerId: string | number | null;
  nomineeIds: (string | number)[];
}

function isBestPictureCategory(category: unknown): boolean {
  if (typeof category !== "string") return false;
  const normalized = category.trim().toLowerCase().replace(/[_\s]+/g, "-");
  return normalized === "best-picture";
}

/**
 * Normalizes a raw `awards` table row (or a guest-store award, which carries
 * the same fields under slightly different keys) into a UserAward. Shared by
 * useUserAwards.ts (client) and /api/alternate-oscar-history/route.ts
 * (server) so the two can't drift on what counts as a valid Best Picture
 * award record.
 */
export function toNormalizedAward(raw: any): UserAward | null {
  const year = Number(raw?.year);
  if (!Number.isFinite(year)) return null;

  const payload =
    raw?.nominations && typeof raw.nominations === "object"
      ? { ...raw, ...raw.nominations }
      : raw;

  const rawCategory = typeof raw?.category === "string" ? raw.category : "best-picture";
  const category = rawCategory.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!isBestPictureCategory(category)) return null;

  const rawWinnerId =
    payload?.winnerId ??
    payload?.winner_id ??
    payload?.winner?.id ??
    payload?.winner_movie_id ??
    null;

  const nomineeSource = Array.isArray(payload?.nomineeIds)
    ? payload.nomineeIds
    : Array.isArray(payload?.nominee_ids)
      ? payload.nominee_ids
      : Array.isArray(payload?.nominees)
        ? payload.nominees.map((n: any) => n?.id ?? n)
        : [];

  const nomineeIds = nomineeSource
    .filter((id: unknown) => id != null && id !== "")
    .map((id: unknown) => {
      const asNum = Number(id);
      return Number.isFinite(asNum) && String(asNum) === String(id) ? asNum : id;
    }) as (string | number)[];
  const winnerId: string | number | null =
    rawWinnerId != null && rawWinnerId !== ""
      ? (() => {
          const asNum = Number(rawWinnerId);
          return Number.isFinite(asNum) && String(asNum) === String(rawWinnerId) ? asNum : rawWinnerId;
        })()
      : nomineeIds[0] ?? null;

  return {
    year,
    category,
    winnerId,
    nomineeIds,
  };
}
