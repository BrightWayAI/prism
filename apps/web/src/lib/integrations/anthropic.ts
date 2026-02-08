interface AnthropicUsageBucket {
  started_at: string;
  ended_at: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  model?: string;
}

interface AnthropicUsageResponse {
  data: AnthropicUsageBucket[];
  has_more: boolean;
  next_page?: string;
}

interface AnthropicCostBucket {
  started_at: string;
  ended_at: string;
  cost_usd: string; // String representing cents
  description?: string;
}

interface AnthropicCostResponse {
  data: AnthropicCostBucket[];
  has_more: boolean;
}

export async function fetchAnthropicUsage(
  adminApiKey: string,
  startDate: Date,
  endDate: Date
): Promise<AnthropicUsageResponse> {
  const url = new URL("https://api.anthropic.com/v1/organizations/usage_report/messages");
  url.searchParams.set("starting_at", startDate.toISOString());
  url.searchParams.set("ending_at", endDate.toISOString());
  url.searchParams.set("bucket_width", "1d");
  url.searchParams.append("group_by[]", "model");

  const response = await fetch(url.toString(), {
    headers: {
      "anthropic-version": "2023-06-01",
      "x-api-key": adminApiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function fetchAnthropicCosts(
  adminApiKey: string,
  startDate: Date,
  endDate: Date
): Promise<AnthropicCostResponse> {
  const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
  url.searchParams.set("starting_at", startDate.toISOString());
  url.searchParams.set("ending_at", endDate.toISOString());
  url.searchParams.set("bucket_width", "1d");

  const response = await fetch(url.toString(), {
    headers: {
      "anthropic-version": "2023-06-01",
      "x-api-key": adminApiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function validateAnthropicKey(adminApiKey: string): Promise<boolean> {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await fetchAnthropicUsage(adminApiKey, yesterday, now);
    return true;
  } catch {
    return false;
  }
}

export interface NormalizedUsageRecord {
  recorded_date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  requests: number;
  cost_usd: number;
}

export function transformAnthropicData(
  usageResponse: AnthropicUsageResponse,
  costResponse: AnthropicCostResponse
): NormalizedUsageRecord[] {
  const records = new Map<string, NormalizedUsageRecord>();

  // Process usage data
  for (const bucket of usageResponse.data) {
    const date = bucket.started_at.split("T")[0];
    const model = bucket.model || "unknown";
    const key = `${date}:${model}`;

    if (!records.has(key)) {
      records.set(key, {
        recorded_date: date,
        model,
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        requests: 0,
        cost_usd: 0,
      });
    }

    const record = records.get(key)!;
    record.input_tokens += bucket.input_tokens || 0;
    record.output_tokens += bucket.output_tokens || 0;
    record.cached_tokens +=
      (bucket.cache_read_input_tokens || 0) + (bucket.cache_creation_input_tokens || 0);
  }

  // Process cost data
  for (const bucket of costResponse.data) {
    const date = bucket.started_at.split("T")[0];
    // Cost is in cents as a string
    const costUsd = parseFloat(bucket.cost_usd) / 100;

    // Try to attribute to a model, otherwise use 'unknown'
    const model = bucket.description?.match(/claude-[\w.-]+/)?.[0] || "unknown";
    const key = `${date}:${model}`;

    if (records.has(key)) {
      records.get(key)!.cost_usd += costUsd;
    } else {
      records.set(key, {
        recorded_date: date,
        model,
        input_tokens: 0,
        output_tokens: 0,
        cached_tokens: 0,
        requests: 0,
        cost_usd: costUsd,
      });
    }
  }

  return Array.from(records.values());
}
