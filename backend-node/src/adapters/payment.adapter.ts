/**
 * src/adapters/payment.adapter.ts
 *
 * Payment Adapter — stub for external payment providers (Stripe, PayPal).
 * Handles:
 *   - Creating checkout sessions
 *   - Verifying webhooks
 *   - Checking subscription status
 */

import { logger } from "../lib/logger";
import { ServiceResult } from "./services.types";

export interface CheckoutOptions {
  userId:      string;
  planId:      string;
  successUrl:  string;
  cancelUrl:   string;
}

export const paymentAdapter = {
  providerName: "STRIPE_STUB",

  async createCheckoutSession(opts: CheckoutOptions): Promise<ServiceResult<{ url: string }>> {
    const start = Date.now();
    logger.info("Payment: creating session (stub)", opts);

    // Placeholder: return a fake URL
    return {
      success:   true,
      data:      { url: `https://checkout.stripe.com/pay/${opts.planId}_${opts.userId}` },
      latencyMs: Date.now() - start,
      provider:  this.providerName,
    };
  },

  async verifyWebhook(payload: any, signature: string): Promise<boolean> {
    logger.info("Payment: verifying webhook (stub)");
    return true;
  }
};
