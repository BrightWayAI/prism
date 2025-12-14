"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { PrismLogo } from "@/components/ui/prism-logo";

const VENDOR_LOGOS = [
  { name: "AWS", color: "#FF9900", logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" },
  { name: "Vercel", color: "#000000", logo: "https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png" },
  { name: "OpenAI", color: "#10A37F", logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" },
  { name: "Stripe", color: "#635BFF", logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" },
  { name: "GitHub", color: "#181717", logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" },
  { name: "Slack", color: "#4A154B", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" },
  { name: "Figma", color: "#F24E1E", logo: "https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg" },
  { name: "Railway", color: "#0B0D0E", logo: "https://railway.app/brand/logo-light.svg" },
  { name: "Anthropic", color: "#D4A574", logo: "https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg" },
  { name: "Supabase", color: "#3ECF8E", logo: "https://seeklogo.com/images/S/supabase-logo-DCC676FFE2-seeklogo.com.png" },
  { name: "Linear", color: "#5E6AD2", logo: "https://asset.brandfetch.io/iduDa181eM/idYYbqOlKi.png" },
  { name: "Notion", color: "#000000", logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" },
  { name: "Datadog", color: "#632CA6", logo: "https://imgix.datadoghq.com/img/dd_logo_n_70x75.png" },
  { name: "MongoDB", color: "#47A248", logo: "https://www.mongodb.com/assets/images/global/favicon.ico" },
  { name: "Twilio", color: "#F22F46", logo: "https://www.twilio.com/assets/icons/twilio-icon-512.png" },
  { name: "Render", color: "#46E3B7", logo: "https://render.com/favicon.png" },
];

const FEATURES = [
  {
    icon: "📧",
    title: "Connect Gmail",
    description: "One-click Google sign-in. We only read receipts from known dev tool vendors—never your personal emails.",
  },
  {
    icon: "🔍",
    title: "Auto-detect your tools",
    description: "Prism scans for invoices from 80+ services—AWS, OpenAI, Vercel, Anthropic, Supabase, and more. You choose which to track.",
  },
  {
    icon: "📊",
    title: "See where your money goes",
    description: "One dashboard shows every subscription, sorted by cost. Get alerts for spikes. Export for taxes. No more surprises.",
  },
];

const USE_CASES = [
  {
    icon: "🤖",
    title: "Track AI API spend",
    description: "OpenAI, Anthropic, and Replicate usage can spike without warning. See trends before they become $500 problems.",
  },
  {
    icon: "👻",
    title: "Catch zombie subscriptions",
    description: "That monitoring tool from your last project? Still billing. Prism surfaces forgotten tools before they auto-renew.",
  },
  {
    icon: "📄",
    title: "Taxes in 30 seconds",
    description: "Export a clean CSV of all your dev tool expenses. No more hunting through Gmail for receipts every April.",
  },
  {
    icon: "🔔",
    title: "Never miss a renewal",
    description: "Annual subscriptions sneak up on you. Get notified before JetBrains, Figma, or any yearly tool renews.",
  },
];

const PAIN_POINTS = [
  "\"Where's that Anthropic receipt?\" — you, at tax time",
  "No idea if your OpenAI spend went up 20% or 200%",
  "Discovering you paid $600/year for a tool you used once",
  "Annual renewals that hit when you least expect them",
  "That sinking \"wait, I'm still paying for THAT?\" moment",
];

const SOLUTIONS = [
  "Every receipt automatically detected and organized",
  "Monthly spend dashboard — see totals at a glance",
  "Spot zombie subscriptions before they renew",
  "Get alerts when spend spikes unexpectedly",
  "Export clean reports for taxes in one click",
];

// Floating invoice animation component
function ScatteredLogos({ isGathered }: { isGathered: boolean }) {
  const positions = useRef(
    VENDOR_LOGOS.map(() => ({
      x: Math.random() * 160 - 80,
      y: Math.random() * 160 - 80,
      rotation: Math.random() * 60 - 30,
      delay: Math.random() * 0.5,
    }))
  );

  return (
    <div className="relative mx-auto h-[400px] w-full max-w-2xl overflow-hidden">
      {/* Center target - Prism logo */}
      <div 
        className={`absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-2xl transition-all duration-1000 ${
          isGathered ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        P
      </div>
      
      {/* Scattered vendor logos */}
      {VENDOR_LOGOS.map((vendor, i) => {
        const pos = positions.current[i];
        const angle = (i / VENDOR_LOGOS.length) * 2 * Math.PI;
        const gatheredX = Math.cos(angle) * 120;
        const gatheredY = Math.sin(angle) * 120;
        
        return (
          <div
            key={vendor.name}
            className="absolute left-1/2 top-1/2 transition-all ease-out"
            style={{
              transform: isGathered
                ? `translate(calc(-50% + ${gatheredX}px), calc(-50% + ${gatheredY}px)) rotate(0deg) scale(1)`
                : `translate(calc(-50% + ${pos.x * 2.5}px), calc(-50% + ${pos.y * 2.5}px)) rotate(${pos.rotation}deg) scale(0.9)`,
              transitionDuration: `${1500 + pos.delay * 800}ms`,
              transitionDelay: isGathered ? `${pos.delay * 500}ms` : "0ms",
            }}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 bg-card shadow-lg transition-all duration-500 overflow-hidden ${
                isGathered ? "border-primary/50 shadow-primary/20" : "border-border"
              }`}
              style={{
                boxShadow: isGathered ? `0 0 20px ${vendor.color}40` : undefined,
              }}
              title={vendor.name}
            >
              <img 
                src={vendor.logo} 
                alt={vendor.name}
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  // Fallback to first letter if image fails
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `<span class="text-lg font-bold">${vendor.name[0]}</span>`;
                }}
              />
            </div>
          </div>
        );
      })}
      
      {/* Connection lines when gathered */}
      {isGathered && (
        <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 5 }}>
          {VENDOR_LOGOS.map((_, i) => {
            const angle = (i / VENDOR_LOGOS.length) * 2 * Math.PI;
            const x = Math.cos(angle) * 120 + 50 + "%";
            const y = Math.sin(angle) * 120 + 50 + "%";
            return (
              <line
                key={i}
                x1="50%"
                y1="50%"
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-primary/20"
                style={{
                  strokeDasharray: 150,
                  strokeDashoffset: 150,
                  animation: `drawLine 0.5s ease-out ${0.5 + i * 0.05}s forwards`,
                }}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

// Animated counter component
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

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export default function HomePage() {
  const [isGathered, setIsGathered] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<HTMLDivElement>(null);

  // Trigger gather animation on scroll when logos section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isGathered) {
          setIsGathered(true);
        }
      },
      { threshold: 0.5 }
    );

    if (logosRef.current) {
      observer.observe(logosRef.current);
    }

    return () => observer.disconnect();
  }, [isGathered]);

  // Auto-rotate features (slower - 6 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length);
    }, 6000);
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
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-sm font-medium text-primary animate-fade-in">For developers drowning in subscriptions</p>
        <h1 className="mt-4 animate-fade-in text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Your AI stack is costing
          <br />
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            more than you think
          </span>
        </h1>
        
        <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground animate-fade-in-delay">
          OpenAI, Vercel, Supabase, Railway, Anthropic... the average developer now pays for 20+ tools. 
          Prism connects to Gmail and shows you exactly where your money goes—before the next surprise bill.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-delay-2">
          <Link
            href="/login"
            className="group inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-lg font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
          >
            Start Free Trial
            <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <p className="text-sm text-muted-foreground">7 days free. No credit card required.</p>
        </div>

        {/* Animated scattered logos */}
        <div ref={logosRef} className="mt-12">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            {isGathered ? "Automatically detects receipts from 80+ dev tools" : "Your receipts are scattered everywhere..."}
          </p>
          <ScatteredLogos isGathered={isGathered} />
          <button
            onClick={() => setIsGathered(!isGathered)}
            className="mt-4 text-sm text-primary hover:underline"
          >
            {isGathered ? "Scatter again" : "Bring them together"}
          </button>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/40 bg-secondary/30 py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-6 sm:gap-16">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">80+ vendors</p>
            <p className="text-sm text-muted-foreground">supported</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">5-minute</p>
            <p className="text-sm text-muted-foreground">setup</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">Read-only</p>
            <p className="text-sm text-muted-foreground">Gmail access</p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            The AI era broke your budget
          </h2>
          <div className="mt-8 space-y-4 text-lg text-muted-foreground">
            <p>Two years ago, you had AWS and maybe Heroku.</p>
            <p>
              Now you&apos;re paying for 3-4 AI APIs. Multiple databases. Several deployment platforms. 
              Monitoring. Auth. Email. Analytics. Vector storage.
            </p>
            <p>
              Each one bills differently—monthly, annual, usage-based, metered. Receipts are scattered 
              across your inbox. And somewhere in there, you&apos;re paying for tools you forgot you signed up for.
            </p>
          </div>
        </div>
      </section>

      {/* Before/After comparison */}
      <section className="border-y border-border/40 bg-secondary/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Your SaaS spending is a black box
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            You&apos;re juggling 20+ subscriptions. Prism brings clarity to the chaos.
          </p>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {/* Without Prism */}
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

            {/* With Prism */}
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
            Three steps to clarity
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            Connect once, track forever. Prism does the heavy lifting.
          </p>

          {/* Interactive steps */}
          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {/* Step selector */}
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
                  {/* Progress bar */}
                  {activeFeature === i && (
                    <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-primary/20">
                      <div 
                        className="h-full bg-primary"
                        style={{
                          animation: "progress 3s linear forwards",
                        }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Visual preview */}
            <div className="relative hidden lg:block">
              <div className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                {/* Step 1: Gmail connection */}
                <div className={`p-8 transition-all duration-500 ${activeFeature === 0 ? "opacity-100" : "absolute inset-0 opacity-0"}`}>
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/50 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10 text-2xl">
                      📧
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Connect with Google</p>
                      <p className="text-sm text-muted-foreground">Read-only access to billing emails</p>
                    </div>
                    <div className="h-8 w-8 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center text-primary text-sm">✓</div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><span className="text-green-500">✓</span> Only reads billing emails</p>
                    <p className="flex items-center gap-2"><span className="text-green-500">✓</span> Can&apos;t send or delete</p>
                    <p className="flex items-center gap-2"><span className="text-green-500">✓</span> Revoke anytime</p>
                  </div>
                </div>
                
                {/* Step 2: Service detection */}
                <div className={`p-8 transition-all duration-500 ${activeFeature === 1 ? "opacity-100" : "absolute inset-0 opacity-0"}`}>
                  <p className="text-sm text-muted-foreground mb-4">Scanning inbox...</p>
                  <div className="space-y-3">
                    {["AWS", "Vercel", "OpenAI", "GitHub", "Slack"].map((service, i) => (
                      <div 
                        key={service}
                        className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 animate-slide-in"
                        style={{ animationDelay: `${i * 150}ms` }}
                      >
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {service[0]}
                        </div>
                        <span className="font-medium">{service}</span>
                        <span className="ml-auto text-sm text-green-500">Found</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Step 3: Dashboard */}
                <div className={`p-8 transition-all duration-500 ${activeFeature === 2 ? "opacity-100" : "absolute inset-0 opacity-0"}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground">This month</p>
                      <p className="text-3xl font-bold">$2,847</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-green-500">↓ 12%</p>
                      <p className="text-muted-foreground">vs last month</p>
                    </div>
                  </div>
                  <div className="h-24 flex items-end gap-1">
                    {[40, 65, 45, 80, 55, 70, 50, 90, 60, 75, 85, 65].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 rounded-t bg-primary/60 transition-all hover:bg-primary"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Jan</span>
                    <span>Dec</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="border-y border-border/40 bg-secondary/20 py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Your spend, at a glance
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            See exactly where your money goes. Filter by month, drill into any service, 
            get alerts when costs spike.
          </p>

          {/* Mock dashboard */}
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="border-b border-border bg-secondary/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/50"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500/50"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500/50"></div>
                </div>
                {/* Alert badge */}
                <div className="flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-500">
                  🔔 OpenAI spend up 47% vs last month
                </div>
              </div>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">This month</p>
                  <p className="text-4xl font-bold">$2,847.00</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">12 services</p>
                  <p className="text-sm text-green-500">↓ 8% vs last month</p>
                </div>
              </div>
              
              <div className="mt-8 space-y-4">
                {[
                  { name: "AWS", amount: "$1,234.56", category: "Cloud", logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" },
                  { name: "Vercel", amount: "$420.00", category: "Cloud", logo: "https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png" },
                  { name: "OpenAI", amount: "$389.00", category: "AI/ML", logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" },
                  { name: "GitHub", amount: "$252.00", category: "CI/CD", logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" },
                  { name: "Slack", amount: "$180.00", category: "Productivity", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" },
                ].map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background overflow-hidden">
                        <img 
                          src={service.logo} 
                          alt={service.name}
                          className="h-6 w-6 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<span class="text-sm font-medium">${service.name[0]}</span>`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.category}</p>
                      </div>
                    </div>
                    <p className="font-semibold tabular-nums">{service.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Built for how developers actually work
          </h2>
          
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-6">
                <div className="text-3xl">{item.icon}</div>
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="border-y border-border/40 bg-secondary/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Your data stays yours
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            We only read emails from known billing addresses. Your personal emails are never touched.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🔒", title: "Read-only access", desc: "We can't send, delete, or modify your emails. Ever." },
              { icon: "🎯", title: "Vendor emails only", desc: "Prism only reads receipts from 80+ known dev tools. Personal conversations are ignored." },
              { icon: "🚫", title: "No data selling", desc: "Your spend data is yours. We don't sell it, share it, or use it for ads." },
              { icon: "🗑️", title: "Delete anytime", desc: "Revoke access with one click. We delete all your data immediately." },
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

      {/* Pricing */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            One subscription that pays for itself
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            Most users find at least one forgotten tool in their first scan. That&apos;s $40+ saved before your trial ends.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Pricing card */}
            <div className="rounded-2xl border-2 border-primary bg-card p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">$40<span className="text-lg font-normal text-muted-foreground">/month</span></p>
                </div>
                <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                  7 days free
                </span>
              </div>
              
              <ul className="mt-6 space-y-3">
                {[
                  "Unlimited services tracked",
                  "80+ vendor detection",
                  "Spend alerts & notifications",
                  "Renewal reminders",
                  "CSV export for taxes",
                  "6-month invoice history",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="text-primary">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Link
                href="/login"
                className="mt-8 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-lg font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Start Free Trial
              </Link>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                No credit card required to start. Cancel anytime.
              </p>
            </div>
            
            {/* Value callout */}
            <div className="flex flex-col justify-center rounded-2xl border border-border bg-secondary/30 p-8">
              <p className="text-2xl">💡</p>
              <h3 className="mt-4 text-xl font-semibold">The math is simple</h3>
              <p className="mt-4 text-muted-foreground">
                If Prism helps you find just <span className="font-semibold text-foreground">ONE</span> forgotten $50/month subscription, 
                it pays for itself—and you pocket the difference every month after.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Average user discovers 2-3 tools they forgot they were paying for.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-primary py-24 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Stop guessing what you spend
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Connect Gmail. See your costs. Cut the waste.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-background px-8 text-lg font-medium text-foreground transition-all hover:bg-background/90 hover:scale-105"
          >
            Start Free Trial →
          </Link>
          <p className="mt-4 text-sm text-primary-foreground/60">
            7 days free. Then $40/month. Cancel anytime.
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
