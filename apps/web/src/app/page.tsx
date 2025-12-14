import Link from "next/link";

const VENDOR_LOGOS = [
  { name: "AWS", color: "#FF9900" },
  { name: "Vercel", color: "#000000" },
  { name: "OpenAI", color: "#10A37F" },
  { name: "Stripe", color: "#635BFF" },
  { name: "GitHub", color: "#181717" },
  { name: "Slack", color: "#4A154B" },
  { name: "Figma", color: "#F24E1E" },
  { name: "Railway", color: "#0B0D0E" },
  { name: "Anthropic", color: "#D4A574" },
  { name: "Supabase", color: "#3ECF8E" },
  { name: "Linear", color: "#5E6AD2" },
  { name: "Notion", color: "#000000" },
];

const FEATURES = [
  {
    icon: "📧",
    title: "Connect Gmail",
    description: "Securely connect your inbox. We only read billing emails from known vendors.",
  },
  {
    icon: "🔍",
    title: "Auto-detect services",
    description: "Prism finds invoices from 80+ SaaS tools—AWS, Vercel, OpenAI, Stripe, and more.",
  },
  {
    icon: "📊",
    title: "See your spend",
    description: "One dashboard shows every subscription, sorted by cost. No more surprises.",
  },
];

const PAIN_POINTS = [
  "Invoices scattered across 20+ inboxes",
  "No idea what you're actually spending",
  "Surprise charges from forgotten trials",
  "Hours wasted tracking down receipts",
  "Finance team asking for expense reports",
];

const SOLUTIONS = [
  "Every invoice in one place",
  "Real-time spend visibility",
  "Catch unused subscriptions",
  "Export reports in seconds",
  "Stay on top of renewals",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-xl font-bold text-primary">Prism</span>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          For every scattered
          <br />
          <span className="text-primary">SaaS invoice</span>
        </h1>
        
        <div className="mx-auto mt-8 max-w-xl space-y-2 text-xl text-muted-foreground">
          <p>• See all your dev tool spend in one dashboard</p>
          <p>• Auto-detect invoices from Gmail</p>
          <p>• Never lose track of subscriptions again</p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started Free
          </Link>
          <p className="text-sm text-muted-foreground">No credit card required</p>
        </div>

        {/* Social proof */}
        <p className="mt-16 text-sm font-medium text-muted-foreground">
          TRACKS INVOICES FROM 80+ SERVICES
        </p>
        
        {/* Vendor logo ticker */}
        <div className="mt-6 flex flex-wrap justify-center gap-6">
          {VENDOR_LOGOS.map((vendor) => (
            <div
              key={vendor.name}
              className="flex h-10 w-20 items-center justify-center rounded-lg bg-secondary/50 text-xs font-medium text-muted-foreground"
            >
              {vendor.name}
            </div>
          ))}
        </div>
      </section>

      {/* Before/After comparison */}
      <section className="border-y border-border/40 bg-secondary/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Invoice chaos is over
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            Stop digging through emails. Prism automatically finds and organizes 
            every SaaS invoice so you always know what you're spending.
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

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">
                  {feature.icon}
                </div>
                <p className="mt-2 text-sm font-medium text-primary">Step {i + 1}</p>
                <h3 className="mt-2 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
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
            export for expense reports.
          </p>

          {/* Mock dashboard */}
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="border-b border-border bg-secondary/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/50"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500/50"></div>
                <div className="h-3 w-3 rounded-full bg-green-500/50"></div>
              </div>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between">
                <div>
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
                  { name: "AWS", amount: "$1,234.56", category: "Cloud" },
                  { name: "Vercel", amount: "$420.00", category: "Cloud" },
                  { name: "OpenAI", amount: "$389.00", category: "AI/ML" },
                  { name: "GitHub", amount: "$252.00", category: "CI/CD" },
                  { name: "Slack", amount: "$180.00", category: "Productivity" },
                ].map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-sm font-medium">
                        {service.name[0]}
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

      {/* Privacy */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Your data stays yours
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
            We only read emails from known billing addresses. Your personal emails are never touched.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🔒", title: "Read-only access", desc: "We can't send, delete, or modify emails" },
              { icon: "🎯", title: "Vendor emails only", desc: "Only billing emails from 80+ known services" },
              { icon: "🚫", title: "No personal data", desc: "We don't read your personal conversations" },
              { icon: "🗑️", title: "Delete anytime", desc: "Revoke access and we delete everything" },
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
      <section className="border-t border-border/40 bg-primary py-24 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Stop guessing what you spend on SaaS
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Connect your Gmail and see your entire SaaS spend in under 2 minutes.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-background px-8 text-lg font-medium text-foreground transition-colors hover:bg-background/90"
          >
            Get Started Free
          </Link>
          <p className="mt-4 text-sm text-primary-foreground/60">
            Free to use • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Prism. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
