"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Play, Bot, Boxes,
  BarChart2, History, Bookmark, DollarSign,
  Cpu, Rocket, Activity, Settings,
  ChevronLeft, ChevronRight, GitBranch, Store,
  GitCommit, Users, Bell, Trophy, CalendarClock, KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

// ── Nav definitions ────────────────────────────────────────────────────────

const COMMON_ITEMS = [
  { href: "/dashboard/user",      label: "Overview",       icon: LayoutDashboard, roles: ["USER"] },
  { href: "/dashboard/creator",   label: "Overview",       icon: LayoutDashboard, roles: ["CREATOR"] },
  { href: "/dashboard/agents",    label: "Agents",         icon: Bot,             roles: ["USER", "CREATOR"] },
  { href: "/dashboard/runs",      label: "Activity",       icon: Play,            roles: ["USER", "CREATOR"] },
  { href: "/agent-space",         label: "Agent Space",    icon: Boxes,           roles: ["USER", "CREATOR"] },
  { href: "/collaboration",       label: "Automation",  icon: GitBranch,       roles: ["USER", "CREATOR"] },
  { href: "/api-marketplace",     label: "API Marketplace",icon: Store,           roles: ["USER", "CREATOR"] },
  { href: "/dashboard/api-keys",  label: "API Keys",       icon: KeyRound,        roles: ["USER", "CREATOR"] },
  { href: "/dashboard/versioning",label: "Version Control",icon: GitCommit,       roles: ["USER", "CREATOR"] },
  { href: "/team",                label: "Team",           icon: Users,           roles: ["USER", "CREATOR"] },
  { href: "/schedule",            label: "Schedules",      icon: CalendarClock,   roles: ["USER", "CREATOR"] },
  { href: "/leaderboard",         label: "Leaderboard",    icon: Trophy,          roles: ["USER", "CREATOR"] },
  { href: "/notifications",       label: "Notifications",  icon: Bell,            roles: ["USER", "CREATOR"] },
  { href: "/dashboard/analytics", label: "Analytics",      icon: BarChart2,       roles: ["USER", "CREATOR"] },
  { href: "/dashboard/settings",  label: "Settings",       icon: Settings,        roles: ["USER", "CREATOR"] },
];

const USER_ITEMS = [
  { href: "/dashboard/usage",   label: "My Usage",     icon: Activity },
  { href: "/dashboard/saved",   label: "Saved Agents", icon: Bookmark },
  { href: "/dashboard/history", label: "History",      icon: History },
];

const CREATOR_ITEMS = [
  { href: "/dashboard/my-agents",   label: "My Agents",  icon: Bot },
  { href: "/dashboard/revenue",     label: "Revenue",    icon: DollarSign },
  { href: "/dashboard/api-usage",   label: "API Usage",  icon: Cpu },
  { href: "/dashboard/deployments", label: "Deployments",icon: Rocket },
];

// ── Active-link helper ─────────────────────────────────────────────────────

const EXACT_MATCH = new Set(["/dashboard/user", "/dashboard/creator", "/agent-space"]);

function isActive(pathname: string, href: string) {
  return EXACT_MATCH.has(href) ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

// ── Single nav item ────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  pathname: string;
}

