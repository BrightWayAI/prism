import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  decimal,
  pgEnum,
  jsonb,
  index,
  unique,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const billingFrequencyEnum = pgEnum("billing_frequency", [
  "monthly",
  "annual",
  "usage",
  "one_time",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "spend_increase",
  "renewal_reminder",
  "parse_failed",
  "new_invoice",
]);

export const vendorCategoryEnum = pgEnum("vendor_category", [
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

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "canceled",
  "past_due",
  "unpaid",
]);

// NextAuth.js required tables
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  alertPreferences: jsonb("alert_preferences").default({}),
  // Stripe fields
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSyncAt: timestamp("last_sync_at"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({ columns: [verificationToken.identifier, verificationToken.token] }),
  ]
);

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logoUrl: text("logo_url"),
    category: vendorCategoryEnum("category").notNull(),
    emailPatterns: text("email_patterns").array().notNull().default([]),
    parsingHints: jsonb("parsing_hints").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("vendors_category_idx").on(table.category)]
);

export const userVendors = pgTable(
  "user_vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").default(true).notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => [
    unique("user_vendor_unique").on(table.userId, table.vendorId),
    index("user_vendors_user_idx").on(table.userId),
  ]
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),
    gmailMessageId: text("gmail_message_id"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("USD").notNull(),
    invoiceDate: timestamp("invoice_date").notNull(),
    billingPeriodStart: timestamp("billing_period_start"),
    billingPeriodEnd: timestamp("billing_period_end"),
    billingFrequency: billingFrequencyEnum("billing_frequency"),
    invoiceNumber: text("invoice_number"),
    rawEmailSnippet: text("raw_email_snippet"),
    // Email metadata for verification
    emailSubject: text("email_subject"),
    emailFrom: text("email_from"),
    emailDate: text("email_date"),
    extractedAmounts: text("extracted_amounts").array(), // All $ amounts found in email
    pdfUrl: text("pdf_url"),
    confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
    isManuallyReviewed: boolean("is_manually_reviewed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("invoices_user_idx").on(table.userId),
    index("invoices_vendor_idx").on(table.vendorId),
    index("invoices_date_idx").on(table.invoiceDate),
    unique("invoices_gmail_unique").on(table.userId, table.gmailMessageId),
  ]
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: alertTypeEnum("type").notNull(),
    invoiceId: uuid("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("alerts_user_idx").on(table.userId),
    index("alerts_unread_idx").on(table.userId, table.isRead),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type UserVendor = typeof userVendors.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
