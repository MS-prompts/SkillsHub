-- ============================================================
-- SkillsHub Database Schema
-- Supabase / PostgreSQL
-- ============================================================
-- Run this in your Supabase SQL editor first.
-- Then run rls-policies.sql.
-- Order matters within this file — run top to bottom.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";   -- case-insensitive text for company slugs


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role       AS ENUM ('member', 'lead', 'admin');
CREATE TYPE md_tag          AS ENUM ('skill', 'rule', 'prompt', 'sop', 'other');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');


-- ============================================================
-- COMPANIES
-- ============================================================
-- One row per company. Auto-created on the first signup from a new
-- email domain. The slug is derived from that domain (e.g. "acme"
-- for foo@acme.com).

CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        CITEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- PROFILES
-- ============================================================
-- Extends Supabase auth.users with app-specific data.
-- Auto-created on signup, with company auto-bound by email domain.

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  display_name  TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Auto-bind new users to a company by email domain.
-- First user from a new domain creates the company and becomes its admin.
-- Subsequent users from the same domain join as members.
-- This is what enforces "workers locked to the same company ecosystem".
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_email_domain TEXT;
  v_domain_slug  TEXT;
  v_company_id   UUID;
  v_is_first     BOOLEAN := FALSE;
BEGIN
  v_email_domain := lower(split_part(NEW.email, '@', 2));
  v_domain_slug  := split_part(v_email_domain, '.', 1);

  SELECT id INTO v_company_id FROM companies WHERE slug = v_domain_slug;

  IF v_company_id IS NULL THEN
    INSERT INTO companies (name, slug)
    VALUES (initcap(v_domain_slug), v_domain_slug)
    RETURNING id INTO v_company_id;
    v_is_first := TRUE;
  END IF;

  INSERT INTO profiles (id, company_id, display_name, role)
  VALUES (
    NEW.id,
    v_company_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN v_is_first THEN 'admin'::user_role ELSE 'member'::user_role END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- TEAMS
-- ============================================================
-- Teams belong to a company. One designated lead.

CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  lead_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);


-- ============================================================
-- TEAM MEMBERS
-- ============================================================

CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);


-- ============================================================
-- MARKDOWN FILES
-- ============================================================
-- Core content table. Each MD has ONE owning team (team_id).
-- The markdown body is stored inline as TEXT — no Supabase Storage.
-- README is the author's short description shown beside the rendered body.

CREATE TABLE markdown_files (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  readme      TEXT,                          -- short context / description
  content     TEXT NOT NULL,                 -- the markdown body itself
  tags        md_tag[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER markdown_files_updated_at
  BEFORE UPDATE ON markdown_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- MD TEAM VISIBILITY
-- ============================================================
-- Cross-team shares grant READ access to OTHER teams.
-- The MD always belongs to its origin team_id; this table grants
-- additional teams permission to view it.
-- Rows are inserted only after the target team lead approves a
-- cross_team_requests row.

CREATE TABLE md_team_visibility (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  md_id       UUID NOT NULL REFERENCES markdown_files(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(md_id, team_id)
);


-- ============================================================
-- JOIN REQUESTS
-- ============================================================

CREATE TABLE join_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      approval_status NOT NULL DEFAULT 'pending',
  message     TEXT,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);


-- ============================================================
-- CROSS-TEAM SHARE REQUESTS
-- ============================================================
-- A member of team A asks to share an MD into team B.
-- Target team lead approves → app inserts md_team_visibility row.

CREATE TABLE cross_team_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  md_id        UUID NOT NULL REFERENCES markdown_files(id) ON DELETE CASCADE,
  from_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  to_team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  status       approval_status NOT NULL DEFAULT 'pending',
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(md_id, to_team_id)
);


-- ============================================================
-- DIRECT SHARES
-- ============================================================
-- One user sends an MD directly to another user (same company).
-- No approval needed.

CREATE TABLE direct_shares (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  md_id        UUID NOT NULL REFERENCES markdown_files(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message      TEXT,
  seen         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- MD FEEDBACK (Coworker ratings → Coworker Grade)
-- ============================================================
-- Coworkers rate each other's MDs 1-5 stars with an optional comment.
-- Aggregated into a per-user "Coworker Grade" via the user_grades view.
-- A user cannot rate their own MD (enforced by RLS).

CREATE TABLE md_feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  md_id       UUID NOT NULL REFERENCES markdown_files(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars       SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(md_id, user_id)
);


-- ============================================================
-- VIEWS
-- ============================================================

-- Per-MD aggregate rating: average stars + count.
CREATE OR REPLACE VIEW md_rating_summary AS
SELECT
  m.id                                                  AS md_id,
  COALESCE(ROUND(AVG(f.stars)::NUMERIC, 2), 0)::NUMERIC AS avg_stars,
  COUNT(f.id)::INT                                      AS rating_count
FROM markdown_files m
LEFT JOIN md_feedback f ON f.md_id = m.id
GROUP BY m.id;

-- Per-user "Coworker Grade": average stars across all of a user's MDs.
CREATE OR REPLACE VIEW user_grades AS
SELECT
  p.id                                                  AS user_id,
  p.display_name,
  p.company_id,
  COALESCE(ROUND(AVG(f.stars)::NUMERIC, 2), 0)::NUMERIC AS coworker_grade,
  COUNT(f.id)::INT                                      AS total_ratings,
  COUNT(DISTINCT m.id)::INT                             AS md_count
FROM profiles p
LEFT JOIN markdown_files m ON m.author_id = p.id
LEFT JOIN md_feedback   f  ON f.md_id = m.id
GROUP BY p.id, p.display_name, p.company_id;


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_company_id           ON profiles(company_id);
CREATE INDEX idx_teams_company_id              ON teams(company_id);
CREATE INDEX idx_team_members_team_id          ON team_members(team_id);
CREATE INDEX idx_team_members_user_id          ON team_members(user_id);
CREATE INDEX idx_markdown_files_team_id        ON markdown_files(team_id);
CREATE INDEX idx_markdown_files_author_id      ON markdown_files(author_id);
CREATE INDEX idx_markdown_files_tags           ON markdown_files USING GIN(tags);
CREATE INDEX idx_md_team_visibility_md_id      ON md_team_visibility(md_id);
CREATE INDEX idx_md_team_visibility_team_id    ON md_team_visibility(team_id);
CREATE INDEX idx_join_requests_team_pending    ON join_requests(team_id) WHERE status = 'pending';
CREATE INDEX idx_cross_team_requests_to_team   ON cross_team_requests(to_team_id) WHERE status = 'pending';
CREATE INDEX idx_direct_shares_recipient       ON direct_shares(recipient_id) WHERE seen = FALSE;
CREATE INDEX idx_md_feedback_md_id             ON md_feedback(md_id);
CREATE INDEX idx_md_feedback_user_id           ON md_feedback(user_id);
