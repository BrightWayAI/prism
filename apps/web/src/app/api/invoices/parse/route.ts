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

function normalizeVendorName(input: string) {
  return input
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(inc|incorporated|llc|ltd|limited|corp|corporation|company|co|gmbh|sarl|pte|plc)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const body = await request.json();
  const force = body?.force === true;

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
    const messages = await searchInvoiceEmails(userId, {
      daysBack,
      vendorIds,
      maxResults,
    });

    const results: { success: number; failed: number; skipped: number } = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    const concurrency = 5;

    const processOne = async (message: { id?: string | null; threadId?: string | null }) => {
      if (!message.id) return;

      // Check if already parsed
      const existing = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.userId, userId),
          eq(invoices.gmailMessageId, message.id)
        ),
      });

      // If we already have this email, we normally skip.
      // But if vendorId is null OR caller requested force reparse, re-run to backfill/fix dates.
      if (existing && existing.vendorId && !force) {
        results.skipped++;
        return;
      }

      // Get email content
      const email = await getEmailContent(userId, message.id);
      console.log(`Processing email: "${email.subject}" from "${email.from}"`);

      // Parse (fast-path skips LLM when primary amount is detectable via regex)
      let parsed;
      try {
        parsed = await parseInvoiceEmail(email);
      } catch (parseErr) {
        console.error("Parse error for message:", message.id, parseErr);
        results.failed++;
        return;
      }

      if (!parsed) {
        results.failed++;
        return;
      }

      // Skip non-invoices (newsletters, notifications, etc.)
      if (parsed.confidenceScore < 0.5) {
        results.failed++;
        return;
      }

      // Skip if no amount found (amount is null or 0)
      if (parsed.amount === null || parsed.amount === undefined || parsed.amount === 0) {
        results.failed++;
        return;
      }

      // Validate parsed data
      const amount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(String(parsed.amount));
      if (isNaN(amount) || amount <= 0) {
        results.failed++;
        return;
      }

      const emailHeaderDate = new Date(email.date);

      // Parse invoice date as a stable UTC date (avoid timezone shift issues that hide "this month" spend)
      let invoiceDate = parseInvoiceDateToUtc(parsed.invoiceDate);

      // Fallback to email header date if parsed date missing/invalid
      if (!invoiceDate || isNaN(invoiceDate.getTime())) {
        if (!isNaN(emailHeaderDate.getTime())) {
          invoiceDate = emailHeaderDate;
        } else {
          results.failed++;
          return;
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
        } else if (emailSubject.includes("google cloud") || emailSubject.includes("cloud")) {
          matchedVendor = vendorsForMatching.find((v) => v.slug === "gcp");
        }
        if (!matchedVendor) {
          matchedVendor = vendorsForMatching.find((v) => v.slug === "gcp");
        }
      }

      // Strategy 2: Check if this is a Stripe/payment processor receipt with vendor name in subject
      const isPaymentProcessor = emailFrom.includes("stripe.com") ||
        emailFrom.includes("paddle.com") ||
        emailFrom.includes("chargebee.com");

      if (!matchedVendor && isPaymentProcessor) {
        let vendorFromSubject: string | null = null;

        const dbaMatch = emailSubject.match(/\(dba\)\s*(\w+)/i);
        if (dbaMatch) {
          vendorFromSubject = dbaMatch[1];
        } else {
          const fromMatch = emailSubject.match(/from\s+(.+)$/i);
          if (fromMatch) {
            vendorFromSubject = fromMatch[1].trim();
            vendorFromSubject = vendorFromSubject
              .replace(/\s+(inc\.?|llc|corp\.?|corporation|ltd\.?|limited|co\.?)$/i, "")
              .trim();
          }
        }

        if (vendorFromSubject) {
          const subjectVendorLower = normalizeVendorName(vendorFromSubject);
          for (const v of vendorsForMatching) {
            const vNameLower = normalizeVendorName(v.name);
            const vSlugLower = normalizeVendorName(v.slug);
            if (vNameLower === subjectVendorLower ||
              vSlugLower === subjectVendorLower ||
              subjectVendorLower.includes(vNameLower) ||
              vNameLower.includes(subjectVendorLower)) {
              matchedVendor = v;
              break;
            }
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
            where: and(
              ilike(vendors.name, `%${parsed.vendorName}%`),
              inArray(vendors.slug, CURATED_VENDOR_SLUGS)
            ),
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
          return;
        }

        vendorId = matchedVendor.id;
        console.log(`Matched vendor: ${matchedVendor.name} for email from ${email.from}`);
          
        // Auto-add to user's tracked vendors if not already
        const existingUserVendor = await db.query.userVendors.findFirst({
          where: and(
            eq(userVendors.userId, userId),
            eq(userVendors.vendorId, matchedVendor.id)
          ),
        });
        
        if (!existingUserVendor) {
          await db.insert(userVendors).values({
            userId,
            vendorId: matchedVendor.id,
            isActive: true,
          });
        }
      }

      if (!vendorId) {
        console.log(`Skipping - could not match vendor for "${email.subject}" (parsed=${parsed.vendorName})`);
        results.failed++;
        return;
      }

      // Store invoice with email metadata for verification
      try {
        const values = {
          userId,
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

    for (let i = 0; i < messages.length; i += concurrency) {
      const batch = messages.slice(i, i + concurrency);
      await Promise.all(batch.map(processOne));
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
