"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSignup } from "@/lib/queries";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, User, Wrench, ArrowLeft } from "lucide-react";
import { BackgroundGrid } from "@/components/ui/background-grid";

type Role = "USER" | "CREATOR";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"role" | "form">("role");
  const [role, setRole] = useState<Role>("USER");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [expertise, setExpertise] = useState("");
  const [error, setError] = useState("");
  const signup = useSignup();
  const { login: storeLogin } = useAuthStore();

  const selectRole = (r: Role) => {
    setRole(r);
    setStep("form");
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // ── Real auth ────────────────────────────────────────────────────────

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      const payload: Parameters<typeof signup.mutateAsync>[0] = {
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
        role,
      };
      if (role === "CREATOR") {
        if (organization) payload.organization = organization;
        if (expertise) payload.expertise = expertise;
      }
      const res = await signup.mutateAsync(payload);
      // Backend returns: { success: true, data: { token, user } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inner = (res as any)?.data ?? res;
      const token = inner.token ?? inner.access_token;
      const confirmedRole = inner.user?.role ?? inner.role ?? role;
      storeLogin(token, "", { email: email.trim().toLowerCase(), username: username.trim(), role: confirmedRole });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError("Cannot reach the server. Please check your connection or try again later.");
        return;
      }
      const status = (err as { status?: number }).status;
      if (status === 409) {
        const msg = (err as Error).message ?? "";
        if (msg.toLowerCase().includes("username")) {
          setError("This username is already taken. Please choose another.");
        } else {
          setError("An account with this email already exists. Try signing in.");
        }
        return;
      }
      if (status === 500) {
        setError("Server error. Please try again in a moment.");
        return;
      }
      setError((err as Error).message || "Could not create account. Please try again.");
    }
  };

  /* ---- Step 1: Role Selection ---- */
  if (step === "role") {
    return (
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-24">
        <BackgroundGrid opacity={0.4} fade />
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Join Omip</h1>
            <p className="text-muted-foreground">
              How do you want to use the platform?
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* User Card */}
            <button
              type="button"
              onClick={() => selectRole("USER")}
              className="group rounded-xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">I want to use agents</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse, run, and manage AI agents built by creators.
              </p>
            </button>

            {/* Creator Card */}
            <button
              type="button"
              onClick={() => selectRole("CREATOR")}
              className="group rounded-xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">I want to build agents</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create, publish, and monetize your own AI agents.
              </p>
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  /* ---- Step 2: Signup Form ---- */
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-24">
      <BackgroundGrid opacity={0.4} fade />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <button
            type="button"
            onClick={() => setStep("role")}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground self-start"
          >
            <ArrowLeft className="h-4 w-4" /> Change role
          </button>
          <CardTitle className="text-2xl">
            {role === "CREATOR" ? "Creator Account" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {role === "CREATOR"
              ? "Set up your creator profile on Omip"
              : "Get started with Omip for free"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Real auth inputs */}
            <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
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

                {role === "CREATOR" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="organization">
                        Organization{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="organization"
                        placeholder="Acme Inc."
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expertise">
                        Expertise{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="expertise"
                        placeholder="e.g. NLP, Automation, Data Analysis"
                        value={expertise}
                        onChange={(e) => setExpertise(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

            <Button
              type="submit"
              className="w-full"
              disabled={signup.isPending}
            >
              {signup.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {role === "CREATOR"
                ? "Create Creator Account"
                : "Create Account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
