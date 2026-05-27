/**
 * src/services/billing.service.ts
 *
 * Central billing domain for Omip.
 * Covers:
 * - platform subscription plans
 * - credit top-ups and wallet accounting
 * - usage-based charges for marketplace agent runs
 * - API provider billing and payouts
 * - invoices / receipts
 * - quotas, grace periods, and cancellation semantics
 */

import {
  Prisma,
  prisma,
  billingRepo,
  userRepo,
  invoiceRepo,
  payoutRepo,
  creditLogRepo,
} from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

const BILLING_CREDIT_PRICE_USD = 0.1;
const DEFAULT_GRACE_PERIOD_DAYS = 3;
const DEFAULT_PAYOUT_SHARE = 0.8;

type BillingPlanRecord = NonNullable<Awaited<ReturnType<typeof billingRepo.findPlanById>>>;
type BillingSubscriptionRecord = Awaited<ReturnType<typeof billingRepo.findSubscriptionByUser>>;

interface NormalizedPlanFeatures {
  maxAgents: number | null;
  monthlyCredits: number;
  maxRunsPerMonth: number | null;
  monthlyApiCalls: number | null;
  teamMembers: number | null;
  prioritySupport: boolean;
  support: string;
}

interface InvoiceLineInput {
  description: string;
  amount: number;
  quantity?: number;
}

