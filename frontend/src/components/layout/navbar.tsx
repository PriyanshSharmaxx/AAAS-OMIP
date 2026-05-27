"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Bot, Menu, Moon, Sun, X, LogOut, LayoutDashboard, User, Boxes } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/explore",          label: "Explore" },
  { href: "/collaboration",    label: "Automation" },
  { href: "/api-marketplace",  label: "API" },
  { href: "/leaderboard",      label: "Leaderboard" },
  { href: "/team",             label: "Team" },
  { href: "/agent-space",      label: "Agent Space" },
  { href: "/pricing",          label: "Pricing" },
  { href: "/docs",             label: "Docs" },
];

export function Navbar() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLanding = pathname === "/";

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full backdrop-blur-xl transition-colors duration-300",
        isLanding
          ? "bg-white/85 dark:bg-black/30"
          : "bg-[var(--ds-surface-container)]/90 backdrop-blur-md",
      )}
    >
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Bot className={isLanding ? "h-7 w-7 text-[#007AFF]" : "h-7 w-7 text-primary"} />
          <span
            className="text-xl font-bold bg-clip-text text-transparent"
            style={{
              backgroundImage: isLanding
                ? "linear-gradient(135deg, #007AFF 0%, #34AADC 100%)"
                : undefined,
            }}
          >
            {isLanding ? (
              "Omip"
            ) : (
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Omip
              </span>
            )}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isLanding
                  ? cn(
                      "text-sm font-medium transition-colors",
                      "hover:text-gray-900 dark:hover:text-white",
                      pathname === link.href
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-white/45",
                    )
                  : cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      pathname === link.href ? "text-primary" : "text-muted-foreground",
                    )
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notification bell — only when authenticated */}
          {mounted && isAuthenticated && <NotificationBell />}

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className={isLanding ? "text-white/50 hover:text-white hover:bg-white/[0.08]" : ""}
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}

          {mounted && isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.username || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/dashboard">
                  <DropdownMenuItem>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                </Link>
                <Link href="/agent-space">
                  <DropdownMenuItem>
                    <Boxes className="mr-2 h-4 w-4" />
                    Agent Space
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/runs">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    My Runs
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : mounted ? (
            <div className="hidden gap-2 sm:flex">
              <Link href="/auth/login">
                {isLanding ? (
                  <button className="rounded-xl border border-black/[0.12] dark:border-white/[0.12] bg-black/[0.04] dark:bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-700 dark:text-white/60 backdrop-blur-sm transition-all hover:border-black/[0.20] dark:hover:border-white/[0.22] hover:text-gray-900 dark:hover:text-white">
                    Sign In
                  </button>
                ) : (
                  <Button variant="ghost" size="sm">Sign In</Button>
                )}
              </Link>
              <Link href="/auth/signup">
                {isLanding ? (
                  <button className="rounded-xl bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#006AE0] hover:shadow-[0_0_20px_rgba(0,122,255,0.4)]">
                    Get Started
                  </button>
                ) : (
                  <Button size="sm">Get Started</Button>
                )}
              </Link>
            </div>
          ) : null}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn("md:hidden", isLanding && "text-white/60 hover:text-white hover:bg-white/[0.08]")}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className={cn(
            "px-4 py-4 backdrop-blur-xl md:hidden transition-colors duration-300",
            isLanding
              ? "bg-white/95 dark:bg-black/60"
              : "bg-[var(--ds-surface-container)]",
          )}
        >
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  isLanding
                    ? "text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white"
                    : "text-muted-foreground hover:text-primary",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {mounted && !isAuthenticated && (
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  {isLanding ? (
                    <button className="w-full rounded-xl border border-black/[0.12] dark:border-white/[0.12] bg-black/[0.04] dark:bg-white/[0.04] py-2.5 text-sm font-medium text-gray-700 dark:text-white/60 transition-colors hover:text-gray-900 dark:hover:text-white">
                      Sign In
                    </button>
                  ) : (
                    <Button variant="outline" className="w-full">Sign In</Button>
                  )}
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileOpen(false)}>
                  {isLanding ? (
                    <button className="w-full rounded-xl bg-[#007AFF] py-2.5 text-sm font-semibold text-white">
                      Get Started
                    </button>
                  ) : (
                    <Button className="w-full">Get Started</Button>
                  )}
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
