import { describe, it, expect, vi, afterEach } from "vitest";
import { billingService } from "../../src/services/billing.service";
import { prisma } from "../../src/lib/prisma";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    billingPlan: { findFirst: vi.fn(), findUnique: vi.fn() },
    billingSubscription: { findFirst: vi.fn(), findUnique: vi.fn() },
    invoice: { findMany: vi.fn() },
    creditLog: { findMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    agent: { count: vi.fn() },
    executionLog: { count: vi.fn() },
    apiUsage: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("Billing Service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getStatus", () => {
    it("should return correct status for a user without a subscription", async () => {
      (prisma.billingSubscription.findUnique as any).mockResolvedValue(null);
      (prisma.billingPlan.findFirst as any).mockResolvedValue({
        id: "free",
        name: "Free",
        features: { monthlyCredits: 100 },
      });
      (prisma.invoice.findMany as any).mockResolvedValue([]);
      (prisma.creditLog.findMany as any).mockResolvedValue([]);
      (prisma.user.findUnique as any).mockResolvedValue({ credits: 50, totalCreditsUsed: 50 });
      (prisma.agent.count as any).mockResolvedValue(1);
      (prisma.executionLog.count as any).mockResolvedValue(5);
      (prisma.apiUsage.count as any).mockResolvedValue(0);

      const status = await billingService.getStatus("user-1");
      
      expect(status.lifecycle.status).toBe("free");
      expect(status.effectivePlan.name).toBe("Free");
      expect(status.quotas.credits.remaining).toBe(50);
    });
  });
});
