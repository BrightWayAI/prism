"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SpendSummary } from "@/components/dashboard/spend-summary";
import { ServiceCard } from "@/components/dashboard/service-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, Calendar, ChevronDown } from "lucide-react";

const DATE_RANGES = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 6 months", value: 180 },
  { label: "Last 12 months", value: 365 },
  { label: "All time", value: 0 },
];

interface Service {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  vendorLogo: string | null;
  vendorCategory: string;
  currentMonthSpend: number;
  previousMonthSpend: number;
  totalSpend: number;
  invoiceCount: number;
  currency: string;
  spendHistory: number[];
}

interface DashboardData {
  totalSpend: number;
  previousSpend: number;
  serviceCount: number;
  invoiceCount: number;
  services: Service[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(180); // Default to 6 months
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchDashboard = async (days: number = dateRange) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (days > 0) params.set("daysBack", days.toString());
      
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch dashboard");
      }
      const dashboardData = await res.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateRangeChange = (days: number) => {
    setDateRange(days);
    setShowDatePicker(false);
    fetchDashboard(days);
  };

  const handleScanInvoices = async () => {
    setParsing(true);
    try {
      // Parse invoices from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const res = await fetch("/api/invoices/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: sixMonthsAgo.toISOString(),
        }),
      });
      
      if (!res.ok) throw new Error("Failed to parse invoices");
      
      const result = await res.json();
      console.log("Parse result:", result);
      
      // Refresh dashboard data
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan invoices");
    } finally {
      setParsing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-xl font-bold">
            <span className="text-primary">Prism</span>
          </h1>
          <div className="flex items-center gap-4">
            <a href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
              Settings
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Dashboard</h2>
            <p className="text-muted-foreground">
              Your SaaS and developer tool spending overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Date Range Selector */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {DATE_RANGES.find(r => r.value === dateRange)?.label || "Select range"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              {showDatePicker && (
                <Card className="absolute right-0 top-12 z-50 w-48">
                  <CardContent className="p-2">
                    {DATE_RANGES.map((range) => (
                      <button
                        key={range.value}
                        className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary ${
                          dateRange === range.value ? "bg-secondary font-medium" : ""
                        }`}
                        onClick={() => handleDateRangeChange(range.value)}
                      >
                        {range.label}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={handleScanInvoices}
              disabled={parsing}
            >
              {parsing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {parsing ? "Scanning..." : "Scan Invoices"}
            </Button>
          </div>
        </div>

        {data && (
          <>
            <SpendSummary
              totalSpend={data.totalSpend}
              previousSpend={data.previousSpend}
              serviceCount={data.serviceCount}
              upcomingRenewals={0}
            />

            {data.services.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No invoices found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Click &quot;Scan Invoices&quot; to search your Gmail for billing emails
                </p>
                <Button className="mt-4" onClick={handleScanInvoices} disabled={parsing}>
                  {parsing ? "Scanning..." : "Scan Now"}
                </Button>
              </div>
            ) : (
              <div>
                <h3 className="mb-4 text-lg font-medium">
                  Services ({data.services.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {data.services.map((service) => (
                    <ServiceCard
                      key={service.vendorId}
                      name={service.vendorName}
                      logoUrl={service.vendorLogo || undefined}
                      category={service.vendorCategory}
                      currentSpend={service.currentMonthSpend}
                      previousSpend={service.previousMonthSpend}
                      totalSpend={service.totalSpend}
                      invoiceCount={service.invoiceCount}
                      spendHistory={service.spendHistory}
                      onClick={() => router.push(`/invoices?vendorId=${service.vendorId}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
