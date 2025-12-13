import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchInvoiceEmails, getEmailContent } from "@/lib/gmail";
import { parseInvoiceEmail } from "@/lib/parser";
import { db, invoices, vendors, userVendors } from "@prism/db";
import { eq, and, ilike } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { startDate, endDate, vendorIds } = body;

  try {
    // Get emails from Gmail
    const messages = await searchInvoiceEmails(session.user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      maxResults: 50,
    });

    const results: { success: number; failed: number; skipped: number } = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    for (const message of messages) {
      if (!message.id) continue;

      // Check if already parsed
      const existing = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.userId, session.user.id),
          eq(invoices.gmailMessageId, message.id)
        ),
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      // Get email content
      const email = await getEmailContent(session.user.id, message.id);
      
      // Parse with OpenAI
      let parsed;
      try {
        parsed = await parseInvoiceEmail(email);
      } catch (parseErr) {
        console.error("Parse error for message:", message.id, parseErr);
        results.failed++;
        continue;
      }
      
      if (!parsed) {
        console.log("No parse result");
        results.failed++;
        continue;
      }

      // Skip non-invoices (newsletters, notifications, etc.)
      if (parsed.confidenceScore < 0.5) {
        console.log("Skipping low confidence (not an invoice):", parsed.vendorName, parsed.confidenceScore);
        results.failed++;
        continue;
      }

      // Skip if no amount found (amount is null or 0)
      if (parsed.amount === null || parsed.amount === undefined || parsed.amount === 0) {
        console.log("Skipping - no amount found:", parsed.vendorName, parsed.amount);
        results.failed++;
        continue;
      }

      // Validate parsed data
      const amount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(String(parsed.amount));
      if (isNaN(amount) || amount <= 0) {
        console.log("Invalid amount:", parsed.vendorName, parsed.amount);
        results.failed++;
        continue;
      }

      // Skip if no date
      if (!parsed.invoiceDate) {
        console.log("Skipping - no date:", parsed.vendorName);
        results.failed++;
        continue;
      }

      // Validate date
      const invoiceDate = new Date(parsed.invoiceDate);
      if (isNaN(invoiceDate.getTime())) {
        console.log("Invalid date:", parsed.invoiceDate);
        results.failed++;
        continue;
      }

      // Match vendor
      let vendorId: string | null = null;
      if (parsed.vendorName) {
        const matchedVendor = await db.query.vendors.findFirst({
          where: ilike(vendors.name, `%${parsed.vendorName}%`),
        });
        
        if (matchedVendor) {
          vendorId = matchedVendor.id;
          
          // Auto-add to user's tracked vendors if not already
          const existingUserVendor = await db.query.userVendors.findFirst({
            where: and(
              eq(userVendors.userId, session.user.id),
              eq(userVendors.vendorId, matchedVendor.id)
            ),
          });
          
          if (!existingUserVendor) {
            await db.insert(userVendors).values({
              userId: session.user.id,
              vendorId: matchedVendor.id,
              isActive: true,
            });
          }
        }
      }

      // Store invoice
      try {
        await db.insert(invoices).values({
          userId: session.user.id,
          vendorId,
          gmailMessageId: message.id,
          amount: amount.toFixed(2),
          currency: parsed.currency || "USD",
          invoiceDate,
          billingPeriodStart: parsed.billingPeriodStart ? new Date(parsed.billingPeriodStart) : null,
          billingPeriodEnd: parsed.billingPeriodEnd ? new Date(parsed.billingPeriodEnd) : null,
          billingFrequency: parsed.billingFrequency,
          invoiceNumber: parsed.invoiceNumber || null,
          rawEmailSnippet: email.snippet || "",
          confidenceScore: (parsed.confidenceScore || 0).toFixed(2),
          isManuallyReviewed: false,
        });
        results.success++;
      } catch (dbErr) {
        console.error("DB insert error:", dbErr);
        results.failed++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse invoices" },
      { status: 500 }
    );
  }
}
