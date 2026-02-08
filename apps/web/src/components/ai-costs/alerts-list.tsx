"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, Bell, TrendingUp, XCircle, Check } from "lucide-react";

interface Alert {
  id: string;
  type: string;
  provider: string | null;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

interface AlertsListProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}

const ALERT_ICONS = {
  budget_warning: AlertTriangle,
  budget_exceeded: XCircle,
  anomaly: TrendingUp,
  sync_error: Bell,
};

const ALERT_COLORS = {
  budget_warning: "bg-yellow-100 text-yellow-800",
  budget_exceeded: "bg-red-100 text-red-800",
  anomaly: "bg-purple-100 text-purple-800",
  sync_error: "bg-gray-100 text-gray-800",
};

export function AlertsList({ alerts, onAcknowledge }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-muted-foreground">No alerts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => {
          const Icon = ALERT_ICONS[alert.type as keyof typeof ALERT_ICONS] || Bell;
          const colorClass = ALERT_COLORS[alert.type as keyof typeof ALERT_COLORS] || "bg-gray-100";

          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                alert.acknowledged ? "opacity-60" : ""
              }`}
            >
              <div className={`rounded-full p-2 ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {alert.type.replace("_", " ")}
                  </Badge>
                  {alert.provider && (
                    <Badge variant="secondary" className="text-xs">
                      {alert.provider}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(alert.createdAt)}
                  </span>
                </div>
                <p className="text-sm">{alert.message}</p>
              </div>
              {!alert.acknowledged && (
                <Button variant="ghost" size="sm" onClick={() => onAcknowledge(alert.id)}>
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
