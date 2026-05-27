"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@/lib/queries";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, Zap } from "lucide-react";
import { BackgroundGrid } from "@/components/ui/background-grid";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useLogin();
  const { login: storeLogin } = useAuthStore();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // ── Real auth ────────────────────────────────────────────────────────

    try {
      setLoading(true);
      // Backend returns: { success: true, data: { token, user } }
      const res = await login.mutateAsync({ email: email.trim().toLowerCase(), password });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = (res as any)?.data ?? res;
      const token = payload.token ?? payload.access_token;
      const role  = payload.user?.role ?? payload.role ?? "USER";
      storeLogin(token, "", { email: email.trim().toLowerCase(), role });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError("Cannot reach the server. Please check your connection.");
        return;
      }
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isPending = login.isPending;

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-24">
      <BackgroundGrid opacity={0.4} fade />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Omip account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
