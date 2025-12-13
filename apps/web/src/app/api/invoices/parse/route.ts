import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchInvoiceEmails, getEmailContent } from "@/lib/gmail";
import { parseInvoiceEmail } from "@/lib/parser";
import { db, invoices, vendors, userVendors } from "@prism/db";
import { eq, and, ilike, inArray } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { daysBack = 90, vendorIds } = body;

  try {
    // Get the vendors we're searching for
    let vendorsToProcess;
    if (vendorIds && vendorIds.length > 0) {
      vendorsToProcess = await db.query.vendors.findMany({
        where: inArray(vendors.id, vendorIds),
      });
    } else {
      vendorsToProcess = await db.query.vendors.findMany();
    }

    console.log(`Processing ${vendorsToProcess.length} vendors`);

    // Get emails from known vendors only
    const messages = await searchInvoiceEmails(session.user.id, {
      daysBack,
      vendorIds,
      maxResults: 100,
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

      // Match vendor by multiple strategies
      let vendorId: string | null = null;
      let matchedVendor = null;
      
      const emailFrom = email.from.toLowerCase();
      const emailSubject = email.subject.toLowerCase();
      
      // Strategy 1: Special handling for Google payments (payments-noreply@google.com)
      // Differentiate Google Cloud vs Google Workspace by subject line
      if (emailFrom.includes("payments-noreply@google.com")) {
        if (emailSubject.includes("google workspace") || emailSubject.includes("workspace")) {
          matchedVendor = vendorsToProcess.find(v => v.slug === "google-workspace");
          if (matchedVendor) {
            console.log(`Matched Google Workspace from subject`);
          }
        } else if (emailSubject.includes("google cloud") || emailSubject.includes("cloud")) {
          matchedVendor = vendorsToProcess.find(v => v.slug === "gcp");
          if (matchedVendor) {
            console.log(`Matched Google Cloud from subject`);
          }
        }
        // Default to Google Cloud for payments-noreply@google.com
        if (!matchedVendor) {
          matchedVendor = vendorsToProcess.find(v => v.slug === "gcp");
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
          for (const v of vendorsToProcess) {
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
        for (const v of vendorsToProcess) {
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
        for (const v of vendorsToProcess) {
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
        
      if (matchedVendor) {
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

      // Store invoice with email metadata for verification
      try {
        const insertResult = await db.insert(invoices).values({
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
        }).onConflictDoNothing(); // Prevent duplicates on (userId, gmailMessageId)
        
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
