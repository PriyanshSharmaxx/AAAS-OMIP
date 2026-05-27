"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound, Copy, CheckCircle2, RefreshCw, Trash2,
  Activity, Clock, Star, Zap, AlertTriangle, Loader2,
  Plus, ExternalLink, BarChart2, TrendingUp,
} from "lucide-react";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useMyApiKeys,
  useRevokeApiKey,
  useRotateApiKey,
  useApiUsageStats,
} from "@/lib/queries";
import type { ApiKeyRecord } from "@/lib/types";

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={handle}
      title="Copy API key"
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied
        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        : <Copy className="h-3.5 w-3.5" />
      }
    </button>
  );
}

// ─── Pricing label ────────────────────────────────────────────────────────────

function PricingBadge({ pricingType, pricePerCall, priceMonthly }: {
  pricingType: string;
  pricePerCall: number | null;
  priceMonthly: number | null;
}) {
  if (pricingType === "free") {
    return <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-600 dark:text-green-400">Free</Badge>;
  }
  if (pricingType === "per_call" && pricePerCall != null) {
    return <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-600 dark:text-blue-400">${(pricePerCall / 100).toFixed(3)}/call</Badge>;
  }
  if (pricingType === "monthly" && priceMonthly != null) {
    return <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-600 dark:text-violet-400">${(priceMonthly / 100).toFixed(0)}/mo</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">{pricingType}</Badge>;
}

// ─── Confirm revoke dialog ────────────────────────────────────────────────────

function ConfirmRevokeDialog({
  keyRecord,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  keyRecord: ApiKeyRecord | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!keyRecord) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            This will permanently revoke your key for{" "}
            <strong>{keyRecord.apiProduct.name}</strong>. Any agents using this
            key will stop working. You can re-subscribe to get a new key.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Revoke Key
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Key card ─────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  "AI/ML": "🤖", "Data": "📊", "Communication": "💬", "Finance": "💰",
  "Search": "🔍", "Storage": "🗄️", "Analytics": "📈", "Security": "🔒",
  "Productivity": "⚡", "Media": "🎬", "general": "🔧",
};

interface KeyCardProps {
  record:    ApiKeyRecord;
  onRevoke:  (r: ApiKeyRecord) => void;
  onRotate:  (keyId: string) => void;
  rotating:  boolean;
}

function KeyCard({ record, onRevoke, onRotate, rotating }: KeyCardProps) {
  const [revealed, setRevealed] = useState(false);
  const icon = CATEGORY_ICONS[record.apiProduct.category] ?? "🔧";
  const maskedKey = `${record.key.slice(0, 12)}${"•".repeat(16)}`;

  const lastUsed = record.lastUsedAt
    ? new Date(record.lastUsedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "Never";

  return (
    <div className="rounded-xl border bg-card transition-all hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{record.apiProduct.name}</span>
            {record.apiProduct.isVerified && (
              <span title="Verified"><CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /></span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <PricingBadge
              pricingType={record.apiProduct.pricingType}
              pricePerCall={record.apiProduct.pricePerCall}
              priceMonthly={record.apiProduct.priceMonthly}
            />
            <Badge variant="secondary" className="text-[10px] capitalize">
              {record.apiProduct.category}
            </Badge>
          </div>
        </div>
        <Badge
          className={cn("text-[10px] shrink-0", record.isActive
            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
            : "bg-muted text-muted-foreground"
          )}
          variant="outline"
        >
          {record.isActive ? "Active" : "Revoked"}
        </Badge>
      </div>

      <Separator />

      {/* Key display */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30">
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <code className="flex-1 truncate text-[11px] font-mono text-muted-foreground">
          {revealed ? record.key : maskedKey}
        </code>
        <button
          onClick={() => setRevealed(!revealed)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
        >
          {revealed ? "Hide" : "Show"}
        </button>
        <CopyButton value={record.key} />
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid grid-cols-4 divide-x px-0">
        {[
          { icon: Activity, label: "Total Calls",  value: record.totalCalls.toLocaleString() },
          { icon: TrendingUp, label: "Last 30d",   value: record.usageLast30.toLocaleString() },
          { icon: Star,     label: "Rating",        value: record.apiProduct.rating.toFixed(1) },
          { icon: Clock,    label: "Last Used",      value: lastUsed },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center py-2.5 px-2 text-center">
            <Icon className="h-3 w-3 text-muted-foreground mb-0.5" />
            <p className="text-xs font-semibold">{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-2 p-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => onRotate(record.id)}
          disabled={rotating || !record.isActive}
        >
          {rotating
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />
          }
          Rotate Key
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
          onClick={() => onRevoke(record)}
          disabled={!record.isActive}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Revoke
        </Button>
      </div>
    </div>
  );
}

// ─── Usage summary ────────────────────────────────────────────────────────────

function UsageSummary() {
  const { data, isLoading } = useApiUsageStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="h-3 w-1/2 bg-muted rounded" />
            <div className="h-5 w-2/3 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const total   = data?.total ?? 0;
  const recent  = data?.recent ?? [];
  const byApi   = data?.byApi  ?? [];
  const last24h = recent.filter((r) =>
    new Date(r.createdAt) > new Date(Date.now() - 86_400_000)
  ).length;
  const success = recent.filter((r) => r.statusCode && r.statusCode < 400).length;
  const successRate = recent.length ? Math.round((success / recent.length) * 100) : 100;
  const avgLatency  = recent.length
    ? Math.round(recent.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / recent.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Activity,  label: "Total Calls",   value: total.toLocaleString(),    sub: "all time" },
          { icon: Zap,       label: "Last 24h",       value: last24h.toLocaleString(), sub: "calls" },
          { icon: CheckCircle2, label: "Success Rate", value: `${successRate}%`,        sub: "last 50 calls" },
          { icon: Clock,     label: "Avg Latency",    value: avgLatency > 0 ? `${avgLatency}ms` : "—", sub: "recent" },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Top APIs by usage */}
      {byApi.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4 text-muted-foreground" /> Top APIs by Usage
          </h3>
          <div className="space-y-2">
            {byApi.slice(0, 5).map((entry, i) => {
              const count = entry._count.id;
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={entry.apiId} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate">{entry.apiId.slice(0, 8)}…</span>
                      <span className="text-muted-foreground">{count.toLocaleString()} calls</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent calls */}
      {recent.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Recent API Calls</h3>
            <Badge variant="secondary" className="text-[10px]">Last 50</Badge>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y">
            {recent.slice(0, 20).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2">
                <span className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  entry.statusCode && entry.statusCode < 400 ? "bg-green-500" : "bg-red-500",
                )} />
                <code className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
                  {entry.endpoint}
                </code>
                <span className="text-[10px] text-muted-foreground">{entry.latencyMs ?? "—"}ms</span>
                <Badge
                  variant={entry.statusCode && entry.statusCode < 400 ? "secondary" : "destructive"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {entry.statusCode ?? "ERR"}
                </Badge>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const router = useRouter();
  const { data: keys = [], isLoading } = useMyApiKeys();
  const revokeMutation  = useRevokeApiKey();
  const rotateMutation  = useRotateApiKey();

  const [tab,           setTab]           = useState<"keys" | "usage">("keys");
  const [revokeTarget,  setRevokeTarget]  = useState<ApiKeyRecord | null>(null);
  const [revokeOpen,    setRevokeOpen]    = useState(false);
  const [rotatingId,    setRotatingId]    = useState<string | null>(null);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    await revokeMutation.mutateAsync(revokeTarget.id);
    setRevokeOpen(false);
    setRevokeTarget(null);
  };

  const handleRotate = async (keyId: string) => {
    setRotatingId(keyId);
    try {
      await rotateMutation.mutateAsync(keyId);
    } finally {
      setRotatingId(null);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your marketplace subscriptions and monitor API usage.
          </p>
        </div>
        <Button
          className="gap-1.5 shrink-0"
          onClick={() => router.push("/api-marketplace")}
        >
          <Plus className="h-4 w-4" />
          Browse APIs
        </Button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border bg-muted/30 p-1 w-fit">
        {(["keys", "usage"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors capitalize",
              tab === t
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "keys"  ? <KeyRound className="h-3.5 w-3.5" /> : <BarChart2 className="h-3.5 w-3.5" />}
            {t === "keys" ? `My Keys (${keys.length})` : "Usage"}
          </button>
        ))}
      </div>

      {/* ── Keys tab ── */}
      {tab === "keys" && (
        <>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card h-52" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <KeyRound className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">No API keys yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Subscribe to an API in the marketplace to get started.
                </p>
              </div>
              <Button onClick={() => router.push("/api-marketplace")} className="gap-1.5">
                <ExternalLink className="h-4 w-4" /> Browse API Marketplace
              </Button>
            </div>
          ) : (
            <>
              {/* Warning if any key is about to expire / high usage */}
              {keys.some((k) => k.usageLast30 > 1000) && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    High usage detected on some keys. Monitor your costs in the Usage tab.
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {keys.map((record) => (
                  <KeyCard
                    key={record.id}
                    record={record}
                    onRevoke={(r) => { setRevokeTarget(r); setRevokeOpen(true); }}
                    onRotate={handleRotate}
                    rotating={rotatingId === record.id}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Usage tab ── */}
      {tab === "usage" && <UsageSummary />}

      {/* ── Confirm revoke dialog ── */}
      <ConfirmRevokeDialog
        keyRecord={revokeTarget}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onConfirm={handleRevoke}
        loading={revokeMutation.isPending}
      />
    </div>
  );
}
