"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DetectedService {
  id: string;
  name: string;
  logoUrl?: string;
  category: string;
  emailCount: number;
}

const mockDetectedServices: DetectedService[] = [
  { id: "1", name: "Vercel", category: "Cloud", emailCount: 12 },
  { id: "2", name: "GitHub", category: "CI/CD", emailCount: 24 },
  { id: "3", name: "OpenAI", category: "AI/ML", emailCount: 8 },
  { id: "4", name: "Supabase", category: "Databases", emailCount: 6 },
  { id: "5", name: "Railway", category: "Cloud", emailCount: 3 },
  { id: "6", name: "Stripe", category: "Auth/Infra", emailCount: 18 },
  { id: "7", name: "Sentry", category: "Monitoring", emailCount: 5 },
  { id: "8", name: "Linear", category: "Productivity", emailCount: 4 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"scanning" | "selection" | "parsing">("scanning");
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [detectedServices] = useState<DetectedService[]>(mockDetectedServices);

  // Simulate scanning delay
  useState(() => {
    const timer = setTimeout(() => setStep("selection"), 2000);
    return () => clearTimeout(timer);
  });

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
    // TODO: Actually parse selected invoices
    await new Promise((resolve) => setTimeout(resolve, 3000));
    router.push("/dashboard");
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
            Extracting billing information from {selectedServices.size} services
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
            We found {detectedServices.length} services in your inbox
          </p>
        </div>

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
                  <span>{service.name}</span>
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

        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={selectedServices.size === 0}
          >
            Continue with {selectedServices.size} services
          </Button>
        </div>
      </div>
    </div>
  );
}
