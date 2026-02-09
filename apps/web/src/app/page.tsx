"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { PrismLogo } from "@/components/ui/prism-logo";

const FEATURES = [
  {
    icon: "🔑",
    title: "Connect your API keys",
    description: "Add your OpenAI and Anthropic admin API keys. We encrypt them with AES-256 and only use them to fetch usage data.",
  },
  {
    icon: "📊",
    title: "See your real costs",
    description: "View spending by provider, model, and day. No more surprises at the end of the month.",
  },
  {
    icon: "🔔",
    title: "Get alerts before it's too late",
    description: "Set budgets and get notified when you hit 80% or detect unusual spending spikes.",
  },
];

const PAIN_POINTS = [
  "Your OpenAI bill tripled and you have no idea why",
  "Claude costs are spread across 5 different projects",
  "You only find out about overages when the invoice hits",
  "No visibility into which models are eating your budget",
  "Usage-based pricing makes forecasting impossible",
];

const SOLUTIONS = [
  "Real-time spend tracking across OpenAI and Anthropic",
  "See costs broken down by model (GPT-4o, Claude 3.5, etc.)",
  "Budget alerts before you hit your limit",
  "Daily spending trends to catch spikes early",
  "Projected month-end costs based on current usage",
];

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const increment = target / (duration / 16);
          const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return <span ref={ref}>${count.toLocaleString()}</span>;
}

export default function HomePage() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <PrismLogo size="md" />
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Now tracking OpenAI + Anthropic
        </div>
        
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Your AI API costs are
          <br />
          <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            out of control
          </span>
        </h1>
        
        <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground">
          GPT-4o, Claude 3.5, embeddings, fine-tuning... AI API costs add up fast and billing dashboards are useless.
          Prism gives you real-time visibility and alerts before you blow your budget.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="group inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-lg font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
          >
            Start Tracking Free
            <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <p className="text-sm text-muted-foreground">No credit card required</p>
        </div>

        {/* Provider logos */}
        <div className="mt-16 flex items-center justify-center gap-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-10 w-10 rounded-lg bg-[#10a37f]/10 flex items-center justify-center">
              <span className="text-[#10a37f] font-bold">AI</span>
            </div>
            <span className="font-medium">OpenAI</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-10 w-10 rounded-lg bg-[#d97757]/10 flex items-center justify-center">
              <span className="text-[#d97757] font-bold">A</span>
            </div>
            <span className="font-medium">Anthropic</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 bg-secondary/30 py-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-12 px-6 sm:gap-20">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">30 days</p>
            <p className="text-sm text-muted-foreground">of usage history</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">Real-time</p>
            <p className="text-sm text-muted-foreground">cost tracking</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">AES-256</p>
            <p className="text-sm text-muted-foreground">encrypted keys</p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            AI billing dashboards are broken
          </h2>
          <div className="mt-8 space-y-4 text-lg text-muted-foreground">
            <p>OpenAI shows you a monthly total. Anthropic gives you a usage report buried in settings.</p>
            <p>
              Neither tells you which model is eating your budget, which day you spiked, 
              or warns you before you hit your limit.
            </p>
            <p>
              You find out you spent $2,000 on GPT-4o when the invoice hits your inbox.
              By then it's too late.
            </p>
          </div>
        </div>
      </section>

      {/* Before/After */}
      <section className="border-y border-border/40 bg-secondary/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Stop guessing what you're spending
          </h2>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8">
              <h3 className="text-lg font-semibold text-destructive">Without Prism</h3>
              <ul className="mt-6 space-y-4">
                {PAIN_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="text-destructive">✕</span>
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-primary bg-card p-8">
              <h3 className="text-lg font-semibold text-primary">With Prism</h3>
              <ul className="mt-6 space-y-4">
                {SOLUTIONS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="text-primary">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Set up in 2 minutes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            Connect your API keys and start tracking immediately.
          </p>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              {FEATURES.map((feature, i) => (
                <button
                  key={feature.title}
                  onClick={() => setActiveFeature(i)}
                  className={`w-full rounded-xl border-2 p-6 text-left transition-all ${
                    activeFeature === i
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl transition-colors ${
                      activeFeature === i ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}>
                      {feature.icon}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${activeFeature === i ? "text-primary" : "text-muted-foreground"}`}>
                        Step {i + 1}
                      </p>
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
                      <p className={`mt-1 text-sm transition-all ${
                        activeFeature === i ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Dashboard preview */}
            <div className="relative hidden lg:block">
              <div className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="border-b border-border bg-secondary/50 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/50"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500/50"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500/50"></div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground">This month</p>
                      <p className="text-3xl font-bold">$1,847.23</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-500 text-sm">↑ 23%</p>
                      <p className="text-xs text-muted-foreground">vs last month</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { model: "gpt-4o", cost: "$892.45", percent: 48 },
                      { model: "claude-3-5-sonnet", cost: "$534.12", percent: 29 },
                      { model: "gpt-4o-mini", cost: "$245.80", percent: 13 },
                      { model: "text-embedding-3", cost: "$174.86", percent: 10 },
                    ].map((item) => (
                      <div key={item.model} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{item.model}</span>
                          <span className="text-muted-foreground">{item.cost}</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary">
                          <div 
                            className="h-2 rounded-full bg-primary" 
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <p className="text-sm text-yellow-600 font-medium">
                      ⚠️ Budget alert: 82% of $2,000 limit reached
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="border-y border-border/40 bg-secondary/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Your API keys are safe
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            We take security seriously. Your keys are encrypted and we only use them to fetch usage data.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🔐", title: "AES-256 encryption", desc: "API keys are encrypted at rest with industry-standard encryption." },
              { icon: "📖", title: "Read-only access", desc: "We only fetch usage data. We can't make API calls or modify anything." },
              { icon: "🗑️", title: "Delete anytime", desc: "Remove your integration with one click. We delete your keys immediately." },
              { icon: "🔒", title: "No data selling", desc: "Your usage data is yours. We don't sell it or share it." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="text-3xl">{item.icon}</div>
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Stop getting surprised by AI bills
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Connect your OpenAI and Anthropic accounts in 2 minutes. See exactly where your money goes.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-lg font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105"
          >
            Start Tracking Free →
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. Set up in 2 minutes.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Prism by Brightway AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
