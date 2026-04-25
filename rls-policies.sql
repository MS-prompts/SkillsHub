-- ============================================================
-- SkillsHub Row Level Security (RLS) Policies
-- ============================================================
-- Run AFTER schema.sql in your Supabase SQL editor.
--
-- These policies enforce all access control at the DATABASE level.
-- Even if API code has a bug, the database refuses unauthorized
-- reads and writes. This is the main security layer.
-- ============================================================


-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE markdown_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_team_visibility   ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_team_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_shares        ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_feedback          ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
-- All marked SECURITY DEFINER so they bypass RLS internally.
-- This is what avoids recursive-policy bugs (e.g. on team_members).

CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_team_member(team UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_team_lead(team UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams
    WHERE id = team AND lead_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Centralized "can the current user view this MD?" check.
-- True if the owning team is mine, OR the MD is shared into one of
-- my teams via md_team_visibility, OR it was direct-shared to me.
CREATE OR REPLACE FUNCTION can_view_md(md UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM markdown_files m
    WHERE m.id = md
      AND (
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = m.team_id AND tm.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM md_team_visibility v
          JOIN team_members tm ON tm.team_id = v.team_id
          WHERE v.md_id = md AND tm.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM direct_shares d
          WHERE d.md_id = md AND d.recipient_id = auth.uid()
        )
      )
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- ============================================================
-- COMPANIES
-- ============================================================

CREATE POLICY "view_own_company"
ON companies FOR SELECT
USING (id = my_company_id());

CREATE POLICY "admin_update_company"
ON companies FOR UPDATE
USING (id = my_company_id() AND is_company_admin());

-- Companies are normally created by the handle_new_user() trigger,
-- which runs as SECURITY DEFINER and bypasses RLS. We still allow
-- INSERT here for completeness (e.g., admin tooling).
CREATE POLICY "insert_company_authenticated"
ON companies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================
-- PROFILES
-- ============================================================

-- Users can see profiles of people in their company (so they can
-- pick a recipient for direct shares, see authors, etc.).
CREATE POLICY "view_company_profiles"
ON profiles FOR SELECT
USING (company_id = my_company_id());

CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- Profiles are inserted by the handle_new_user() trigger; no INSERT policy needed.


-- ============================================================
-- TEAMS
-- ============================================================

CREATE POLICY "view_company_teams"
ON teams FOR SELECT
USING (company_id = my_company_id());

CREATE POLICY "admin_create_team"
ON teams FOR INSERT
WITH CHECK (
  company_id = my_company_id()
  AND is_company_admin()
);

CREATE POLICY "lead_update_team"
ON teams FOR UPDATE
USING (
  company_id = my_company_id()
  AND (is_team_lead(id) OR is_company_admin())
);


-- ============================================================
-- TEAM MEMBERS
-- ============================================================

-- Anyone in the company can see membership of any team in their company.
-- Directory-style visibility, not a security boundary.
-- Avoids the recursive-policy bug by selecting from `teams`, not from
-- `team_members` itself.
CREATE POLICY "view_company_team_members"
ON team_members FOR SELECT
USING (
  team_id IN (
    SELECT id FROM teams WHERE company_id = my_company_id()
  )
);

CREATE POLICY "lead_add_member"
ON team_members FOR INSERT
WITH CHECK (is_team_lead(team_id));

CREATE POLICY "lead_or_self_remove_member"
ON team_members FOR DELETE
USING (
  is_team_lead(team_id)
  OR is_company_admin()
  OR user_id = auth.uid()
);


-- ============================================================
-- MARKDOWN FILES
-- ============================================================

-- View if I can see the MD per the centralized rule.
CREATE POLICY "view_accessible_mds"
ON markdown_files FOR SELECT
USING (can_view_md(id));

-- Members of a team can author MDs into their team's feed.
CREATE POLICY "member_create_md"
ON markdown_files FOR INSERT
WITH CHECK (
  is_team_member(team_id)
  AND author_id = auth.uid()
);

-- Authors can edit their own MDs; team leads can edit any MD in their team.
CREATE POLICY "update_md"
ON markdown_files FOR UPDATE
USING (
  author_id = auth.uid()
  OR is_team_lead(team_id)
);

-- Same rule for delete.
CREATE POLICY "delete_md"
ON markdown_files FOR DELETE
USING (
  author_id = auth.uid()
  OR is_team_lead(team_id)
);


-- ============================================================
-- MD TEAM VISIBILITY
-- ============================================================

-- Visibility rows are visible to anyone who can see the underlying MD.
CREATE POLICY "view_md_visibility"
ON md_team_visibility FOR SELECT
USING (can_view_md(md_id));

-- Only the target team lead can grant visibility.
-- Typically called right after approving a cross_team_requests row.
CREATE POLICY "lead_grant_visibility"
ON md_team_visibility FOR INSERT
WITH CHECK (is_team_lead(team_id));

-- Only the target team lead can revoke visibility.
CREATE POLICY "lead_revoke_visibility"
ON md_team_visibility FOR DELETE
USING (is_team_lead(team_id));


-- ============================================================
-- JOIN REQUESTS
-- ============================================================

CREATE POLICY "view_own_join_requests"
ON join_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "lead_view_join_requests"
ON join_requests FOR SELECT
USING (is_team_lead(team_id));

CREATE POLICY "create_join_request"
ON join_requests FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND team_id IN (
    SELECT id FROM teams WHERE company_id = my_company_id()
  )
);

CREATE POLICY "lead_resolve_join_request"
ON join_requests FOR UPDATE
USING (is_team_lead(team_id));


-- ============================================================
-- CROSS-TEAM SHARE REQUESTS
-- ============================================================

CREATE POLICY "view_own_cross_team_requests"
ON cross_team_requests FOR SELECT
USING (requested_by = auth.uid());

CREATE POLICY "lead_view_incoming_requests"
ON cross_team_requests FOR SELECT
USING (is_team_lead(to_team_id));

CREATE POLICY "member_create_cross_team_request"
ON cross_team_requests FOR INSERT
WITH CHECK (
  is_team_member(from_team_id)
  AND requested_by = auth.uid()
  AND to_team_id IN (
    SELECT id FROM teams WHERE company_id = my_company_id()
  )
);

CREATE POLICY "lead_resolve_cross_team_request"
ON cross_team_requests FOR UPDATE
USING (is_team_lead(to_team_id));


-- ============================================================
-- DIRECT SHARES
-- ============================================================

CREATE POLICY "view_direct_shares"
ON direct_shares FOR SELECT
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "create_direct_share"
ON direct_shares FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND recipient_id IN (
    SELECT id FROM profiles WHERE company_id = my_company_id()
  )
);

CREATE POLICY "recipient_mark_seen"
ON direct_shares FOR UPDATE
USING (recipient_id = auth.uid());


-- ============================================================
-- MD FEEDBACK (Coworker ratings)
-- ============================================================

-- Anyone who can see the MD can see its ratings.
CREATE POLICY "view_md_feedback"
ON md_feedback FOR SELECT
USING (can_view_md(md_id));

-- You can rate any MD you can view, except your own.
CREATE POLICY "rate_md"
ON md_feedback FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND can_view_md(md_id)
  AND md_id NOT IN (
    SELECT id FROM markdown_files WHERE author_id = auth.uid()
  )
);

-- You can edit only your own rating.
CREATE POLICY "update_own_feedback"
ON md_feedback FOR UPDATE
USING (user_id = auth.uid());

-- You can delete only your own rating.
CREATE POLICY "delete_own_feedback"
ON md_feedback FOR DELETE
USING (user_id = auth.uid());
