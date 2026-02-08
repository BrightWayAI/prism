"use client";

import { useEffect, useState, useCallback } from "react";
import { SummaryCards } from "@/components/ai-costs/summary-cards";
import { ProviderChart } from "@/components/ai-costs/provider-chart";
import { ModelChart } from "@/components/ai-costs/model-chart";
import { DailyTrendChart } from "@/components/ai-costs/daily-trend-chart";
import { AlertsList } from "@/components/ai-costs/alerts-list";
import { IntegrationsPanel } from "@/components/ai-costs/integrations-panel";

interface DashboardData {
  currentMonth: {
    total: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    dailyTrend: Array<{ date: string; amount: number }>;
    inputTokens: number;
    outputTokens: number;
  };
  lastMonth: {
    total: number;
  };
  projectedSpend: number;
  budgets: Array<{
    id: string;
    provider: string | null;
    monthlyLimitUsd: string;
    alertThresholdPercent: number;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    provider: string | null;
    message: string;
    acknowledged: boolean;
    createdAt: string;
  }>;
}

interface Integration {
  id: string;
  provider: string;
  status: string;
  apiKeyHint: string;
  lastSyncAt: string | null;
  lastError: string | null;
}

export default function AICostsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-costs/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-costs/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations);
      }
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchIntegrations()]).finally(() => setLoading(false));
  }, [fetchDashboard, fetchIntegrations]);

  const handleAddIntegration = async (provider: string, apiKey: string) => {
    const res = await fetch("/api/ai-costs/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add integration");
    }

    await Promise.all([fetchIntegrations(), fetchDashboard()]);
  };

  const handleDeleteIntegration = async (provider: string) => {
    await fetch("/api/ai-costs/integrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });

    await Promise.all([fetchIntegrations(), fetchDashboard()]);
  };

  const handleAcknowledgeAlert = async (id: string) => {
    await fetch("/api/ai-costs/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, acknowledged: true }),
    });

    await fetchDashboard();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const totalBudget = dashboardData?.budgets.find((b) => !b.provider);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Cost Dashboard</h1>
      </div>

      <SummaryCards
        currentMonthTotal={dashboardData?.currentMonth.total || 0}
        lastMonthTotal={dashboardData?.lastMonth.total || 0}
        projectedSpend={dashboardData?.projectedSpend || 0}
        budgets={dashboardData?.budgets || []}
        inputTokens={dashboardData?.currentMonth.inputTokens || 0}
        outputTokens={dashboardData?.currentMonth.outputTokens || 0}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <DailyTrendChart
            dailyTrend={dashboardData?.currentMonth.dailyTrend || []}
            budgetLimit={totalBudget ? Number(totalBudget.monthlyLimitUsd) : undefined}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <ProviderChart byProvider={dashboardData?.currentMonth.byProvider || {}} />
            <ModelChart byModel={dashboardData?.currentMonth.byModel || {}} />
          </div>
        </div>

        <div className="space-y-6">
          <IntegrationsPanel
            integrations={integrations}
            onAdd={handleAddIntegration}
            onDelete={handleDeleteIntegration}
            onRefresh={() => Promise.all([fetchIntegrations(), fetchDashboard()])}
          />

          <AlertsList
            alerts={dashboardData?.alerts || []}
            onAcknowledge={handleAcknowledgeAlert}
          />
        </div>
      </div>
    </div>
  );
}
