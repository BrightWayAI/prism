import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@prism/db";
import { invoices, vendors } from "@prism/db/schema";
import { eq, and, gte, lte, desc, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") || "current-year";

  // Calculate date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (range) {
    case "current-year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "last-year":
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31);
      break;
    case "all":
      startDate = new Date(2000, 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), 0, 1);
  }

  const invoiceData = await db
    .select({
      invoiceDate: invoices.invoiceDate,
      amount: invoices.amount,
      currency: invoices.currency,
      invoiceNumber: invoices.invoiceNumber,
      billingFrequency: invoices.billingFrequency,
      vendorName: vendors.name,
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

  // Generate CSV
  const headers = ["Date", "Vendor", "Category", "Amount", "Currency", "Invoice Number", "Billing Frequency"];
  const rows = invoiceData.map((inv) => [
    new Date(inv.invoiceDate).toISOString().split("T")[0],
    inv.vendorName || "Unknown",
    inv.vendorCategory || "Other",
    inv.amount,
    inv.currency,
    inv.invoiceNumber || "",
    inv.billingFrequency || "",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="prism-invoices-${range}.csv"`,
    },
  });
}
