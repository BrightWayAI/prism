import OpenAI from "openai";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface ParsedInvoice {
  vendorName: string;
  amount: number | null;
  currency: string;
  invoiceDate: string;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  billingFrequency: "monthly" | "annual" | "usage" | "one_time" | null;
  invoiceNumber: string | null;
  description: string | null;
  confidenceScore: number;
  extractedAmounts: string[]; // All amounts found in email for verification
}

// Pre-extract dollar amounts from text using regex
function extractDollarAmounts(text: string): { amounts: number[]; primaryAmount: number | null } {
  const amounts: number[] = [];
  let primaryAmount: number | null = null;
  
  // High-priority patterns - these usually indicate the actual charge amount
  const primaryPatterns = [
    /payment\s+amount\s+of\s+\$\s*([\d,]+\.?\d*)/gi,
    /your\s+payment\s+of\s+\$\s*([\d,]+\.?\d*)/gi,
    /total\s+charged[:\s]+\$?\s*([\d,]+\.?\d*)/gi,
    /amount\s+charged[:\s]+\$?\s*([\d,]+\.?\d*)/gi,
    /total\s+amount[:\s]+\$?\s*([\d,]+\.?\d*)/gi,
    /amount\s+due[:\s]+\$?\s*([\d,]+\.?\d*)/gi,
    /you\s+paid[:\s]+\$?\s*([\d,]+\.?\d*)/gi,
    /charged\s+\$\s*([\d,]+\.?\d*)/gi,
  ];
  
  // Try primary patterns first to find the main amount
  for (const pattern of primaryPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const numStr = match[1].replace(/,/g, "");
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0 && num < 1000000) {
        primaryAmount = num;
        break;
      }
    }
  }
  
  // General patterns to find all amounts
  const generalPatterns = [
    /\$\s*([\d,]+\.?\d*)/g,
    /USD\s*([\d,]+\.?\d*)/gi,
    /([\d,]+\.?\d*)\s*USD/gi,
  ];
  
  for (const pattern of generalPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numStr = match[1].replace(/,/g, "");
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0 && num < 1000000) {
        amounts.push(num);
      }
    }
  }
  
  const uniqueAmounts = [...new Set(amounts)].sort((a, b) => b - a);
  return { amounts: uniqueAmounts, primaryAmount };
}

const EXTRACTION_PROMPT = `You are extracting invoice/receipt data from an email. Return valid JSON only.

FOUND DOLLAR AMOUNTS IN EMAIL: {amounts}

Extract the billing information. The amounts above were found in the email - pick the one that represents the TOTAL charge.

Return this exact JSON structure:
{
  "vendorName": "company name",
  "amount": <number or null - use one of the amounts above if this is an invoice>,
  "currency": "USD",
  "invoiceDate": "YYYY-MM-DD",
  "billingPeriodStart": null,
  "billingPeriodEnd": null,
  "billingFrequency": null,
  "invoiceNumber": null,
  "description": null,
  "confidenceScore": <0.0-1.0>
}

Rules:
- amount: Pick the total charge from the amounts list. Use null only if NO amounts were found or this isn't a real invoice.
- confidenceScore: 0.9+ if clear invoice/receipt with amount, 0.5-0.8 if unclear, below 0.5 if NOT an invoice (newsletter, notification, etc.)

Email Subject: {subject}
From: {from}
Date: {date}

Content (first 4000 chars):
{content}`;

export async function parseInvoiceEmail(email: {
  subject: string;
  from: string;
  date: string;
  content: string;
}): Promise<ParsedInvoice | null> {
  // Pre-extract dollar amounts using regex
  const fullText = `${email.subject} ${email.content}`;
  const { amounts: foundAmounts, primaryAmount } = extractDollarAmounts(fullText);
  
  console.log(`Found amounts in "${email.subject}":`, { primaryAmount, allAmounts: foundAmounts.slice(0, 5) });
  
  // Format amounts as strings for storage
  const extractedAmountsStr = foundAmounts.slice(0, 10).map(a => `$${a.toFixed(2)}`);
  
  // If no dollar amounts found at all, skip the API call
  if (foundAmounts.length === 0) {
    console.log(`No dollar amounts found in email, skipping: "${email.subject}"`);
    return {
      vendorName: extractVendorFromEmail(email.from),
      amount: null,
      currency: "USD",
      invoiceDate: new Date().toISOString().split("T")[0],
      billingPeriodStart: null,
      billingPeriodEnd: null,
      billingFrequency: null,
      invoiceNumber: null,
      description: null,
      confidenceScore: 0.3,
      extractedAmounts: [],
    };
  }

  // If we found a primary amount (from high-confidence patterns), use it directly
  if (primaryAmount !== null) {
    console.log(`Using primary amount from regex: $${primaryAmount}`);
    
    // Still call OpenAI for other fields but provide the amount hint
    const prompt = EXTRACTION_PROMPT
      .replace("{subject}", email.subject)
      .replace("{from}", email.from)
      .replace("{date}", email.date)
      .replace("{amounts}", `PRIMARY: ${primaryAmount} (use this), others: ${foundAmounts.slice(0, 5).join(", ")}`)
      .replace("{content}", email.content.slice(0, 4000));

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 512,
      });

      const text = response.choices[0]?.message?.content || "";
      const parsed = JSON.parse(text) as ParsedInvoice;
      
      // Override with our high-confidence primary amount
      parsed.amount = primaryAmount;
      parsed.confidenceScore = Math.max(parsed.confidenceScore, 0.9);
      parsed.extractedAmounts = extractedAmountsStr;
      
      return parsed;
    } catch (error) {
      console.error("Error parsing invoice:", error);
      // Return basic parsed result with primary amount
      return {
        vendorName: extractVendorFromEmail(email.from),
        amount: primaryAmount,
        currency: "USD",
        invoiceDate: new Date().toISOString().split("T")[0],
        billingPeriodStart: null,
        billingPeriodEnd: null,
        billingFrequency: null,
        invoiceNumber: null,
        description: null,
        confidenceScore: 0.8,
        extractedAmounts: extractedAmountsStr,
      };
    }
  }

  // No primary amount found, let OpenAI decide
  const prompt = EXTRACTION_PROMPT
    .replace("{subject}", email.subject)
    .replace("{from}", email.from)
    .replace("{date}", email.date)
    .replace("{amounts}", foundAmounts.slice(0, 10).join(", ") || "NONE FOUND")
    .replace("{content}", email.content.slice(0, 4000));

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 512,
    });

    const text = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text) as ParsedInvoice;
    
    // If model returned 0 but we found amounts, use the largest reasonable one
    if ((parsed.amount === 0 || parsed.amount === null) && foundAmounts.length > 0) {
      // Use the largest amount under $10000 as likely the total
      const likelyTotal = foundAmounts.find(a => a < 10000) || foundAmounts[0];
      if (likelyTotal && parsed.confidenceScore >= 0.5) {
        console.log(`Model returned ${parsed.amount}, using extracted amount: ${likelyTotal}`);
        parsed.amount = likelyTotal;
      }
    }
    
    // Add extracted amounts for verification
    parsed.extractedAmounts = extractedAmountsStr;
    
    return parsed;
  } catch (error) {
    console.error("Error parsing invoice:", error);
    return null;
  }
}

function extractVendorFromEmail(from: string): string {
  // Extract domain from email
  const match = from.match(/@([^>]+)/);
  if (match) {
    const domain = match[1].split(".")[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  return "Unknown";
}
