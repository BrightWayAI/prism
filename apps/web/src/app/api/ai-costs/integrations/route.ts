import { auth } from "@/lib/auth";
import { db } from "@prism/db";
import { aiIntegrations } from "@prism/db/schema";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { encrypt, getKeyHint } from "@/lib/encryption";
import { validateOpenAIKey } from "@/lib/integrations/openai";
import { validateAnthropicKey } from "@/lib/integrations/anthropic";
import { syncIntegration } from "@/lib/services/sync";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider, apiKey } = await request.json();

  if (!["openai", "anthropic"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // Validate API key
  let isValid = false;
  if (provider === "openai") {
    isValid = await validateOpenAIKey(apiKey);
  } else if (provider === "anthropic") {
    if (!apiKey.startsWith("sk-ant-admin-")) {
      return NextResponse.json(
        { error: "Anthropic requires an Admin API key (starts with sk-ant-admin-)" },
        { status: 400 }
      );
    }
    isValid = await validateAnthropicKey(apiKey);
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
  }

  // Upsert integration
  const existing = await db
    .select()
    .from(aiIntegrations)
    .where(
      and(eq(aiIntegrations.userId, session.user.id), eq(aiIntegrations.provider, provider))
    );

  let integration;

  if (existing.length > 0) {
    [integration] = await db
      .update(aiIntegrations)
      .set({
        apiKeyEncrypted: encrypt(apiKey),
        apiKeyHint: getKeyHint(apiKey),
        status: "active",
        lastError: null,
      })
      .where(eq(aiIntegrations.id, existing[0].id))
      .returning();
  } else {
    [integration] = await db
      .insert(aiIntegrations)
      .values({
        userId: session.user.id,
        provider,
        apiKeyEncrypted: encrypt(apiKey),
        apiKeyHint: getKeyHint(apiKey),
        status: "active",
      })
      .returning();
  }

  // Trigger initial sync
  try {
    await syncIntegration(integration.id);
  } catch (e) {
    console.error("Initial sync failed:", e);
  }

  return NextResponse.json({
    success: true,
    integration: {
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      apiKeyHint: integration.apiKeyHint,
    },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await db
    .select({
      id: aiIntegrations.id,
      provider: aiIntegrations.provider,
      status: aiIntegrations.status,
      apiKeyHint: aiIntegrations.apiKeyHint,
      lastSyncAt: aiIntegrations.lastSyncAt,
      lastError: aiIntegrations.lastError,
    })
    .from(aiIntegrations)
    .where(eq(aiIntegrations.userId, session.user.id));

  return NextResponse.json({ integrations });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await request.json();

  await db
    .delete(aiIntegrations)
    .where(
      and(eq(aiIntegrations.userId, session.user.id), eq(aiIntegrations.provider, provider))
    );

  return NextResponse.json({ success: true });
}
