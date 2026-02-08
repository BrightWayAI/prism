import { db } from "@prism/db";
import { aiIntegrations, aiUsageRecords } from "@prism/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "../encryption";
import {
  fetchOpenAIUsage,
  fetchOpenAICosts,
  transformOpenAIData,
} from "../integrations/openai";
import {
  fetchAnthropicUsage,
  fetchAnthropicCosts,
  transformAnthropicData,
} from "../integrations/anthropic";

export async function syncIntegration(integrationId: string): Promise<void> {
  const [integration] = await db
    .select()
    .from(aiIntegrations)
    .where(eq(aiIntegrations.id, integrationId));

  if (!integration) {
    throw new Error(`Integration not found: ${integrationId}`);
  }

  const apiKey = decrypt(integration.apiKeyEncrypted);

  // Sync last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  try {
    let records: ReturnType<typeof transformOpenAIData> = [];

    if (integration.provider === "openai") {
      const [usageData, costData] = await Promise.all([
        fetchOpenAIUsage(apiKey, startDate, endDate),
        fetchOpenAICosts(apiKey, startDate, endDate),
      ]);
      records = transformOpenAIData(usageData, costData);
    } else if (integration.provider === "anthropic") {
      const [usageData, costData] = await Promise.all([
        fetchAnthropicUsage(apiKey, startDate, endDate),
        fetchAnthropicCosts(apiKey, startDate, endDate),
      ]);
      records = transformAnthropicData(usageData, costData);
    }

    // Upsert records using ON CONFLICT
    for (const record of records) {
      await db
        .insert(aiUsageRecords)
        .values({
          userId: integration.userId,
          integrationId: integration.id,
          provider: integration.provider,
          recordedDate: new Date(record.recorded_date),
          model: record.model,
          inputTokens: record.input_tokens,
          outputTokens: record.output_tokens,
          cachedTokens: record.cached_tokens,
          requests: record.requests,
          costUsd: record.cost_usd.toString(),
        })
        .onConflictDoUpdate({
          target: [
            aiUsageRecords.userId,
            aiUsageRecords.provider,
            aiUsageRecords.recordedDate,
            aiUsageRecords.model,
          ],
          set: {
            inputTokens: record.input_tokens,
            outputTokens: record.output_tokens,
            cachedTokens: record.cached_tokens,
            requests: record.requests,
            costUsd: record.cost_usd.toString(),
          },
        });
    }

    // Update integration status
    await db
      .update(aiIntegrations)
      .set({
        status: "active",
        lastSyncAt: new Date(),
        lastError: null,
      })
      .where(eq(aiIntegrations.id, integrationId));
  } catch (error) {
    // Update integration with error
    await db
      .update(aiIntegrations)
      .set({
        status: "error",
        lastError: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(aiIntegrations.id, integrationId));

    throw error;
  }
}

export async function syncAllIntegrations(): Promise<void> {
  const integrations = await db
    .select({ id: aiIntegrations.id })
    .from(aiIntegrations)
    .where(eq(aiIntegrations.status, "active"));

  for (const integration of integrations) {
    try {
      await syncIntegration(integration.id);
    } catch (error) {
      console.error(`Failed to sync integration ${integration.id}:`, error);
      // Continue with other integrations
    }
  }
}
