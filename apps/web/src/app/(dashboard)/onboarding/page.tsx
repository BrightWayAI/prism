"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

interface DetectedService {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  category: string;
  emailCount: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"scanning" | "selection" | "parsing">("scanning");
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [detectedServices, setDetectedServices] = useState<DetectedService[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState({ success: 0, total: 0 });

  useEffect(() => {
    const scanInbox = async () => {
      try {
        const res = await fetch("/api/scan", { method: "POST" });
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to scan inbox");
        }
        const data = await res.json();
        setDetectedServices(data.services);
        // Auto-select all detected services
        setSelectedServices(new Set(data.services.map((s: DetectedService) => s.id)));
        setStep("selection");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to scan inbox");
        setStep("selection");
      }
    };

    scanInbox();
  }, [router]);

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
    setParseProgress({ success: 0, total: selectedServices.size });
    
    try {
      // Parse invoices from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const res = await fetch("/api/invoices/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: sixMonthsAgo.toISOString(),
          vendorIds: Array.from(selectedServices),
        }),
      });
      
      if (!res.ok) throw new Error("Failed to parse invoices");
      
      const result = await res.json();
      setParseProgress({ success: result.success, total: result.success + result.failed + result.skipped });
      
      // Brief delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse invoices");
      router.push("/dashboard");
    }
  };

  if (step === "scanning") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 text-xl font-semibold">Scanning your inbox...</h2>
          <p className="mt-2 text-muted-foreground">
            Looking for invoices from popular developer tools
          </p>
        </div>
      </div>
    );
  }

  if (step === "parsing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h2 className="mt-6 text-xl font-semibold">Parsing invoices...</h2>
          <p className="mt-2 text-muted-foreground">
            Found {parseProgress.success} invoices so far
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Select services to track</h2>
          <p className="mt-2 text-muted-foreground">
            {detectedServices.length > 0
              ? `We found ${detectedServices.length} services in your inbox`
              : "No services detected. You can add them manually later."}
          </p>
          {error && (
            <p className="mt-2 text-sm text-destructive-foreground">{error}</p>
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
                        {service.emailCount} emails
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
              Continue with {selectedServices.size} services
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
