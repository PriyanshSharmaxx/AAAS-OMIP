"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, Plus, Search, ChevronRight, 
  Shield, CreditCard, LayoutGrid, List,
  TrendingUp, Bot, ArrowRight, Zap, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner-1";

interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  plan: string;
  memberCount: number;
  credits: number;
  role: string;
}

export default function TeamsListPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>("/teams");
        const mapped = (res.data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          plan: t.credits > 1000 ? "Enterprise" : "Pro",
          memberCount: t.members?.length || 0,
          credits: t.credits || 0,
          role: "Owner" // Simplified
        }));
        setTeams(mapped);
      } catch (err) {
        console.error("Failed to fetch teams", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeams();
  }, []);

  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Your Workspaces</h1>
            <p className="text-muted-foreground mt-1 text-sm">Collaborate with your team on shared agents and resources.</p>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Create Workspace
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search workspaces..." 
              className="pl-10 h-10 bg-card/50" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-card rounded-lg border p-1 shadow-sm">
            <button 
              onClick={() => setView("grid")}
              className={cn("p-1.5 rounded-md transition-colors", view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setView("list")}
              className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border rounded-2xl bg-card/30 border-dashed">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold text-muted-foreground">No workspaces found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Create a new workspace to start collaborating.</p>
            <Button variant="outline" className="mt-6" onClick={() => {}}>Create First Workspace</Button>
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((team) => (
              <Link key={team.id} href={`/team/${team.id}`}>
                <div className="group relative rounded-2xl border bg-card p-6 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 font-bold text-xl">
                      {team.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{team.name}</h3>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{team.role}</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 h-10">
                    {team.description || "No description provided for this workspace."}
                  </p>

                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Members</p>
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" /> {team.memberCount}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Credits</p>
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> {team.credits.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold">Workspace</th>
                  <th className="px-6 py-4 font-bold">Plan</th>
                  <th className="px-6 py-4 font-bold">Members</th>
                  <th className="px-6 py-4 font-bold">Credits</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((team) => (
                  <tr key={team.id} className="hover:bg-muted/10 group transition-colors cursor-pointer" onClick={() => window.location.href=`/team/${team.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 font-bold">
                          {team.name[0]}
                        </div>
                        <div>
                          <p className="font-bold">{team.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{team.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 border-none font-bold text-[10px]">{team.plan}</Badge>
                    </td>
                    <td className="px-6 py-4 font-medium">{team.memberCount} members</td>
                    <td className="px-6 py-4 font-bold">{team.credits.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Quick Help / Education */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Shield, title: "Enterprise Security", text: "Enforce 2FA and manage role permissions across your entire workspace." },
            { icon: Zap, title: "Shared Resources", text: "Run agents using a common credit pool and share results with your team." },
            { icon: Star, title: "Collaborative ID", text: "Build, version, and deploy agents together in a unified workspace." }
          ].map((item, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-card/40 border border-transparent hover:border-border transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
