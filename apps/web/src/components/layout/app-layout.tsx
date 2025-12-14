"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      <main className={`transition-all duration-300 ${collapsed ? "pl-16" : "pl-64"}`}>
        <div className="mx-auto max-w-6xl p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
