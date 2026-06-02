-- Manual, additive migration for the shared production DB (community schema).
-- Safe to re-run (IF NOT EXISTS). Do NOT use `prisma db push` against prod —
-- it would diff the shared Customer/auth tables too.

-- 1) Event end time (for Start/End time on event posts)
ALTER TABLE community.tbl_community_posts
  ADD COLUMN IF NOT EXISTS cp_event_end_time text;

-- 2) Community profile (bio, location, cover, interests) — one per customer
CREATE TABLE IF NOT EXISTS community.tbl_community_profiles (
  cprof_id          bigserial PRIMARY KEY,
  cprof_customer_id bigint      NOT NULL UNIQUE,
  cprof_bio         text,
  cprof_location    text,
  cprof_cover_url   text,
  cprof_interests   text[]      NOT NULL DEFAULT '{}',
  cprof_created_at  timestamp(3) NOT NULL DEFAULT now(),
  cprof_updated_at  timestamp(3) NOT NULL DEFAULT now()
);

-- About card: occupation ("Works as") + role
ALTER TABLE community.tbl_community_profiles
  ADD COLUMN IF NOT EXISTS cprof_occupation text;
ALTER TABLE community.tbl_community_profiles
  ADD COLUMN IF NOT EXISTS cprof_role text;
