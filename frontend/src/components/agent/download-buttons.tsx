"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Terminal,
  Container,
  AppWindow,
  Download,
  Lock,
  CreditCard,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OS = "windows" | "macos" | "linux";
/** "subscription" is treated identically to "paid" (requires subscription). */
type Pricing = "free" | "paid" | "subscription";
type DownloadFormat = "cli" | "docker";

interface DownloadButtonsProps {
  agentId: string;
  agentName: string;
  /** Pricing tier from the agent record. Defaults to "free" when absent. */
  pricing?: Pricing;
}

interface DownloadState {
  cli: "idle" | "loading" | "done" | "error";
  docker: "idle" | "loading" | "done" | "error";
}

// ---------------------------------------------------------------------------
// OS Detection
// ---------------------------------------------------------------------------

function detectOS(): OS {
  if (typeof window === "undefined") return "windows";
  const p = navigator.platform.toLowerCase();
  if (p.startsWith("win")) return "windows";
  if (p.startsWith("mac")) return "macos";
  return "linux";
}

const OS_LABELS: Record<OS, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("omip-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

async function triggerFileDownload(
  agentId: string,
  agentName: string,
  format: DownloadFormat,
  os: OS,
): Promise<void> {
  const token = getAuthToken();
  const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/agents/${agentId}/download/${format}?os=${os}`;

  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new ApiError(response.status, body.message ?? "Download failed");
    throw err;
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = agentName.toLowerCase().replace(/\s+/g, "-");
  link.href = objectUrl;
  link.download = `${slug}-${format}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DownloadOptionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: React.ReactNode;
  action: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}

function DownloadOption({
  icon,
  label,
  description,
  badge,
  action,
  disabled = false,
  tooltip,
}: DownloadOptionProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
        disabled
          ? "border-border/50 bg-muted/30 opacity-60"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{label}</span>
              {badge}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {tooltip && (
          <span title={tooltip} className="mt-1 cursor-help text-muted-foreground/60">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div>{action}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DownloadButtons({
  agentId,
  agentName,
  pricing = "free",
}: DownloadButtonsProps) {
  const [os, setOs] = useState<OS>("windows");
  const [mounted, setMounted] = useState(false);
  const [downloadState, setDownloadState] = useState<DownloadState>({
    cli: "idle",
    docker: "idle",
  });
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<DownloadFormat | null>(null);

  // Detect OS on mount
  useEffect(() => {
    setOs(detectOS());
    setMounted(true);
  }, []);

  const isPaid = pricing === "paid" || pricing === "subscription";

  const handleDownload = useCallback(
    async (format: DownloadFormat) => {
      // Check auth
      if (!getAuthToken()) {
        setSubscribeModalOpen(true);
        setPendingFormat(format);
        return;
      }

      setDownloadState((prev) => ({ ...prev, [format]: "loading" }));

      try {
        await triggerFileDownload(agentId, agentName, format, os);
        setDownloadState((prev) => ({ ...prev, [format]: "done" }));
        // Reset to idle after 3s
        setTimeout(
          () => setDownloadState((prev) => ({ ...prev, [format]: "idle" })),
          3000,
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          // Subscription required
          setSubscribeModalOpen(true);
          setPendingFormat(format);
        }
        setDownloadState((prev) => ({ ...prev, [format]: "error" }));
        setTimeout(
          () => setDownloadState((prev) => ({ ...prev, [format]: "idle" })),
          3000,
        );
      }
    },
    [agentId, agentName, os],
  );

  // ---------------------------------------------------------------------------
  // Button states
  // ---------------------------------------------------------------------------

  function CliButton() {
    const state = downloadState.cli;

    if (isPaid) {
      return (
        <Button
          size="sm"
          variant="default"
          className="w-full gap-2"
          onClick={() => {
            setSubscribeModalOpen(true);
            setPendingFormat("cli");
          }}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Subscribe to Download
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="default"
        className="w-full gap-2"
        disabled={state === "loading"}
        onClick={() => handleDownload("cli")}
      >
        {state === "loading" ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading…</>
        ) : state === "done" ? (
          <><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Downloaded</>
        ) : state === "error" ? (
          <><Download className="h-3.5 w-3.5" /> Retry Download</>
        ) : (
          <><Download className="h-3.5 w-3.5" /> Download Agent</>
        )}
      </Button>
    );
  }

  function DockerButton() {
    const state = downloadState.docker;

    if (isPaid) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            setSubscribeModalOpen(true);
            setPendingFormat("docker");
          }}
        >
          <Lock className="h-3.5 w-3.5" />
          Subscribe to Download
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        disabled={state === "loading"}
        onClick={() => handleDownload("docker")}
      >
        {state === "loading" ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading…</>
        ) : state === "done" ? (
          <><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> Downloaded</>
        ) : state === "error" ? (
          <><Download className="h-3.5 w-3.5" /> Retry</>
        ) : (
          <><Container className="h-3.5 w-3.5" /> Download Docker</>
        )}
      </Button>
    );
  }

  // ---------------------------------------------------------------------------
  // Per-OS content (same options, different OS label used for analytics)
  // ---------------------------------------------------------------------------

  function OsDownloadContent({ currentOs }: { currentOs: OS }) {
    return (
      <div className="mt-4 flex flex-col gap-3">
        {/* CLI — PRIMARY */}
        <DownloadOption
          icon={<Terminal className="h-4 w-4" />}
          label="CLI"
          description={
            isPaid
              ? "Run agent via AaaS CLI with your subscription API key."
              : "Recommended. Run directly with the AaaS CLI."
          }
          badge={
            !isPaid ? (
              <Badge className="bg-primary/15 px-1.5 py-0 text-[10px] text-primary">
                Recommended
              </Badge>
            ) : (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                Subscription
              </Badge>
            )
          }
          tooltip={
            isPaid
              ? "Thin client — all execution happens securely on the AaaS platform."
              : "Includes agent.json + README. Requires the AaaS CLI (npx aas-agent)."
          }
          action={<CliButton />}
        />

        {/* Docker */}
        <DownloadOption
          icon={<Container className="h-4 w-4" />}
          label="Docker"
          description="For developers. Run agent in an isolated container."
          tooltip="Includes Dockerfile, agent.json, and run.sh."
          action={<DockerButton />}
        />

        {/* Executable — Coming Soon */}
        <DownloadOption
          icon={<AppWindow className="h-4 w-4" />}
          label={`App (.${currentOs === "windows" ? "exe" : currentOs === "macos" ? "app" : "AppImage"})`}
          description="Native desktop application. One-click install, no CLI needed."
          badge={
            <Badge
              variant="outline"
              className="border-orange-500/40 px-1.5 py-0 text-[10px] text-orange-500"
            >
              Coming Soon
            </Badge>
          }
          disabled
          action={
            <Button
              size="sm"
              variant="outline"
              className="w-full cursor-not-allowed opacity-50"
              disabled
            >
              <AppWindow className="mr-1.5 h-3.5 w-3.5" />
              Coming Soon
            </Button>
          }
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Download Options
            </CardTitle>
            {isPaid && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="mr-1 h-3 w-3" />
                Paid Agent
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isPaid
              ? "Subscribe to download and run this agent locally on your device."
              : "Run this agent locally on your device. Choose your platform and format."}
          </p>
        </CardHeader>

        <CardContent>
          {mounted ? (
            <Tabs
              value={os}
              onValueChange={(v) => setOs(v as OS)}
              className="w-full"
            >
              <TabsList className="w-full">
                {(["windows", "macos", "linux"] as OS[]).map((tabOs) => (
                  <TabsTrigger
                    key={tabOs}
                    value={tabOs}
                    className="flex-1 text-xs"
                  >
                    {OS_LABELS[tabOs]}
                    {tabOs === detectOS() && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {(["windows", "macos", "linux"] as OS[]).map((tabOs) => (
                <TabsContent key={tabOs} value={tabOs} className="mt-0">
                  <OsDownloadContent currentOs={tabOs} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            // SSR placeholder — avoid hydration mismatch
            <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
          )}
        </CardContent>
      </Card>

      {/* Subscription required modal */}
      <Dialog open={subscribeModalOpen} onOpenChange={setSubscribeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Subscription Required
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{agentName}</span> is
              a paid agent. Subscribe to download and run it locally.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">What you get with a subscription:</p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  Download CLI bundle for local execution
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  Download Docker package for container deployment
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  API key for secure backend execution
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSubscribeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  setSubscribeModalOpen(false);
                  // Navigate to marketplace listing for this agent
                  window.location.href = `/explore?agent=${agentId}&subscribe=1`;
                }}
              >
                <ExternalLink className="h-4 w-4" />
                View Subscription
              </Button>
            </div>

            {pendingFormat && (
              <p className="text-center text-xs text-muted-foreground">
                After subscribing, return here to download the{" "}
                {pendingFormat === "cli" ? "CLI bundle" : "Docker package"}.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
