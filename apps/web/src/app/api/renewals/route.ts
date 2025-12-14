import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@prism/db";
import { invoices, vendors } from "@prism/db/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the most recent invoice for each vendor with billing period info
  const recentInvoices = await db
    .select({
      vendorId: vendors.id,
      vendorName: vendors.name,
      vendorLogo: vendors.logoUrl,
      amount: invoices.amount,
      currency: invoices.currency,
      billingFrequency: invoices.billingFrequency,
      billingPeriodEnd: invoices.billingPeriodEnd,
      invoiceDate: invoices.invoiceDate,
    })
    .from(invoices)
    .innerJoin(vendors, eq(invoices.vendorId, vendors.id))
    .where(
      and(
        eq(invoices.userId, session.user.id),
        isNotNull(invoices.vendorId)
      )
    )
    .orderBy(desc(invoices.invoiceDate));

  // Group by vendor and get the most recent invoice
  const vendorMap = new Map<string, typeof recentInvoices[0]>();
  for (const invoice of recentInvoices) {
    if (!vendorMap.has(invoice.vendorId)) {
      vendorMap.set(invoice.vendorId, invoice);
    }
  }

  // Calculate renewal dates based on billing frequency
  const now = new Date();
  const renewals = Array.from(vendorMap.values())
    .map((invoice) => {
      let renewalDate: Date;
      const lastInvoice = new Date(invoice.invoiceDate);
      
      if (invoice.billingPeriodEnd) {
        renewalDate = new Date(invoice.billingPeriodEnd);
      } else if (invoice.billingFrequency === "annual") {
        renewalDate = new Date(lastInvoice);
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      } else {
        // Default to monthly
        renewalDate = new Date(lastInvoice);
        renewalDate.setMonth(renewalDate.getMonth() + 1);
      }

      // If renewal date is in the past, project forward
      while (renewalDate < now) {
        if (invoice.billingFrequency === "annual") {
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        } else {
          renewalDate.setMonth(renewalDate.getMonth() + 1);
        }
      }

      const daysUntilRenewal = Math.ceil(
        (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        vendorId: invoice.vendorId,
        vendorName: invoice.vendorName,
        vendorLogo: invoice.vendorLogo,
        amount: parseFloat(invoice.amount),
        currency: invoice.currency,
        renewalDate: renewalDate.toISOString(),
        billingFrequency: invoice.billingFrequency || "monthly",
        daysUntilRenewal,
      };
    })
    .filter((r) => r.daysUntilRenewal <= 90) // Only show renewals in next 90 days
    .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);

  return NextResponse.json({ renewals });
}
