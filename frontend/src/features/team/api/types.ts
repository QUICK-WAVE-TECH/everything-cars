/** A branch reference as returned inside team/scope payloads. */
export type BranchRef = { id: string; name: string };

/** A team-member account (staff of a fleet business). Mirrors the backend
 * `TeamMemberSerializer`. */
export type TeamMember = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  branches: BranchRef[];
  is_active: boolean;
  created_at: string;
};

/** Create payload. On edit, only `title` + `branch_ids` are sent. */
export type TeamMemberInput = {
  email: string;
  first_name: string;
  last_name: string;
  title?: string;
  branch_ids: string[];
};

/** The caller's effective scope (`GET /owner/me/scope`). */
export type Scope = {
  is_team_member: boolean;
  can_manage_team: boolean;
  business_name: string;
  branches: BranchRef[];
};
