import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, invoices, vendors } from "@prism/db";
import { eq, desc, gte, lte, sql, and } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get range from query params
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "current";

  try {
    // Get date ranges based on selection
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of current month
    
    switch (range) {
      case "current":
        // Current month only
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last":
        // Last month only
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case "3m":
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case "6m":
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      case "12m":
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        break;
      case "all":
      default:
        startDate = new Date(2020, 0, 1);
        break;
    }
    
    // For comparison (previous period)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

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
          gte(invoices.invoiceDate, startDate),
          lte(invoices.invoiceDate, endDate)
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
    const totalSpendInRange = Object.values(vendorSpend).reduce((sum, v) => sum + v.totalSpend, 0);
    const totalPreviousSpend = Object.values(vendorSpend).reduce((sum, v) => sum + v.previousMonthSpend, 0);

    // Sort by total spend in the selected range
    services.sort((a, b) => b.totalSpend - a.totalSpend);

    return NextResponse.json({
      totalSpend: totalSpendInRange,
      previousSpend: totalPreviousSpend,
      serviceCount: services.length,
      invoiceCount: allInvoices.length,
      services,
      range,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
