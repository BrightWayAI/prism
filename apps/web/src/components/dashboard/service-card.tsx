"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "./sparkline";
import { formatCurrency } from "@/lib/utils";

interface ServiceCardProps {
  name: string;
  logoUrl?: string;
  category: string;
  currentSpend: number;
  previousSpend: number;
  totalSpend: number;
  invoiceCount: number;
  currency?: string;
  spendHistory: number[];
  onClick?: () => void;
}

export function ServiceCard({
  name,
  logoUrl,
  category,
  currentSpend,
  previousSpend,
  totalSpend,
  invoiceCount,
  currency = "USD",
  spendHistory,
  onClick,
}: ServiceCardProps) {
  const percentChange = previousSpend > 0
    ? ((currentSpend - previousSpend) / previousSpend) * 100
    : 0;
  const isIncrease = percentChange > 0;
  
  // Show total spend if no current month spend
  const displaySpend = currentSpend > 0 ? currentSpend : totalSpend;
  const spendLabel = currentSpend > 0 ? "This month" : "Total";

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-card/80"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={name}
                  width={24}
                  height={24}
                  className="rounded"
                />
              ) : (
                <span className="text-sm font-medium">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-medium">{name}</h3>
              <Badge variant="secondary" className="mt-1">
                {category}
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <p className="tabular-nums text-lg font-semibold">
              {formatCurrency(displaySpend, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {spendLabel} · {invoiceCount} invoice{invoiceCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {spendHistory.length > 1 && (
          <div className="mt-4">
            <Sparkline data={spendHistory} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
