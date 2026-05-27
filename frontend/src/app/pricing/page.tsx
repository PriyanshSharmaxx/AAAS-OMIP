"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackgroundGrid } from "@/components/ui/background-grid";
import { useBillingOverview } from "@/hooks/useBilling";
import {
  Check,
  CreditCard,
  Receipt,
  Sparkles,
  Wallet,
  Loader2,
  Clock3,
  ArrowRight,
  BarChart3,
} from "lucide-react";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function statusTone(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "canceling":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "grace_period":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "expired":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  }
}

export default function PricingPage() {
  const {
    plans,
    status,
    creatorSummary,
    loading,
    actionLoading,
    error,
    refresh,
    subscribeToPlan,
    cancelSubscription,
    topupCredits,
    isAuthenticated,
  } = useBillingOverview();

  const currentPlanId = status?.subscription?.plan.id ?? status?.effectivePlan.id ?? null;

  return (
    <div className="relative overflow-hidden">
      <BackgroundGrid opacity={0.35} fade />

      <div className="relative container mx-auto max-w-6xl px-4 py-20 space-y-10">
        <section className="rounded-[32px] border bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-8 shadow-sm dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Production Billing
              </Badge>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Stable monetization for Omip</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Subscription tiers, per-run billing, API marketplace monetization, creator revenue,
                  invoices, receipts, cancellation handling, and quota visibility now live in one place.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="min-w-[160px] border-white/60 bg-white/80 dark:border-white/10 dark:bg-white/5">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Current plan</p>
                  <p className="mt-1 text-lg font-semibold">{status?.effectivePlan.name ?? "Free"}</p>
                </CardContent>
              </Card>
              <Card className="min-w-[160px] border-white/60 bg-white/80 dark:border-white/10 dark:bg-white/5">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Credits</p>
                  <p className="mt-1 text-lg font-semibold">{status?.quotas.credits.remaining ?? "N/A"}</p>
                </CardContent>
              </Card>
              <Card className="min-w-[160px] border-white/60 bg-white/80 dark:border-white/10 dark:bg-white/5">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Invoices</p>
                  <p className="mt-1 text-lg font-semibold">{status?.invoices.length ?? 0}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {isAuthenticated && status && (
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="rounded-3xl">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl">Billing Status</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track subscription lifecycle, entitlements, and platform wallet usage.
                  </p>
                </div>
                <Badge variant="outline" className={statusTone(status.lifecycle.status)}>
                  {status.lifecycle.status.replace("_", " ")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="mt-1 text-lg font-semibold">{status.effectivePlan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(status.effectivePlan.price)} / {status.effectivePlan.interval}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs text-muted-foreground">Period end</p>
                    <p className="mt-1 text-lg font-semibold">
                      {status.lifecycle.currentPeriodEnd
                        ? new Date(status.lifecycle.currentPeriodEnd).toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {status.lifecycle.cancelAtPeriodEnd ? "Cancellation scheduled" : "Auto-renewing"}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs text-muted-foreground">Credits remaining</p>
                    <p className="mt-1 text-lg font-semibold">{status.quotas.credits.remaining}</p>
                    <p className="text-xs text-muted-foreground">
                      {status.quotas.credits.includedPerPeriod} included this period
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Agents",
                      value: `${status.quotas.agents.used}${status.quotas.agents.limit != null ? ` / ${status.quotas.agents.limit}` : ""}`,
                    },
                    {
                      label: "Runs",
                      value: `${status.quotas.runs.used}${status.quotas.runs.limit != null ? ` / ${status.quotas.runs.limit}` : ""}`,
                    },
                    {
                      label: "API Calls",
                      value: `${status.quotas.apiCalls.used}${status.quotas.apiCalls.limit != null ? ` / ${status.quotas.apiCalls.limit}` : ""}`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {[100, 500].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      className="gap-2"
                      onClick={() => topupCredits(amount)}
                      disabled={actionLoading === `topup:${amount}`}
                    >
                      {actionLoading === `topup:${amount}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wallet className="h-4 w-4" />
                      )}
                      Top up {amount} credits
                    </Button>
                  ))}
                  {status.subscription && !status.lifecycle.cancelAtPeriodEnd && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => cancelSubscription()}
                      disabled={actionLoading === "cancel"}
                    >
                      {actionLoading === "cancel" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Clock3 className="h-4 w-4" />
                      )}
                      Cancel at period end
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => refresh()}>
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl">Invoices & Receipts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {status.invoices.length === 0 && (
                  <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                    No invoices yet. Subscription purchases, top-ups, agent usage, and API billing will appear here.
                  </div>
                )}

                {status.invoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{invoice.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(invoice.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{invoice.status}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{invoice.currency}</p>
                      <p className="text-lg font-semibold">{money(invoice.amount)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Subscription tiers</h2>
              <p className="text-sm text-muted-foreground">
                Plans are now tied to quotas, credits, cancellations, receipts, and creator monetization.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {loading && plans.length === 0 && Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="rounded-3xl">
                <CardContent className="p-6">
                  <div className="h-6 w-24 rounded bg-muted" />
                  <div className="mt-3 h-10 w-32 rounded bg-muted" />
                  <div className="mt-6 space-y-2">
                    <div className="h-4 rounded bg-muted" />
                    <div className="h-4 rounded bg-muted" />
                    <div className="h-4 rounded bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {plans.map((plan) => {
              const isCurrent = currentPlanId === plan.id;
              const isBusy = actionLoading === `subscribe:${plan.id}`;

              return (
                <Card
                  key={plan.id}
                  className={`rounded-3xl border-2 ${isCurrent ? "border-primary shadow-lg shadow-primary/10" : "border-border"}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      {isCurrent && <Badge>Current</Badge>}
                    </div>
                    <div className="pt-3">
                      <p className="text-4xl font-bold">{money(plan.price)}</p>
                      <p className="text-sm text-muted-foreground">per {plan.interval}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      {plan.displayFeatures.map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full gap-2"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={!isAuthenticated || isCurrent || isBusy}
                      onClick={() => subscribeToPlan(plan.id)}
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {isCurrent ? "Active plan" : "Choose plan"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {creatorSummary && (
          <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl">Creator Revenue</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Revenue tracking is now tied to billable runs, subscriptions, and pending payouts.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Gross revenue", value: money(creatorSummary.totals.grossRevenue) },
                  { label: "Net payout", value: money(creatorSummary.totals.netRevenue) },
                  { label: "Pending payouts", value: money(creatorSummary.totals.pendingPayouts) },
                  { label: "Subscribers", value: creatorSummary.totals.subscriptions.toLocaleString() },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl">Payout Timeline</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Recent payout activity derived from billable marketplace and API revenue.
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                {creatorSummary.payouts.length === 0 && (
                  <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                    Creator payouts will appear here as your paid agents and APIs generate revenue.
                  </div>
                )}
                {creatorSummary.payouts.slice(0, 6).map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between rounded-2xl border p-4">
                    <div>
                      <p className="font-medium">{payout.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payout.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold">{money(payout.amount)}</p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
