/**
 * src/hooks/useTeam.ts
 * 
 * Enterprise Team Management hook.
 * Connects the UI to the Team API for invitations, role changes, and shared agents.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./useAuth";
import type { Team, TeamMember, TeamAgent, TeamActivityLog, TeamRole } from "@/lib/team-data";

export function useTeam(teamId?: string) {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: any }>(`/teams/${teamId}`);
      // The backend returns { team, myRole }. We'll merge them for the UI.
      const { team: teamData, myRole } = res.data;
      
      // Fetch team agents and audit logs in parallel
      const [agentsRes, logsRes] = await Promise.all([
        api.get<{ success: boolean; data: any[]; total: number }>(`/teams/${teamId}/agents`),
        api.get<{ success: boolean; data: any[]; total: number }>(`/teams/${teamId}/audit-logs`)
      ]);

      // Map backend structure to the frontend Team interface
      const mappedTeam: Team = {
        id: teamData.id,
        name: teamData.name,
        description: teamData.description,
        avatar_letter: teamData.name[0].toUpperCase(),
        avatar_color: "bg-primary/15 text-primary",
        created_at: teamData.createdAt,
        plan: "pro", // Hardcoded for now, or map from billing
        members: teamData.members.map((m: any) => ({
          id: m.userId,
          name: m.user.displayName || m.user.username,
          email: m.user.email,
          role: m.role.toLowerCase() as TeamRole,
          joined_at: m.joinedAt,
          last_active: m.user.updatedAt, // Approximation
          status: m.inviteStatus.toLowerCase(),
          contributions: 0,
          agents_created: 0
        })),
        agents: (agentsRes.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          category: a.category,
          owner_id: a.userId,
          owner_name: "Team Member", // Would need another join to be precise
          branch: "main",
          version: a.version,
          status: a.status.toLowerCase(),
          last_edited_by: "Team Member",
          last_edited_at: a.updatedAt,
          run_count: a.runsCount,
          permissions: {
            admin: ["view", "edit", "execute", "publish"],
            editor: ["view", "edit", "execute"],
            viewer: ["view"]
          }
        })),
        activity_logs: (logsRes.data || []).map((l: any) => ({
          id: l.id,
          member_id: l.userId,
          member_name: l.user?.displayName || l.user?.username || "System",
          member_role: "editor", // Simplified
          action: l.action,
          action_type: l.action.split(".")[1] as any,
          resource_type: l.entityType.toLowerCase() as any,
          resource_name: l.entityId,
          timestamp: l.createdAt,
          details: JSON.stringify(l.metadata)
        })),
        stats: {
          total_agents: agentsRes.total || (agentsRes.data?.length || 0),
          active_agents: (agentsRes.data || []).filter((a: any) => a.status === "ACTIVE").length,
          total_runs: (agentsRes.data || []).reduce((acc: number, a: any) => acc + (a.runsCount || 0), 0),
          runs_this_week: 0,
          success_rate: 0,
          total_commits: 0,
          open_merge_requests: 0
        },
        settings: {
          require_review_for_publish: false,
          allow_public_agents: true,
          two_factor_required: teamData.twoFactorEnforced,
          default_branch_protection: true
        }
      };

      setTeam(mappedTeam);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load team.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const inviteMember = async (email: string, role: string) => {
    await api.post(`/teams/${teamId}/invite`, { email, role: role.toUpperCase() });
    await fetchTeam();
  };

  const removeMember = async (userId: string) => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
    await fetchTeam();
  };

  const changeRole = async (userId: string, role: string) => {
    await api.patch(`/teams/${teamId}/members/${userId}/role`, { role: role.toUpperCase() });
    await fetchTeam();
  };

  const transferOwnership = async (newOwnerId: string) => {
    await api.post(`/teams/${teamId}/transfer`, { newOwnerId });
    await fetchTeam();
  };

  const toggle2FA = async (enforced: boolean) => {
    await api.patch(`/teams/${teamId}/security`, { twoFactorEnforced: enforced });
    await fetchTeam();
  };

  const addCredits = async (amount: number, note?: string) => {
    await api.post(`/teams/${teamId}/credits`, { amount, note });
    await fetchTeam();
  };

  return {
    team,
    loading,
    error,
    actions: {
      inviteMember,
      removeMember,
      changeRole,
      transferOwnership,
      toggle2FA,
      addCredits,
      refresh: fetchTeam
    }
  };
}
