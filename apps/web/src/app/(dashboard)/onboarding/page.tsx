"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Clock, Zap, Calendar } from "lucide-react";

interface DetectedService {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  category: string;
  emailCount: number;
}

const SCAN_OPTIONS = [
  { value: 30, label: "Last 30 days", description: "Quick scan", icon: Zap },
  { value: 90, label: "Last 90 days", description: "Recommended", icon: Clock },
  { value: 180, label: "Last 6 months", description: "Comprehensive", icon: Calendar },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"duration" | "scanning" | "selection" | "parsing">("duration");
  const [daysBack, setDaysBack] = useState(90);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [detectedServices, setDetectedServices] = useState<DetectedService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState({ success: 0, failed: 0, total: 0 });

  const startScan = async () => {
    setStep("scanning");
    try {
      const res = await fetch("/api/scan", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysBack }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to scan inbox");
      }
      const data = await res.json();
      setDetectedServices(data.services || []);
      setSelectedServices(new Set((data.services || []).map((s: DetectedService) => s.id)));
      setStep("selection");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan inbox");
      setStep("selection");
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedServices(new Set(detectedServices.map((s) => s.id)));
  };

  const handleContinue = async () => {
    setStep("parsing");
    setParseProgress({ success: 0, failed: 0, total: 0 });
    
    try {
      const res = await fetch("/api/invoices/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysBack,
          vendorIds: Array.from(selectedServices),
        }),
      });
      
      if (!res.ok) throw new Error("Failed to parse invoices");
      
      const result = await res.json();
      setParseProgress({ 
        success: result.success, 
        failed: result.failed,
        total: result.success + result.failed + result.skipped 
      });
      
      // Brief delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1500));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse invoices");
      // Still go to dashboard even if parsing fails
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

  // Duration selection step
  if (step === "duration") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome to Prism</h1>
            <p className="mt-2 text-muted-foreground">
              Let's scan your inbox for SaaS invoices and receipts
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium">How far back should we scan?</h2>
            <div className="grid gap-3">
              {SCAN_OPTIONS.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all ${
                    daysBack === option.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "hover:bg-card/80"
                  }`}
                  onClick={() => setDaysBack(option.value)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`rounded-full p-2 ${
                      daysBack === option.value ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <option.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                    {daysBack === option.value && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button size="lg" onClick={startScan}>
              Start Scanning
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Scanning step
  if (step === "scanning") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 text-xl font-semibold">Scanning your inbox...</h2>
          <p className="mt-2 text-muted-foreground">
            Looking for invoices from {SCAN_OPTIONS.find(o => o.value === daysBack)?.label.toLowerCase()}
          </p>
        </div>
      </div>
    );
  }

  // Parsing step
  if (step === "parsing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 text-xl font-semibold">Processing invoices...</h2>
          <p className="mt-2 text-muted-foreground">
            {parseProgress.success > 0 
              ? `Found ${parseProgress.success} invoices so far`
              : "Extracting billing data from emails"}
          </p>
          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Service selection step
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Select services to track</h2>
          <p className="mt-2 text-muted-foreground">
            {detectedServices.length > 0
              ? `We found ${detectedServices.length} services with billing emails`
              : "No services with invoices detected in your inbox."}
          </p>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>

        {detectedServices.length > 0 && (
          <>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select all
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {detectedServices.map((service) => (
                <Card
                  key={service.id}
                  className={`cursor-pointer transition-colors ${
                    selectedServices.has(service.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-card/80"
                  }`}
                  onClick={() => toggleService(service.id)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        {selectedServices.has(service.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                        <span>{service.name}</span>
                      </div>
                      <span className="text-xs font-normal text-muted-foreground">
                        {service.emailCount} email{service.emailCount !== 1 ? "s" : ""}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <span className="text-sm text-muted-foreground">
                      {service.category}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-center gap-4 pt-4">
          {detectedServices.length === 0 ? (
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={selectedServices.size === 0}
            >
              Import {selectedServices.size} service{selectedServices.size !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
