"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  Users, Shield, Bot, Activity, Plus, Mail,
  BarChart2, CheckCircle2, Clock, Star,
  TrendingUp, GitBranch, GitCommit, Settings,
  Crown, Eye, Edit3, Zap, Globe,
  X, ChevronRight, Search, CreditCard, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTeam } from "@/hooks/useTeam";
import { 
  ROLE_CONFIG, ACTION_TYPE_CONFIG, 
  formatRelTime, getMemberInitials,
  type Team, type TeamMember, type TeamRole 
} from "@/lib/team-data";
import { Spinner } from "@/components/ui/spinner-1";

// ─── Components ───────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = "md" }: { member: TeamMember; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs";
  const roleCfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
  return (
    <div className={cn(
      "flex shrink-0 items-center justify-center rounded-full font-bold",
      sz, roleCfg.bgColor, roleCfg.color
    )}>
      {getMemberInitials(member.name)}
    </div>
  );
}

function RoleBadge({ role }: { role: TeamRole }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;
  const Icon = role === "admin" ? Crown : (role as string) === "owner" ? Shield : role === "editor" ? Edit3 : Eye;
  return (
    <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize", cfg.bgColor, cfg.color)}>
      <Icon className="h-2.5 w-2.5" /> {cfg.label}
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab({ team }: { team: Team }) {
  const { stats } = team;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Bot,        label: "Total Agents",   value: stats.total_agents,   sub: `${stats.active_agents} active`,          color: "text-primary" },
          { icon: BarChart2,  label: "Total Runs",     value: stats.total_runs.toLocaleString(), sub: "Shared usage", color: "text-violet-500" },
          { icon: CheckCircle2,label:"Success Rate",   value: `${Math.round(stats.success_rate * 100)}%`, sub: "overall",        color: "text-green-500" },
          { icon: GitCommit,  label: "Commits",        value: stats.total_commits,  sub: `${stats.open_merge_requests} open MRs`,  color: "text-amber-500" },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className="text-xl font-bold">{value}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Active Members</h3>
            <Badge variant="secondary" className="text-[10px]">{team.members.length} total</Badge>
          </div>
          <div className="grid gap-2">
            {team.members.filter((m) => m.status === "active").slice(0, 4).map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <MemberAvatar member={member} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{member.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                </div>
                <RoleBadge role={member.role} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold">Workspace Security</h3>
          <div className="rounded-xl border divide-y bg-card shadow-sm">
            {[
              { label: "2FA Enforcement", value: team.settings.two_factor_required, icon: Shield },
              { label: "Public Agent Sharing", value: team.settings.allow_public_agents, icon: Globe },
              { label: "Audit Logging", value: true, icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs">{label}</p>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  value ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                )}>
                  {value ? "Enforced" : "Optional"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MembersTab({ team, actions }: { team: Team; actions: any }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("editor");

  const onInvite = async () => {
    try {
      await actions.inviteMember(inviteEmail, inviteRole);
      setInviteEmail("");
      alert("Invite sent!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold">Invite New Member</h3>
        <div className="flex gap-3">
          <Input 
            className="flex-1 text-xs" 
            placeholder="email@example.com" 
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <select 
            className="rounded-md border bg-background px-3 text-xs"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as TeamRole)}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <Button size="sm" onClick={onInvite} className="gap-2">
            <Mail className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 font-bold">Member</th>
              <th className="px-4 py-3 font-bold">Role</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {team.members.map((member) => (
              <tr key={member.id} className="hover:bg-muted/10">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar member={member} size="sm" />
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="capitalize text-[9px]">{member.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => actions.removeMember(member.id)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingTab({ team, actions }: { team: Team; actions: any }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Available Credits</p>
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">12,450</p>
          <p className="text-[10px] text-muted-foreground mt-1">Shared team balance</p>
          <Button className="w-full mt-4 gap-2" size="sm" onClick={() => actions.addCredits(500)}>
            <Plus className="h-4 w-4" /> Top Up
          </Button>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">Usage This Month</p>
          <p className="text-2xl font-bold">2,184</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: "45%" }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">45% of monthly budget</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">Billing Cycle</p>
          <p className="text-sm font-bold">Next renewal: May 15, 2026</p>
          <p className="text-[10px] text-muted-foreground mt-1">Enterprise Plan · $499/mo</p>
          <Button variant="outline" className="w-full mt-4" size="sm">Manage Plan</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-4">Credit Logs</h3>
        <div className="space-y-3">
          {[
            { date: "2026-04-28", desc: "Agent Run: Market Analyzer", amount: -15, user: "Alex R." },
            { date: "2026-04-27", desc: "Manual Top Up", amount: 5000, user: "Admin" },
            { date: "2026-04-26", desc: "Agent Run: Customer Support", amount: -8, user: "Jamie C." },
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between text-xs border-b pb-2 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{log.desc}</p>
                <p className="text-[10px] text-muted-foreground">{log.date} · {log.user}</p>
              </div>
              <p className={cn("font-bold", log.amount > 0 ? "text-green-500" : "text-foreground")}>
                {log.amount > 0 ? "+" : ""}{log.amount}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const { team, loading, error, actions } = useTeam(params.id);
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "agents" | "billing" | "activity" | "settings">("overview");

  if (loading) return (
    <div className="flex h-screen items-center justify-center pt-20">
      <Spinner size={32} />
    </div>
  );

  if (error || !team) return (
    <div className="flex h-screen flex-col items-center justify-center pt-20 space-y-4">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-xl font-bold">Failed to load team</h2>
      <p className="text-muted-foreground">{error || "Team not found."}</p>
      <Link href="/team">
        <Button variant="outline">Back to Teams</Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="border-b bg-card/60 backdrop-blur sticky top-20 z-10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold shadow-sm", team.avatar_color)}>
                {team.avatar_letter}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-extrabold tracking-tight">{team.name}</h1>
                  <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 uppercase text-[10px] font-bold">
                    {team.plan}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground max-w-md">{team.description}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => actions.refresh()}>
                <Clock className="h-4 w-4" /> Refresh
              </Button>
              <Button size="sm" className="gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" /> New Agent
              </Button>
            </div>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "members", label: "Members", icon: Users },
              { id: "agents", label: "Agents", icon: Bot },
              { id: "billing", label: "Billing", icon: CreditCard },
              { id: "activity", label: "Activity", icon: Activity },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === t.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {activeTab === "overview" && <OverviewTab team={team} />}
        {activeTab === "members" && <MembersTab team={team} actions={actions} />}
        {activeTab === "billing" && <BillingTab team={team} actions={actions} />}
        {/* Others can be added or mapped similarly */}
        {activeTab === "agents" && <div className="text-center py-20 text-muted-foreground">Shared Agents view coming soon...</div>}
        {activeTab === "activity" && <div className="text-center py-20 text-muted-foreground">Activity logs view coming soon...</div>}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-bold mb-4">Security Policies</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Enforce Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">All members must enable 2FA to access team resources.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={team.settings.two_factor_required} 
                  onChange={(e) => actions.toggle2FA(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 shadow-sm">
              <h3 className="font-bold text-red-600 mb-2">Danger Zone</h3>
              <p className="text-xs text-red-600/80 mb-4">Transfer ownership or permanently delete this workspace.</p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="text-red-600 border-red-200">Transfer</Button>
                <Button variant="destructive" size="sm">Delete Workspace</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
