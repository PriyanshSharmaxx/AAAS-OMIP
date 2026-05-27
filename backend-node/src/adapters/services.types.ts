/**
 * src/adapters/services.types.ts
 *
 * Common interface for non-agent service adapters (Notifications, Payments, etc.).
 * These provide a consistent wrapper around external providers.
 */

export interface ServiceResult<T = any> {
  success:   boolean;
  data?:      T;
  error?:    string;
  latencyMs: number;
  provider:  string;
}

export interface BaseServiceAdapter {
  providerName: string;
}
