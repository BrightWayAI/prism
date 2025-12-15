import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchInvoiceEmails, getEmailContent } from "@/lib/gmail";
import { parseInvoiceEmail } from "@/lib/parser";
import { db, invoices, vendors, userVendors } from "@prism/db";
import { CURATED_VENDOR_SLUGS } from "@prism/db/curated-vendors";
import { eq, and, ilike, inArray } from "drizzle-orm";

function parseInvoiceDateToUtc(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Parser prompt expects YYYY-MM-DD. Store at noon UTC to avoid timezone shifting across days.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T12:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const vendorIds: string[] | undefined = Array.isArray(body?.vendorIds)
    ? body.vendorIds
    : undefined;

  const now = new Date();

  let daysBack: number = typeof body?.daysBack === "number" ? body.daysBack : 90;
  if (!Number.isFinite(daysBack) || daysBack <= 0) daysBack = 90;

  if (body?.startDate) {
    const start = new Date(body.startDate);
    if (!isNaN(start.getTime())) {
      const diffDays = Math.ceil(
        (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (Number.isFinite(diffDays) && diffDays > 0) {
        daysBack = Math.min(Math.max(diffDays, 1), 365);
      }
    }
  }

  const maxResultsRaw = typeof body?.maxResults === "number" ? body.maxResults : null;
  const maxResults = Math.min(
    Math.max(maxResultsRaw ?? (daysBack <= 31 ? 500 : 800), 1),
    2000
  );

  try {
    const vendorsForMatching = await db.query.vendors.findMany({
      where: inArray(vendors.slug, CURATED_VENDOR_SLUGS),
    });
    console.log(
      `Invoice parse: daysBack=${daysBack} maxResults=${maxResults} vendorsForMatching=${vendorsForMatching.length}`
    );

    // Get candidate invoice/receipt emails (broad keyword search + optional vendor-pattern search)
    const messages = await searchInvoiceEmails(session.user.id, {
      daysBack,
      vendorIds,
      maxResults,
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

      // If we already have this email, we normally skip.
      // But if vendorId is null, re-parse so improved matching can backfill missing services.
      if (existing && existing.vendorId) {
        results.skipped++;
        continue;
      }

      // Get email content
      const email = await getEmailContent(session.user.id, message.id);
      console.log(`Processing email: "${email.subject}" from "${email.from}"`);
      
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
        console.log(`Skipping - no amount found for "${email.subject}":`, parsed.vendorName, parsed.amount);
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

      const emailHeaderDate = new Date(email.date);

      // Parse invoice date as a stable UTC date (avoid timezone shift issues that hide "this month" spend)
      let invoiceDate = parseInvoiceDateToUtc(parsed.invoiceDate);

      // Fallback to email header date if parsed date missing/invalid
      if (!invoiceDate || isNaN(invoiceDate.getTime())) {
        if (!isNaN(emailHeaderDate.getTime())) {
          invoiceDate = emailHeaderDate;
        } else {
          console.log("Skipping - invalid invoice and email date:", parsed.vendorName, parsed.invoiceDate, email.date);
          results.failed++;
          continue;
        }
      }

      // If invoiceDate is wildly different from the email send date, prefer email date (common LLM failure)
      if (!isNaN(emailHeaderDate.getTime())) {
        const diffDays = Math.abs(
          (invoiceDate.getTime() - emailHeaderDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays > 45) {
          invoiceDate = emailHeaderDate;
        }
      }

      // Match vendor by multiple strategies
      let vendorId: string | null = null;
      let matchedVendor = null;
      
      const emailFrom = email.from.toLowerCase();
      const emailSubject = email.subject.toLowerCase();
      
      // Strategy 1: Special handling for Google payments (payments-noreply@google.com)
      // Differentiate Google Cloud vs Google Workspace by subject line
      if (emailFrom.includes("payments-noreply@google.com")) {
        if (emailSubject.includes("google workspace") || emailSubject.includes("workspace")) {
          matchedVendor = vendorsForMatching.find((v) => v.slug === "google-workspace");
          if (matchedVendor) {
            console.log(`Matched Google Workspace from subject`);
          }
        } else if (emailSubject.includes("google cloud") || emailSubject.includes("cloud")) {
          matchedVendor = vendorsForMatching.find((v) => v.slug === "gcp");
          if (matchedVendor) {
            console.log(`Matched Google Cloud from subject`);
          }
        }
        // Default to Google Cloud for payments-noreply@google.com
        if (!matchedVendor) {
          matchedVendor = vendorsForMatching.find((v) => v.slug === "gcp");
          console.log(`Defaulting Google payment to Google Cloud`);
        }
      }
      
      // Strategy 2: Check if this is a Stripe/payment processor receipt with vendor name in subject
      const isPaymentProcessor = emailFrom.includes("stripe.com") || 
                                  emailFrom.includes("paddle.com") || 
                                  emailFrom.includes("chargebee.com");
      
      if (!matchedVendor && isPaymentProcessor) {
        // Extract vendor name from "Your receipt from X" - get everything after "from"
        // Subject examples:
        // - "Your receipt from Railway Corporation" -> "Railway Corporation"
        // - "Your receipt from ZenLeads Inc. (dba) Apollo" -> "Apollo" (use dba name)
        // - "Your receipt from Calendly" -> "Calendly"
        
        let vendorFromSubject: string | null = null;
        
        // First check for (dba) pattern - the dba name is the actual brand
        const dbaMatch = emailSubject.match(/\(dba\)\s*(\w+)/i);
        if (dbaMatch) {
          vendorFromSubject = dbaMatch[1];
          console.log(`Found dba vendor: "${vendorFromSubject}"`);
        } else {
          // Get everything after "from " to end of subject
          const fromMatch = emailSubject.match(/from\s+(.+)$/i);
          if (fromMatch) {
            vendorFromSubject = fromMatch[1].trim();
            // Strip common suffixes
            vendorFromSubject = vendorFromSubject
              .replace(/\s+(inc\.?|llc|corp\.?|corporation|ltd\.?|limited|co\.?)$/i, "")
              .trim();
            console.log(`Found vendor from subject: "${vendorFromSubject}"`);
          }
        }
        
        if (vendorFromSubject) {
          const subjectVendorLower = vendorFromSubject.toLowerCase();
          
          // Try to match against our vendor list
          for (const v of vendorsForMatching) {
            const vNameLower = v.name.toLowerCase();
            const vSlugLower = v.slug.toLowerCase();
            
            // Exact match or contains
            if (vNameLower === subjectVendorLower || 
                vSlugLower === subjectVendorLower ||
                subjectVendorLower.includes(vNameLower) ||
                vNameLower.includes(subjectVendorLower)) {
              matchedVendor = v;
              console.log(`Matched vendor ${v.name} from payment processor receipt`);
              break;
            }
          }
          
          // If no match found in our list, we could create a dynamic vendor
          // For now, just log it
          if (!matchedVendor) {
            console.log(`No vendor match for "${vendorFromSubject}" - will use parsed name`);
          }
        }
      }
      
      // Strategy 3: Match by email domain pattern
      if (!matchedVendor) {
        for (const v of vendorsForMatching) {
          if (v.emailPatterns?.some(pattern => {
            // Handle both "@domain.com" and "user@domain.com" patterns
            const normalizedPattern = pattern.toLowerCase();
            if (normalizedPattern.startsWith("@")) {
              return emailFrom.includes(normalizedPattern);
            } else {
              return emailFrom.includes(normalizedPattern);
            }
          })) {
            matchedVendor = v;
            console.log(`Matched vendor ${v.name} from email pattern`);
            break;
          }
        }
      }
      
      // Strategy 4: Match by parsed vendor name from OpenAI
      if (!matchedVendor && parsed.vendorName) {
        const parsedNameLower = parsed.vendorName.toLowerCase();
        
        // First try exact/close match in our vendor list
        for (const v of vendorsForMatching) {
          const vNameLower = v.name.toLowerCase();
          const vSlugLower = v.slug.toLowerCase();
          
          if (vNameLower === parsedNameLower ||
              vSlugLower === parsedNameLower ||
              vNameLower.includes(parsedNameLower) ||
              parsedNameLower.includes(vNameLower)) {
            matchedVendor = v;
            console.log(`Matched vendor ${v.name} from parsed name`);
            break;
          }
        }
        
        // Then try fuzzy match in database
        if (!matchedVendor) {
          matchedVendor = await db.query.vendors.findFirst({
            where: ilike(vendors.name, `%${parsed.vendorName}%`),
          });
          if (matchedVendor) {
            console.log(`Matched vendor ${matchedVendor.name} from DB fuzzy search`);
          }
        }
      }

      // If we can't match to a seeded vendor, ignore it (prevents consumer receipts from polluting the dashboard).
        
      if (matchedVendor) {
        // Exclude non-developer/uncurated vendors (we only want seeded services to appear in spend)
        if (matchedVendor.category === "Other") {
          console.log(`Skipping vendor in Other category: ${matchedVendor.name}`);
          results.failed++;
          continue;
        }

        vendorId = matchedVendor.id;
        console.log(`Matched vendor: ${matchedVendor.name} for email from ${email.from}`);
          
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

      if (!vendorId) {
        console.log(`Skipping - could not match vendor for "${email.subject}" (parsed=${parsed.vendorName})`);
        results.failed++;
        continue;
      }

      // Store invoice with email metadata for verification
      try {
        const values = {
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
          // Email metadata for verification
          emailSubject: email.subject,
          emailFrom: email.from,
          emailDate: email.date,
          extractedAmounts: parsed.extractedAmounts || [],
          confidenceScore: (parsed.confidenceScore || 0).toFixed(2),
          isManuallyReviewed: false,
        };

        if (existing) {
          await db
            .update(invoices)
            .set(values)
            .where(eq(invoices.id, existing.id));
        } else {
          await db
            .insert(invoices)
            .values(values)
            .onConflictDoNothing(); // Prevent duplicates on (userId, gmailMessageId)
        }
        
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
