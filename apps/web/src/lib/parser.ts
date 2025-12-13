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
}

// Pre-extract dollar amounts from text using regex
function extractDollarAmounts(text: string): number[] {
  const amounts: number[] = [];
  
  // Match patterns like $29.99, $ 29.99, $1,234.56
  const patterns = [
    /\$\s*([\d,]+\.?\d*)/g,
    /USD\s*([\d,]+\.?\d*)/gi,
    /([\d,]+\.?\d*)\s*USD/gi,
    /Total[:\s]+\$?\s*([\d,]+\.?\d*)/gi,
    /Amount[:\s]+\$?\s*([\d,]+\.?\d*)/gi,
    /charged[:\s]+\$?\s*([\d,]+\.?\d*)/gi,
    /payment[:\s]+of?\s*\$?\s*([\d,]+\.?\d*)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numStr = match[1].replace(/,/g, "");
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0 && num < 1000000) {
        amounts.push(num);
      }
    }
  }
  
  return [...new Set(amounts)].sort((a, b) => b - a);
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
  const foundAmounts = extractDollarAmounts(fullText);
  
  console.log(`Found amounts in "${email.subject}":`, foundAmounts.slice(0, 5));
  
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
    };
  }

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
