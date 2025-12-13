import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, invoices, vendors } from "@prism/db";
import { eq, desc, gte, sql, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Get all invoices for the user
    const allInvoices = await db
      .select({
        id: invoices.id,
        amount: invoices.amount,
        currency: invoices.currency,
        invoiceDate: invoices.invoiceDate,
        billingFrequency: invoices.billingFrequency,
        vendorId: invoices.vendorId,
        vendorName: vendors.name,
        vendorSlug: vendors.slug,
        vendorLogo: vendors.logoUrl,
        vendorCategory: vendors.category,
      })
      .from(invoices)
      .leftJoin(vendors, eq(invoices.vendorId, vendors.id))
      .where(
        and(
          eq(invoices.userId, session.user.id),
          gte(invoices.invoiceDate, sixMonthsAgo)
        )
      )
      .orderBy(desc(invoices.invoiceDate));

    // Calculate spend by vendor
    const vendorSpend: Record<string, {
      vendorId: string;
      vendorName: string;
      vendorSlug: string;
      vendorLogo: string | null;
      vendorCategory: string;
      currentMonthSpend: number;
      previousMonthSpend: number;
      totalSpend: number;
      invoiceCount: number;
      currency: string;
      spendHistory: number[];
    }> = {};

    // Group invoices by month for sparklines
    const monthlySpend: Record<string, Record<string, number>> = {};

    for (const invoice of allInvoices) {
      const vendorKey = invoice.vendorId || "unknown";
      const amount = parseFloat(invoice.amount || "0");
      const invoiceDate = new Date(invoice.invoiceDate);
      const monthKey = `${invoiceDate.getFullYear()}-${invoiceDate.getMonth()}`;

      // Initialize vendor if not exists
      if (!vendorSpend[vendorKey]) {
        vendorSpend[vendorKey] = {
          vendorId: invoice.vendorId || "unknown",
          vendorName: invoice.vendorName || "Unknown",
          vendorSlug: invoice.vendorSlug || "unknown",
          vendorLogo: invoice.vendorLogo,
          vendorCategory: invoice.vendorCategory || "Other",
          currentMonthSpend: 0,
          previousMonthSpend: 0,
          totalSpend: 0,
          invoiceCount: 0,
          currency: invoice.currency || "USD",
          spendHistory: [],
        };
        monthlySpend[vendorKey] = {};
      }

      // Accumulate totals
      vendorSpend[vendorKey].totalSpend += amount;
      vendorSpend[vendorKey].invoiceCount++;

      // Track monthly spend for sparklines
      if (!monthlySpend[vendorKey][monthKey]) {
        monthlySpend[vendorKey][monthKey] = 0;
      }
      monthlySpend[vendorKey][monthKey] += amount;

      // Current month
      if (invoiceDate >= currentMonthStart) {
        vendorSpend[vendorKey].currentMonthSpend += amount;
      }
      // Previous month
      else if (invoiceDate >= previousMonthStart && invoiceDate <= previousMonthEnd) {
        vendorSpend[vendorKey].previousMonthSpend += amount;
      }
    }

    // Build sparkline data (last 6 months)
    for (const vendorKey of Object.keys(vendorSpend)) {
      const history: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        history.push(monthlySpend[vendorKey]?.[monthKey] || 0);
      }
      vendorSpend[vendorKey].spendHistory = history;
    }

    // Calculate totals
    const services = Object.values(vendorSpend).filter((v) => v.vendorId !== "unknown");
    const totalCurrentSpend = services.reduce((sum, v) => sum + v.currentMonthSpend, 0);
    const totalPreviousSpend = services.reduce((sum, v) => sum + v.previousMonthSpend, 0);

    // Sort by current month spend
    services.sort((a, b) => b.currentMonthSpend - a.currentMonthSpend);

    return NextResponse.json({
      totalSpend: totalCurrentSpend,
      previousSpend: totalPreviousSpend,
      serviceCount: services.length,
      invoiceCount: allInvoices.length,
      services,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
