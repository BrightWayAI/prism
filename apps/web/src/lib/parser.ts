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
  amount: number;
  currency: string;
  invoiceDate: string;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  billingFrequency: "monthly" | "annual" | "usage" | "one_time" | null;
  invoiceNumber: string | null;
  description: string | null;
  confidenceScore: number;
}

const EXTRACTION_PROMPT = `You are an expert at extracting invoice and billing information from emails.

Analyze the following email and extract the invoice/receipt/payment information.

CRITICAL: Look carefully for dollar amounts in these formats:
- "$XX.XX" or "$ XX.XX"
- "USD XX.XX" or "XX.XX USD"  
- "Total: $XX.XX" or "Amount: $XX.XX"
- "charged $XX.XX" or "payment of $XX.XX"
- Numbers followed by currency codes

Return ONLY a valid JSON object:
{
  "vendorName": "string - the company/service name (e.g., 'Slack', 'AWS', 'OpenAI')",
  "amount": number - the TOTAL amount charged as a positive number WITHOUT currency symbols (e.g., 29.99 not "$29.99"). Look for 'total', 'amount due', 'charged', 'payment'. If no amount found, use null NOT 0,
  "currency": "string - 3-letter code: USD, EUR, GBP. Default to USD if dollar sign used",
  "invoiceDate": "string - YYYY-MM-DD format, use the email date if invoice date not specified",
  "billingPeriodStart": "string | null - YYYY-MM-DD if mentioned",
  "billingPeriodEnd": "string | null - YYYY-MM-DD if mentioned", 
  "billingFrequency": "monthly | annual | usage | one_time | null",
  "invoiceNumber": "string | null - invoice/receipt/order number",
  "description": "string | null - what service/product was charged",
  "confidenceScore": number - 0.0 to 1.0. Use 0.9+ if clear amount found, 0.5-0.8 if amount unclear, below 0.5 if this is NOT an actual invoice/receipt
}

IMPORTANT:
- If this is NOT an invoice/receipt/payment confirmation (e.g., it's a newsletter, notification, or marketing email), set confidenceScore below 0.5
- If you cannot find a dollar amount, set amount to null (NOT 0)
- Extract the TOTAL charged, not subtotals or individual items

Email Subject: {subject}
From: {from}
Date: {date}

Email Content:
{content}`;

export async function parseInvoiceEmail(email: {
  subject: string;
  from: string;
  date: string;
  content: string;
}): Promise<ParsedInvoice | null> {
  const prompt = EXTRACTION_PROMPT
    .replace("{subject}", email.subject)
    .replace("{from}", email.from)
    .replace("{date}", email.date)
    .replace("{content}", email.content.slice(0, 8000));

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    });

    const text = response.choices[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", text);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedInvoice;
    return parsed;
  } catch (error) {
    console.error("Error parsing invoice:", error);
    return null;
  }
}
