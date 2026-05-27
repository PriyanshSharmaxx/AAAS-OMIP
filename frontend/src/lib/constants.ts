import type { Plan } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const AGENT_CATEGORIES: {
  value: string;
  label: string;
  icon: string;
}[] = [
  { value: "automation", label: "Automation", icon: "Zap" },
  { value: "data", label: "Data", icon: "Database" },
  { value: "ai", label: "AI", icon: "Brain" },
  { value: "communication", label: "Communication", icon: "MessageSquare" },
  { value: "development", label: "Development", icon: "Code" },
  { value: "productivity", label: "Productivity", icon: "CheckSquare" },
];

export const RUN_STATUS_MAP: Record<
  string,
  { label: string; color: string }
> = {
  PENDING: { label: "Pending", color: "yellow" },
  RUNNING: { label: "Running", color: "blue" },
  COMPLETED: { label: "Completed", color: "green" },
  FAILED: { label: "Failed", color: "red" },
};

export const PLANS: Plan[] = [
  {
    name: "FREE",
    price: 0,
    features: [
      "Up to 5 agents",
      "100 runs per month",
      "Community support",
      "Basic analytics",
    ],
  },
  {
    name: "PRO",
    price: 29,
    features: [
      "Unlimited agents",
      "10,000 runs per month",
      "Priority support",
      "Advanced analytics",
      "Custom integrations",
      "Team collaboration",
    ],
  },
  {
    name: "ENTERPRISE",
    price: 99,
    features: [
      "Unlimited agents",
      "Unlimited runs",
      "Dedicated support",
      "Enterprise analytics",
      "Custom integrations",
      "Team collaboration",
      "SSO & SAML",
      "SLA guarantees",
      "On-premise deployment",
    ],
  },
];
