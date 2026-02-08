interface OpenAIUsageResult {
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens: number;
  num_model_requests: number;
  model: string | null;
}

interface OpenAIUsageBucket {
  start_time: number;
  end_time: number;
  results: OpenAIUsageResult[];
}

interface OpenAIUsageResponse {
  data: OpenAIUsageBucket[];
  has_more: boolean;
  next_page?: string;
}

interface OpenAICostResult {
  amount: {
    value: number;
    currency: string;
  };
  line_item: string;
}

interface OpenAICostBucket {
  start_time: number;
  end_time: number;
  results: OpenAICostResult[];
}

interface OpenAICostResponse {
  data: OpenAICostBucket[];
  has_more: boolean;
}

export async function fetchOpenAIUsage(
  apiKey: string,
  startDate: Date,
  endDate: Date
): Promise<OpenAIUsageResponse> {
  const startTime = Math.floor(startDate.getTime() / 1000);
  const endTime = Math.floor(endDate.getTime() / 1000);

  const url = new URL("https://api.openai.com/v1/organization/usage/completions");
  url.searchParams.set("start_time", startTime.toString());
  url.searchParams.set("end_time", endTime.toString());
  url.searchParams.set("bucket_width", "1d");
  url.searchParams.set("group_by", "model");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function fetchOpenAICosts(
  apiKey: string,
  startDate: Date,
  endDate: Date
): Promise<OpenAICostResponse> {
  const startTime = Math.floor(startDate.getTime() / 1000);
  const endTime = Math.floor(endDate.getTime() / 1000);

  const url = new URL("https://api.openai.com/v1/organization/costs");
  url.searchParams.set("start_time", startTime.toString());
  url.searchParams.set("end_time", endTime.toString());
  url.searchParams.set("bucket_width", "1d");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await fetchOpenAIUsage(apiKey, yesterday, now);
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

export function transformOpenAIData(
  usageResponse: OpenAIUsageResponse,
  costResponse: OpenAICostResponse
): NormalizedUsageRecord[] {
  const records = new Map<string, NormalizedUsageRecord>();

  // Process usage data
  for (const bucket of usageResponse.data) {
    const date = new Date(bucket.start_time * 1000).toISOString().split("T")[0];

    for (const result of bucket.results) {
      const model = result.model || "unknown";
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
      record.input_tokens += result.input_tokens || 0;
      record.output_tokens += result.output_tokens || 0;
      record.cached_tokens += result.input_cached_tokens || 0;
      record.requests += result.num_model_requests || 0;
    }
  }

  // Process cost data and add to records
  for (const bucket of costResponse.data) {
    const date = new Date(bucket.start_time * 1000).toISOString().split("T")[0];

    for (const result of bucket.results) {
      // line_item format is like "gpt-4o-2024-08-06" or "gpt-4o-2024-08-06-batch"
      const model = result.line_item.replace(/-batch$/, "");
      const key = `${date}:${model}`;

      if (records.has(key)) {
        records.get(key)!.cost_usd += result.amount.value;
      } else {
        // Cost without matching usage (rare but possible)
        records.set(key, {
          recorded_date: date,
          model,
          input_tokens: 0,
          output_tokens: 0,
          cached_tokens: 0,
          requests: 0,
          cost_usd: result.amount.value,
        });
      }
    }
  }

  return Array.from(records.values());
}
