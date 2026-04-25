export type UserRole = 'member' | 'lead' | 'admin'
export type MDTag = 'skill' | 'rule' | 'prompt' | 'sop' | 'other'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export const MD_TAGS: MDTag[] = ['skill', 'rule', 'prompt', 'sop', 'other']

export interface Company {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Profile {
  id: string
  company_id: string | null
  display_name: string
  role: UserRole
  created_at: string
}

export interface Team {
  id: string
  company_id: string
  name: string
  description: string | null
  lead_id: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  joined_at: string
}

export interface MarkdownFile {
  id: string
  team_id: string
  author_id: string
  title: string
  readme: string | null
  content: string
  tags: MDTag[]
  created_at: string
  updated_at: string
}

export interface MDTeamVisibility {
  id: string
  md_id: string
  team_id: string
  granted_at: string
}

export interface JoinRequest {
  id: string
  team_id: string
  user_id: string
  status: ApprovalStatus
  message: string | null
  resolved_at: string | null
  created_at: string
}

export interface CrossTeamRequest {
  id: string
  md_id: string
  from_team_id: string
  to_team_id: string
  requested_by: string
  status: ApprovalStatus
  resolved_at: string | null
  created_at: string
}

export interface DirectShare {
  id: string
  md_id: string
  sender_id: string
  recipient_id: string
  message: string | null
  seen: boolean
  created_at: string
}

export interface MDFeedback {
  id: string
  md_id: string
  user_id: string
  stars: 1 | 2 | 3 | 4 | 5
  comment: string | null
  created_at: string
}

export interface MDRatingSummary {
  md_id: string
  avg_stars: number
  rating_count: number
}

export interface UserGrade {
  user_id: string
  display_name: string
  company_id: string
  coworker_grade: number
  total_ratings: number
  md_count: number
}
