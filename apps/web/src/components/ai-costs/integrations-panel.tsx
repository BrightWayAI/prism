"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Integration {
  id: string;
  provider: string;
  status: string;
  apiKeyHint: string;
  lastSyncAt: string | null;
  lastError: string | null;
}

interface IntegrationsPanelProps {
  integrations: Integration[];
  onAdd: (provider: string, apiKey: string) => Promise<void>;
  onDelete: (provider: string) => Promise<void>;
  onRefresh: () => void;
}

const STATUS_ICONS = {
  active: CheckCircle,
  error: XCircle,
  invalid: AlertCircle,
};

const STATUS_COLORS = {
  active: "text-green-500",
  error: "text-red-500",
  invalid: "text-yellow-500",
};

export function IntegrationsPanel({
  integrations,
  onAdd,
  onDelete,
  onRefresh,
}: IntegrationsPanelProps) {
  const [showAddForm, setShowAddForm] = useState<"openai" | "anthropic" | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOpenAI = integrations.some((i) => i.provider === "openai");
  const hasAnthropic = integrations.some((i) => i.provider === "anthropic");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddForm || !apiKey) return;

    setLoading(true);
    setError(null);

    try {
      await onAdd(showAddForm, apiKey);
      setShowAddForm(null);
      setApiKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add integration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Integrations</CardTitle>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {integrations.map((integration) => {
          const StatusIcon = STATUS_ICONS[integration.status as keyof typeof STATUS_ICONS];
          const statusColor = STATUS_COLORS[integration.status as keyof typeof STATUS_COLORS];

          return (
            <div
              key={integration.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {integration.provider === "openai" ? "OAI" : "ANT"}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{integration.provider}</span>
                    <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>****{integration.apiKeyHint}</span>
                    {integration.lastSyncAt && (
                      <>
                        <span>•</span>
                        <span>Synced {formatRelativeTime(integration.lastSyncAt)}</span>
                      </>
                    )}
                  </div>
                  {integration.lastError && (
                    <p className="text-xs text-red-500 mt-1">{integration.lastError}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(integration.provider)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        {showAddForm ? (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Badge>{showAddForm === "openai" ? "OpenAI" : "Anthropic"}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(null);
                  setApiKey("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                showAddForm === "openai"
                  ? "sk-proj-... (Project API key with usage/billing permissions)"
                  : "sk-ant-admin-... (Admin API key)"
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button type="submit" size="sm" disabled={loading || !apiKey}>
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </form>
        ) : (
          <div className="flex gap-2">
            {!hasOpenAI && (
              <Button variant="outline" size="sm" onClick={() => setShowAddForm("openai")}>
                <Plus className="mr-1 h-4 w-4" />
                OpenAI
              </Button>
            )}
            {!hasAnthropic && (
              <Button variant="outline" size="sm" onClick={() => setShowAddForm("anthropic")}>
                <Plus className="mr-1 h-4 w-4" />
                Anthropic
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
