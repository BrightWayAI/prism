export const DEFAULT_LOOKBACK_MONTHS = 6;
export const MAX_LOOKBACK_MONTHS = 12;

export const POLLING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export const DEFAULT_SPEND_INCREASE_THRESHOLD = 20; // 20%
export const DEFAULT_RENEWAL_REMINDER_DAYS = 30;

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  Cloud: "#3b82f6",
  "CI/CD": "#8b5cf6",
  Monitoring: "#f59e0b",
  "AI/ML": "#10b981",
  Databases: "#ef4444",
  Productivity: "#6366f1",
  "Dev Tools": "#ec4899",
  "Auth/Infra": "#14b8a6",
  Communication: "#f97316",
  Design: "#a855f7",
  Analytics: "#06b6d4",
  Security: "#dc2626",
  Other: "#6b7280",
};
