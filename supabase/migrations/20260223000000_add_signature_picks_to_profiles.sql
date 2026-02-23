-- Persist public profile "Signature Picks" selections (movie ids) per user.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signature_picks JSONB;

COMMENT ON COLUMN public.profiles.signature_picks IS
'Ordered array of movie ids chosen for public profile Signature Picks.';
