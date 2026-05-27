"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Spinner } from "@/components/ui/spinner-1";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace("/auth/login");
    } else if (user.role === "CREATOR") {
      router.replace("/dashboard/creator");
    } else {
      router.replace("/dashboard/user");
    }
  }, [user, router]);

  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <Spinner size={32} color="hsl(var(--primary))" />
    </div>
  );
}
