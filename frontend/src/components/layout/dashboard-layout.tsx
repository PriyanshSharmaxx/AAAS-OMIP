"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] pt-16">

      {/* ── Desktop sidebar — sticky, full height, self-manages collapse ── */}
      {isDesktop && (
        <div className="hidden md:flex h-[calc(100vh-4rem)] sticky top-16 shrink-0">
          <Sidebar />
        </div>
      )}

      {/* ── Mobile sidebar overlay ── */}
      {!isDesktop && mobileOpen && (
        <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal aria-label="Navigation menu">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          {/* Panel */}
          <div className="relative z-50 flex h-full">
            {/* forceOpen keeps it always expanded on mobile */}
            <Sidebar forceOpen />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Sticky topbar row */}
        <div className="sticky top-16 z-30">
          {/* Mobile: hamburger row above the topbar */}
          {!isDesktop && (
            <div className="flex items-center gap-2 bg-[var(--ds-surface-container)] px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-sidebar"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <span className="text-sm font-medium text-muted-foreground">Menu</span>
            </div>
          )}
          <DashboardTopbar />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>

      </div>
    </div>
  );
}
