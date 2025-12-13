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

Analyze the following email content and extract billing/invoice information.

Return ONLY a valid JSON object with these fields:
{
  "vendorName": "string - the company name sending the invoice/receipt",
  "amount": number - the total amount charged (positive number, no currency symbols),
  "currency": "string - 3-letter currency code like USD, EUR, GBP",
  "invoiceDate": "string - ISO date format YYYY-MM-DD",
  "billingPeriodStart": "string | null - ISO date if mentioned",
  "billingPeriodEnd": "string | null - ISO date if mentioned", 
  "billingFrequency": "monthly | annual | usage | one_time | null",
  "invoiceNumber": "string | null - invoice/receipt number if present",
  "description": "string | null - brief description of what was charged",
  "confidenceScore": number - 0 to 1, how confident you are in this extraction
}

Important:
- Extract the TOTAL amount charged, not individual line items
- If you cannot determine a field with confidence, use null
- For amounts, extract just the number (e.g., 29.99 not "$29.99")
- Only return the JSON object, no other text

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
