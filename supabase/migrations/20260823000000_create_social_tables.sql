-- Social: friendships + activity events

-- Friendshipscan
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_low uuid NOT NULL,
  user_high uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_canonical_pair CHECK (
    user_low = LEAST(requester_id, addressee_id)
    AND user_high = GREATEST(requester_id, addressee_id)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_user_pair_unique
  ON public.friendships(user_low, user_high);

CREATE INDEX IF NOT EXISTS friendships_requester_idx
  ON public.friendships(requester_id);

CREATE INDEX IF NOT EXISTS friendships_addressee_idx
  ON public.friendships(addressee_id);

CREATE INDEX IF NOT EXISTS friendships_status_idx
  ON public.friendships(status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Friends can view their own friendships" ON public.friendships;
CREATE POLICY "Friends can view their own friendships" ON public.friendships
  FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS "Users can request friends" ON public.friendships;
CREATE POLICY "Users can request friends" ON public.friendships
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND requester_id = auth.uid()
    AND status = 'pending'
    AND requester_id <> addressee_id
  );

DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;
CREATE POLICY "Users can update their friendships" ON public.friendships
  FOR UPDATE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Activity events
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  movie_id uuid NULL REFERENCES public.movies(id) ON DELETE SET NULL,
  list_id uuid NULL REFERENCES public.movie_lists(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_actor_created_idx
  ON public.activity_events(actor_id, created_at DESC);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_events;
CREATE POLICY "Users can insert their own activity" ON public.activity_events
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND actor_id = auth.uid());

DROP POLICY IF EXISTS "Users can view friend activity" ON public.activity_events;
CREATE POLICY "Users can view friend activity" ON public.activity_events
  FOR SELECT
  USING (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = public.activity_events.actor_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = public.activity_events.actor_id)
        )
    )
  );