function NavItem({ href, label, icon: Icon, collapsed, pathname: path }: NavItemProps) {
  const active = isActive(path, href);
  return (
    <div className={cn("group/tip relative", collapsed && "flex justify-center")}>
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
          "transition-colors duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          collapsed ? "w-10 justify-center px-0" : "w-full",
          active
            ? "bg-[var(--ds-surface-container-highest)] text-primary dark:text-[#ADC6FF]"
            : "text-muted-foreground hover:bg-[var(--ds-surface-container-high)] hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>

      {/* Tooltip shown only when collapsed */}
      {collapsed && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2",
            "whitespace-nowrap rounded-md bg-[var(--ds-surface-container-highest)] px-2.5 py-1.5 text-xs font-medium shadow-md",
            "opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// ── Section divider — tonal shift, no hard line ────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-2 mx-3 h-px bg-[var(--ds-surface-container-high)] opacity-60" aria-hidden />;
  }
  return (
    <div className="my-3 px-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </p>
    </div>
  );
}

// ── Collapse toggle button ─────────────────────────────────────────────────

function CollapseToggle({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className={cn(
        "absolute -right-3 top-6 z-10",
        "flex h-6 w-6 items-center justify-center rounded-full",
        "bg-[var(--ds-surface-container-highest)] text-muted-foreground shadow-sm",
        "hover:text-foreground",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {collapsed ? (
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "omip-sidebar-collapsed";

interface SidebarProps {
  /** Controlled mode — pass from DashboardLayout for mobile overlay */
  forceOpen?: boolean;
}

export function Sidebar({ forceOpen }: SidebarProps) {
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);
  const role     = user?.role ?? "USER";
  const isCreator = role === "CREATOR";

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "[" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const isCollapsed = forceOpen ? false : collapsed;

  const commonItems = COMMON_ITEMS.filter((item) => item.roles.includes(role));
  const roleItems   = isCreator ? CREATOR_ITEMS : USER_ITEMS;
  const roleLabel   = isCreator ? "Creator Tools" : "My Space";
  const accountLabel = isCreator ? "Creator Account" : "User Account";

  return (
    <aside
      data-collapsed={isCollapsed}
      className={cn(
        /* No border-r — tonal shift from page bg (#131313) to sidebar bg (#201F1F) creates separation */
        "group/sidebar relative flex flex-col bg-[var(--ds-surface-container)]",
        "h-full transition-all duration-200 ease-in-out",
        isCollapsed ? "w-16" : "w-60",
      )}
      aria-label="Dashboard navigation"
    >
      {!forceOpen && (
        <CollapseToggle collapsed={isCollapsed} onClick={toggle} />
      )}

      {/* Header — tonal bg separates from nav body, no border */}
      <div className={cn(
        "bg-[var(--ds-surface-container)] overflow-hidden",
        isCollapsed ? "px-0 py-4" : "px-5 py-5",
      )}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
              isCreator ? "bg-purple-500/15 text-purple-500" : "bg-primary/15 text-primary",
            )}>
              {isCreator ? "C" : "U"}
            </div>
          </div>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {isCreator ? "Creator Studio" : "User Dashboard"}
          </p>
        )}
        {/* Tonal separator — lighter surface strip, no hard line */}
        <div className="mt-3 h-px bg-[var(--ds-surface-container-high)] opacity-50" />
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-3",
          isCollapsed ? "px-3" : "px-3",
        )}
        aria-label="Main navigation"
      >
        {commonItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={isCollapsed}
            pathname={pathname}
          />
        ))}

        <SectionLabel label={roleLabel} collapsed={isCollapsed} />

        {roleItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={isCollapsed}
            pathname={pathname}
          />
        ))}
      </nav>

      {/* Account badge — tonal separator, no border-t */}
      <div className={cn(isCollapsed ? "px-3 py-4" : "px-4 py-4")}>
        <div className="mb-3 h-px bg-[var(--ds-surface-container-high)] opacity-50" />
        {isCollapsed ? (
          <div className="group/tip relative flex justify-center">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
              isCreator ? "bg-purple-500/15 text-purple-500" : "bg-primary/15 text-primary",
            )}>
              {isCreator ? "C" : "U"}
            </div>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--ds-surface-container-highest)] px-2.5 py-1.5 text-xs font-medium shadow-md opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100"
            >
              {accountLabel}
            </span>
          </div>
        ) : (
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
            isCreator ? "bg-purple-500/10 text-purple-500" : "bg-primary/10 text-primary",
          )}>
            <div className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              isCreator ? "bg-purple-400" : "bg-primary",
            )} />
            {accountLabel}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <p className="px-5 pb-3 text-[10px] text-muted-foreground/40 select-none">
          Press <kbd className="font-mono">[</kbd> to collapse
        </p>
      )}
    </aside>
  );
}
