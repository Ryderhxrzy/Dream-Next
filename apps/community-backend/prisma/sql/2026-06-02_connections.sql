DO $$ BEGIN
  CREATE TYPE community."CommunityConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS community.tbl_community_connections (
  cc_id           bigserial PRIMARY KEY,
  cc_requester_id bigint NOT NULL,
  cc_addressee_id bigint NOT NULL,
  cc_status       community."CommunityConnectionStatus" NOT NULL DEFAULT 'PENDING',
  cc_created_at   timestamp(3) NOT NULL DEFAULT now(),
  cc_updated_at   timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT tbl_community_connections_unique UNIQUE (cc_requester_id, cc_addressee_id)
);
CREATE INDEX IF NOT EXISTS tbl_community_connections_addressee_idx ON community.tbl_community_connections (cc_addressee_id);
