"use client";

import { useState } from "react";
import { Search, Bell, Sun, Moon, LogOut, User, Settings, ChevronDown, CheckCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverBody,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { useUserCredits } from "@/lib/queries";

const MOCK_NOTIFICATIONS = [
  { id: "1", text: "AutoCoder Pro run completed", time: "2m ago", read: false },
  { id: "2", text: "New user subscribed to DataInsight AI", time: "18m ago", read: false },
  { id: "3", text: "Monthly revenue report ready", time: "1h ago", read: true },
  { id: "4", text: "ResearchBot execution failed", time: "3h ago", read: true },
];

export function DashboardTopbar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const { data: creditsData } = useUserCredits();

  const unread = notifications.filter((n) => !n.read).length;
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur px-5 gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents, logs, APIs…"
          className="pl-8 h-8 text-sm bg-muted/40 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-1">
        {/* Credits badge */}
        <button
          type="button"
          title="Your credit balance"
          onClick={() => router.push("/dashboard/settings")}
          className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Zap className="h-3 w-3" />
          {creditsData !== undefined ? creditsData.credits : "—"}
        </button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications — Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
            <PopoverHeader>
              <div className="flex items-center justify-between">
                <PopoverTitle>Notifications</PopoverTitle>
                {unread > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{unread} new</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={markAllRead}
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </PopoverHeader>
            <PopoverBody className="p-0 max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                    )
                  }
                >
                  <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">{n.text}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{n.time}</p>
                  </div>
                </div>
              ))}
            </PopoverBody>
          </PopoverContent>
        </Popover>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm max-w-[100px] truncate hidden sm:block">
                {user?.username ?? user?.email ?? "Account"}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 border-b">
              <p className="text-xs font-medium truncate">{user?.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{(user?.role ?? "user").toLowerCase()} account</p>
            </div>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
