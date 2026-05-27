/**
 * Global configurations for the platform.
 * 
 * DEMO_MODE has been fully removed for V1 Production.
 * The application is now strictly wired to the real backend APIs.
 */
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
