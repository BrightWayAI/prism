import { z } from "zod";

export const BillingFrequency = z.enum(["monthly", "annual", "usage", "one_time"]);
export type BillingFrequency = z.infer<typeof BillingFrequency>;

export const AlertType = z.enum(["spend_increase", "renewal_reminder", "parse_failed", "new_invoice"]);
export type AlertType = z.infer<typeof AlertType>;

export const VendorCategory = z.enum([
  "Cloud",
  "CI/CD",
  "Monitoring",
  "AI/ML",
  "Databases",
  "Productivity",
  "Dev Tools",
  "Auth/Infra",
  "Communication",
  "Design",
  "Analytics",
  "Security",
  "Other",
]);
export type VendorCategory = z.infer<typeof VendorCategory>;

export const InvoiceExtractionSchema = z.object({
  vendor_name: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  invoice_date: z.string(),
  billing_period_start: z.string().nullable(),
  billing_period_end: z.string().nullable(),
  billing_frequency: BillingFrequency.nullable(),
  invoice_number: z.string().nullable(),
  confidence_score: z.number().min(0).max(1),
});
export type InvoiceExtraction = z.infer<typeof InvoiceExtractionSchema>;

export const AlertPreferencesSchema = z.object({
  email_notifications: z.boolean().default(true),
  spend_increase: z.boolean().default(true),
  spend_increase_threshold: z.number().min(0).max(100).default(20),
  renewal_reminder: z.boolean().default(true),
  renewal_reminder_days: z.number().min(1).max(90).default(30),
  parse_failed: z.boolean().default(true),
  new_invoice: z.boolean().default(false),
});
export type AlertPreferences = z.infer<typeof AlertPreferencesSchema>;

export interface ServiceSpendSummary {
  vendorId: string;
  vendorName: string;
  vendorLogo?: string;
  category: VendorCategory;
  currentMonthSpend: number;
  previousMonthSpend: number;
  currency: string;
  spendHistory: number[];
  invoiceCount: number;
  lastInvoiceDate?: string;
  billingFrequency?: BillingFrequency;
}

export interface DashboardSummary {
  totalSpend: number;
  previousSpend: number;
  currency: string;
  serviceCount: number;
  upcomingRenewals: number;
  services: ServiceSpendSummary[];
}
