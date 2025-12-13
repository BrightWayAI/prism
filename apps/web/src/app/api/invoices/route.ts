import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, invoices, vendors } from "@prism/db";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const vendorId = searchParams.get("vendorId");

  try {
    const conditions = [eq(invoices.userId, session.user.id)];
    
    if (startDate) {
      conditions.push(gte(invoices.invoiceDate, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(invoices.invoiceDate, new Date(endDate)));
    }
    if (vendorId) {
      conditions.push(eq(invoices.vendorId, vendorId));
    }

    const userInvoices = await db
      .select({
        id: invoices.id,
        amount: invoices.amount,
        currency: invoices.currency,
        invoiceDate: invoices.invoiceDate,
        billingPeriodStart: invoices.billingPeriodStart,
        billingPeriodEnd: invoices.billingPeriodEnd,
        billingFrequency: invoices.billingFrequency,
        invoiceNumber: invoices.invoiceNumber,
        confidenceScore: invoices.confidenceScore,
        isManuallyReviewed: invoices.isManuallyReviewed,
        createdAt: invoices.createdAt,
        vendorId: invoices.vendorId,
        vendorName: vendors.name,
        vendorSlug: vendors.slug,
        vendorLogo: vendors.logoUrl,
        vendorCategory: vendors.category,
        // Email metadata for verification
        emailSubject: invoices.emailSubject,
        emailFrom: invoices.emailFrom,
        emailDate: invoices.emailDate,
        extractedAmounts: invoices.extractedAmounts,
        rawEmailSnippet: invoices.rawEmailSnippet,
      })
      .from(invoices)
      .leftJoin(vendors, eq(invoices.vendorId, vendors.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.invoiceDate));

    return NextResponse.json({ invoices: userInvoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