function toMoney(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

function fromMoney(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function toDisplayFeatures(features: NormalizedPlanFeatures): string[] {
  const output: string[] = [];

  if (features.maxAgents != null) {
    output.push(`${features.maxAgents} agents`);
  } else {
    output.push("Unlimited agents");
  }

  if (features.monthlyCredits > 0) {
    output.push(`${features.monthlyCredits.toLocaleString()} monthly credits`);
  }

  if (features.maxRunsPerMonth != null) {
    output.push(`${features.maxRunsPerMonth.toLocaleString()} runs / month`);
  }

  if (features.monthlyApiCalls != null) {
    output.push(`${features.monthlyApiCalls.toLocaleString()} API calls / month`);
  }

  if (features.teamMembers != null) {
    output.push(`${features.teamMembers} team seats`);
  }

  output.push(features.prioritySupport ? "Priority support" : `${features.support} support`);
  return output;
}

function normalizePlanFeatures(raw: unknown): NormalizedPlanFeatures {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};

  const toNullableNumber = (input: unknown): number | null => {
    if (typeof input === "number" && Number.isFinite(input)) return input;
    return null;
  };

  const monthlyCredits = typeof value["monthlyCredits"] === "number"
    ? Math.max(0, Math.floor(value["monthlyCredits"]))
    : 0;

  return {
    maxAgents: toNullableNumber(value["maxAgents"]),
    monthlyCredits,
    maxRunsPerMonth: toNullableNumber(value["maxRunsPerMonth"]),
    monthlyApiCalls: toNullableNumber(value["monthlyApiCalls"]),
    teamMembers: toNullableNumber(value["teamMembers"]),
    prioritySupport: Boolean(value["prioritySupport"]) || value["support"] === "priority",
    support: typeof value["support"] === "string" ? value["support"] : "community",
  };
}

async function getFreePlan(): Promise<BillingPlanRecord> {
  const plan = await prisma.billingPlan.findFirst({
    where: { isActive: true, name: { equals: "Free", mode: "insensitive" } },
  });
  if (!plan) {
    throw new AppError("No active default billing plan is configured.", 500, "BILLING_PLAN_MISSING");
  }
  return plan;
}

async function getEffectivePlan(userId: string): Promise<BillingPlanRecord> {
  const subscription = await billingRepo.findSubscriptionByUser(userId);
  if (subscription?.plan?.isActive) {
    return subscription.plan;
  }

  return getFreePlan();
}

function getLifecycle(subscription: BillingSubscriptionRecord | null) {
  if (!subscription) {
    return {
      status: "free",
      graceEndsAt: null as Date | null,
      isActive: true,
      isInGracePeriod: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null as Date | null,
    };
  }

  const now = new Date();
  const graceEndsAt = addDays(subscription.currentPeriodEnd, DEFAULT_GRACE_PERIOD_DAYS);

  if (subscription.status === "past_due") {
    return {
      status: now <= graceEndsAt ? "grace_period" : "expired",
      graceEndsAt,
      isActive: now <= graceEndsAt,
      isInGracePeriod: now <= graceEndsAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  if (subscription.cancelAtPeriodEnd && now < subscription.currentPeriodEnd) {
    return {
      status: "canceling",
      graceEndsAt,
      isActive: true,
      isInGracePeriod: false,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  if (now <= subscription.currentPeriodEnd) {
    return {
      status: "active",
      graceEndsAt,
      isActive: true,
      isInGracePeriod: false,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  if (now <= graceEndsAt) {
    return {
      status: "grace_period",
      graceEndsAt,
      isActive: true,
      isInGracePeriod: true,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  return {
    status: "expired",
    graceEndsAt,
    isActive: false,
    isInGracePeriod: false,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

async function createInvoiceWithLines(
  userId: string,
  lines: InvoiceLineInput[],
  status: "pending" | "paid" | "void" = "paid",
) {
  const safeLines = lines.filter((line) => line.amount > 0);
  if (safeLines.length === 0) return null;

  const total = safeLines.reduce((sum, line) => sum + line.amount * (line.quantity ?? 1), 0);

  const invoice = await prisma.invoice.create({
    data: {
      userId,
      amount: toMoney(total),
      status,
      currency: "USD",
      items: {
        create: safeLines.map((line) => ({
          amount: toMoney(line.amount),
          description: line.description,
          quantity: line.quantity ?? 1,
        })),
      },
    },
    include: { items: true },
  });

  return invoice;
}

async function createPayoutRecord(userId: string, grossAmount: number, occurredAt = new Date()) {
  if (grossAmount <= 0) return null;

  const payoutAmount = grossAmount * DEFAULT_PAYOUT_SHARE;
  return payoutRepo.create({
    userId,
    amount: toMoney(payoutAmount),
    status: "pending",
    periodStart: occurredAt,
    periodEnd: occurredAt,
  });
}

async function getQuotaSnapshot(userId: string, effectivePlan: BillingPlanRecord, subscription: BillingSubscriptionRecord | null) {
  const features = normalizePlanFeatures(effectivePlan.features);
  const [user, activeAgentCount, monthlyRuns, monthlyApiCalls] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, totalCreditsUsed: true },
    }),
    prisma.agent.count({
      where: { userId, status: { not: "ARCHIVED" } },
    }),
    prisma.executionLog.count({
      where: {
        userId,
        createdAt: subscription
          ? { gte: subscription.currentPeriodStart, lte: subscription.currentPeriodEnd }
          : { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
      },
    }),
    prisma.apiUsage.count({
      where: {
        userId,
        createdAt: subscription
          ? { gte: subscription.currentPeriodStart, lte: subscription.currentPeriodEnd }
          : { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
      },
    }),
  ]);

  return {
    credits: {
      remaining: user?.credits ?? 0,
      lifetimeUsed: user?.totalCreditsUsed ?? 0,
      includedPerPeriod: features.monthlyCredits,
    },
    agents: {
      used: activeAgentCount,
      limit: features.maxAgents,
      remaining: features.maxAgents == null ? null : Math.max(features.maxAgents - activeAgentCount, 0),
    },
    runs: {
      used: monthlyRuns,
      limit: features.maxRunsPerMonth,
      remaining: features.maxRunsPerMonth == null ? null : Math.max(features.maxRunsPerMonth - monthlyRuns, 0),
    },
    apiCalls: {
      used: monthlyApiCalls,
      limit: features.monthlyApiCalls,
      remaining: features.monthlyApiCalls == null ? null : Math.max(features.monthlyApiCalls - monthlyApiCalls, 0),
    },
  };
}

export const billingService = {
  async listPlans() {
    const plans = await billingRepo.findAllPlans();
    return plans.map((plan) => {
      const features = normalizePlanFeatures(plan.features);
      return {
        ...plan,
        price: fromMoney(plan.price),
        normalizedFeatures: features,
        displayFeatures: toDisplayFeatures(features),
      };
    });
  },

  async getStatus(userId: string) {
    const [subscription, invoices, creditLogs, plan] = await Promise.all([
      billingRepo.findSubscriptionByUser(userId),
      invoiceRepo.findByUser(userId),
      creditLogRepo.findByUser(userId),
      getEffectivePlan(userId),
    ]);

    const lifecycle = getLifecycle(subscription);
    const quotas = await getQuotaSnapshot(userId, plan, subscription);

    return {
      subscription: subscription
        ? {
            ...subscription,
            plan: {
              ...subscription.plan,
              price: fromMoney(subscription.plan.price),
              normalizedFeatures: normalizePlanFeatures(subscription.plan.features),
              displayFeatures: toDisplayFeatures(normalizePlanFeatures(subscription.plan.features)),
            },
          }
        : null,
      lifecycle,
      effectivePlan: {
        ...plan,
        price: fromMoney(plan.price),
        normalizedFeatures: normalizePlanFeatures(plan.features),
        displayFeatures: toDisplayFeatures(normalizePlanFeatures(plan.features)),
      },
      quotas,
      invoices: invoices.map((invoice) => ({
        ...invoice,
        amount: fromMoney(invoice.amount),
      })),
      creditLogs,
    };
  },

  async assertCanCreateAgent(userId: string) {
    const [plan, subscription] = await Promise.all([
      getEffectivePlan(userId),
      billingRepo.findSubscriptionByUser(userId),
    ]);
    const lifecycle = getLifecycle(subscription);
    const features = normalizePlanFeatures(plan.features);

    if (!lifecycle.isActive && plan.name.toLowerCase() !== "free") {
      throw new AppError("Your subscription is inactive. Renew or switch plans to create more agents.", 402, "SUBSCRIPTION_INACTIVE");
    }

    if (features.maxAgents == null) return;

    const activeAgents = await prisma.agent.count({
      where: { userId, status: { not: "ARCHIVED" } },
    });

    if (activeAgents >= features.maxAgents) {
      throw new AppError(
        `Your current plan allows up to ${features.maxAgents} active agents. Upgrade to create more.`,
        402,
        "AGENT_QUOTA_EXCEEDED",
      );
    }
  },

  async subscribe(userId: string, planId: string) {
    const [plan, existing] = await Promise.all([
      billingRepo.findPlanById(planId),
      billingRepo.findSubscriptionByUser(userId),
    ]);

    if (!plan || !plan.isActive) {
      throw new AppError("Billing plan not found or inactive.", 404, "BILLING_PLAN_NOT_FOUND");
    }

    const now = new Date();
    const currentPeriodEnd = addDays(now, plan.interval === "year" ? 365 : 30);
    const existingLifecycle = getLifecycle(existing);

    if (
      existing &&
      existing.planId === planId &&
      existingLifecycle.isActive &&
      !existing.cancelAtPeriodEnd
    ) {
      throw new AppError(`You are already on the ${plan.name} plan.`, 409, "PLAN_ALREADY_ACTIVE");
    }

    const subscription = await billingRepo.upsertSubscription({
      userId,
      planId,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    });

    const features = normalizePlanFeatures(plan.features);
    if (features.monthlyCredits > 0) {
      await this.addCredits(
        userId,
        features.monthlyCredits,
        "plan_credit",
        `${plan.name} plan monthly credit allocation`,
      );
    }

    const invoice = await createInvoiceWithLines(userId, [
      {
        description: `${plan.name} subscription (${plan.interval})`,
        amount: fromMoney(plan.price),
        quantity: 1,
      },
    ]);

    logger.info("User subscribed to plan", { userId, planId, planName: plan.name, invoiceId: invoice?.id });

    return {
      subscription,
      invoice,
    };
  },

  async cancelSubscription(userId: string) {
    const sub = await billingRepo.findSubscriptionByUser(userId);
    if (!sub) throw new AppError("No active subscription found.", 404, "SUBSCRIPTION_NOT_FOUND");

    const updated = await prisma.billingSubscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });

    logger.info("Subscription scheduled for cancellation", { userId, subId: sub.id });
    return {
      subscription: updated,
      lifecycle: getLifecycle(updated),
    };
  },

  async addCredits(userId: string, amount: number, type = "topup", note?: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

    const [, updatedUser] = await prisma.$transaction([
      prisma.creditLog.create({
        data: {
          userId,
          amount,
          type,
          note,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
        select: { credits: true, totalCreditsUsed: true },
      }),
    ]);

    logger.info("Credits added to user", { userId, amount, type });
    return updatedUser;
  },

  async deductCredits(userId: string, amount: number, agentId?: string, note?: string) {
    const user = await userRepo.findById(userId);
    if (!user || user.credits < amount) {
      throw new AppError("Insufficient credits.", 402, "INSUFFICIENT_CREDITS");
    }

    const [, updatedUser] = await prisma.$transaction([
      prisma.creditLog.create({
        data: {
          userId,
          agentId,
          amount: -amount,
          type: "deduction",
          note: note || "Agent execution deduction",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: amount },
          totalCreditsUsed: { increment: amount },
        },
        select: { credits: true, totalCreditsUsed: true },
      }),
    ]);

    logger.debug("Credits deducted", { userId, amount, agentId });
    return updatedUser;
  },

  async generateInvoice(userId: string, amount: number, description: string) {
    return createInvoiceWithLines(userId, [{ description, amount, quantity: 1 }]);
  },

  async listInvoices(userId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return invoices.map((invoice) => ({
      ...invoice,
      amount: fromMoney(invoice.amount),
      items: invoice.items.map((item) => ({
        ...item,
        amount: fromMoney(item.amount),
      })),
    }));
  },

  async getInvoice(userId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { items: true },
    });

    if (!invoice) {
      throw new AppError("Invoice not found.", 404, "INVOICE_NOT_FOUND");
    }

    return {
      ...invoice,
      amount: fromMoney(invoice.amount),
      items: invoice.items.map((item) => ({
        ...item,
        amount: fromMoney(item.amount),
      })),
    };
  },

  async topup(userId: string, amount: number) {
    const updatedUser = await this.addCredits(userId, amount, "topup", "Manual credit top-up");
    const invoice = await this.generateInvoice(
      userId,
      amount * BILLING_CREDIT_PRICE_USD,
      `Credit top-up (${amount} credits)`,
    );

    return {
      credits: updatedUser.credits,
      invoice,
    };
  },

  async recordAgentRunCharge(params: {
    consumerId: string;
    agentId: string;
    executionId: string;
  }) {
    const agent = await prisma.agent.findUnique({
      where: { id: params.agentId },
      include: {
        listing: true,
      },
    });

    if (!agent?.listing) return null;
    if (agent.userId === params.consumerId) return null;
    if (agent.listing.pricingModel !== "PER_RUN" || !agent.listing.pricePerRun) return null;

    const amount = fromMoney(agent.listing.pricePerRun);
    if (amount <= 0) return null;

    const invoice = await createInvoiceWithLines(params.consumerId, [
      {
        description: `Agent run: ${agent.listing.name} (${params.executionId.slice(0, 8)})`,
        amount,
        quantity: 1,
      },
    ]);

    const payout = await createPayoutRecord(agent.userId, amount);

    logger.info("Marketplace per-run charge recorded", {
      consumerId: params.consumerId,
      agentId: params.agentId,
      executionId: params.executionId,
      invoiceId: invoice?.id,
      payoutId: payout?.id,
    });

    return { invoice, payout };
  },

  async recordListingSubscriptionCharge(params: {
    listingId: string;
    subscriberId: string;
  }) {
    const listing = await prisma.listing.findUnique({
      where: { id: params.listingId },
      include: { creator: true },
    });

    if (!listing || listing.pricingModel !== "SUBSCRIPTION_MONTHLY" || !listing.priceMonthly) {
      return null;
    }

    const amount = fromMoney(listing.priceMonthly);
    if (amount <= 0) return null;

    const invoice = await createInvoiceWithLines(params.subscriberId, [
      {
        description: `Listing subscription: ${listing.name}`,
        amount,
        quantity: 1,
      },
    ]);

    const payout = await createPayoutRecord(listing.userId, amount);

    logger.info("Marketplace subscription charge recorded", {
      listingId: params.listingId,
      subscriberId: params.subscriberId,
      invoiceId: invoice?.id,
      payoutId: payout?.id,
    });

    return { invoice, payout };
  },

  async recordApiSubscriptionCharge(params: {
    apiId: string;
    subscriberId: string;
    planId?: string | null;
  }) {
    const product = await prisma.apiProduct.findUnique({
      where: { id: params.apiId },
      include: { plans: true },
    });

    if (!product) return null;

    let amount = 0;
    let label = `API subscription: ${product.name}`;

    if (product.pricingType === "monthly") {
      const selectedPlan = params.planId
        ? product.plans.find((plan) => plan.id === params.planId)
        : null;

      amount = selectedPlan?.price ?? product.priceMonthly ?? 0;
      if (selectedPlan) label = `API subscription: ${product.name} - ${selectedPlan.name}`;
    }

    if (amount <= 0) return null;

    const invoice = await createInvoiceWithLines(params.subscriberId, [
      { description: label, amount, quantity: 1 },
    ]);

    const payout = await createPayoutRecord(product.userId, amount);
    logger.info("API monthly subscription charge recorded", {
      apiId: params.apiId,
      subscriberId: params.subscriberId,
      invoiceId: invoice?.id,
      payoutId: payout?.id,
    });

    return { invoice, payout };
  },

  async recordApiUsageCharge(params: {
    apiId: string;
    consumerId: string;
    endpoint: string;
  }) {
    const product = await prisma.apiProduct.findUnique({
      where: { id: params.apiId },
    });

    if (!product || product.pricingType !== "per_call" || product.pricePerCall == null) {
      return null;
    }

    const amount = Number(product.pricePerCall);
    if (amount <= 0) return null;

    const invoice = await createInvoiceWithLines(params.consumerId, [
      {
        description: `API usage: ${product.name} - ${params.endpoint}`,
        amount,
        quantity: 1,
      },
    ]);

    const payout = await createPayoutRecord(product.userId, amount);

    logger.info("API usage charge recorded", {
      apiId: params.apiId,
      consumerId: params.consumerId,
      invoiceId: invoice?.id,
      payoutId: payout?.id,
    });

    return { invoice, payout };
  },

  async getCreatorSummary(userId: string) {
    const [listings, payouts] = await Promise.all([
      prisma.listing.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          pricingModel: true,
          totalRunsCount: true,
          subscribersCount: true,
          status: true,
          createdAt: true,
        },
      }),
      payoutRepo.findByUser(userId),
    ]);

    const totalNetRevenue = payouts.reduce((sum, payout) => sum + fromMoney(payout.amount), 0);
    const totalGrossRevenue = totalNetRevenue / DEFAULT_PAYOUT_SHARE;
    const pendingPayouts = payouts
      .filter((payout) => payout.status === "pending")
      .reduce((sum, payout) => sum + fromMoney(payout.amount), 0);
    const processedPayouts = payouts
      .filter((payout) => payout.status === "processed")
      .reduce((sum, payout) => sum + fromMoney(payout.amount), 0);

    const monthlyBuckets = new Map<string, { label: string; grossRevenue: number; netRevenue: number }>();
    for (const payout of payouts) {
      const date = payout.createdAt;
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const label = date.toLocaleString("en-US", { month: "short" });
      const existing = monthlyBuckets.get(key) ?? { label, grossRevenue: 0, netRevenue: 0 };
      const net = fromMoney(payout.amount);
      existing.netRevenue += net;
      existing.grossRevenue += net / DEFAULT_PAYOUT_SHARE;
      monthlyBuckets.set(key, existing);
    }

    return {
      totals: {
        activeListings: listings.filter((listing) => listing.status === "PUBLISHED").length,
        subscriptions: listings.reduce((sum, listing) => sum + listing.subscribersCount, 0),
        billableRuns: listings.reduce((sum, listing) => sum + listing.totalRunsCount, 0),
        grossRevenue: Number(totalGrossRevenue.toFixed(2)),
        netRevenue: Number(totalNetRevenue.toFixed(2)),
        pendingPayouts: Number(pendingPayouts.toFixed(2)),
        processedPayouts: Number(processedPayouts.toFixed(2)),
      },
      monthlyRevenue: Array.from(monthlyBuckets.values()).sort((a, b) => a.label.localeCompare(b.label)),
      payouts: payouts.map((payout) => ({
        ...payout,
        amount: fromMoney(payout.amount),
      })),
      listings,
    };
  },
};
