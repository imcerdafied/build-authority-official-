import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Mailto CTA inbox — swap this single constant to redirect inquiries.
const CONTACT_EMAIL = "mc@bspg.build";
const CONTACT_SUBJECT = "Authority — interested in an engagement";
const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}`;

// === Nav ===
function LandingNav() {
  return (
    <nav
      aria-label="Primary"
      className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between"
    >
      <Link to="/" aria-label="Authority home" className="leading-none">
        <img src="/logo.svg" alt="Authority" className="h-7 w-auto" />
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <a
          href="#how-it-works"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          How it works
        </a>
        <a
          href="#engagement"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Engagement
        </a>
      </div>

      <Link
        to="/auth"
        className="inline-flex items-center rounded-[2px] bg-foreground px-5 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
      >
        Sign in
      </Link>
    </nav>
  );
}

// === Hero ===
function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32">
      <div className="flex flex-col items-center text-center">
        <h1
          className="font-sans font-semibold text-foreground tracking-tight leading-[1.05]"
          style={{ fontSize: "clamp(2.5rem, 7vw, 4.5rem)", letterSpacing: "-0.025em" }}
        >
          Make bets stick<span className="text-accent">.</span>
        </h1>

        <p className="mt-6 max-w-[680px] text-base md:text-lg text-muted-foreground leading-relaxed">
          Authority is a system of record for strategic bets. A durable record of what was decided,
          who owns it, and what it moved.
        </p>

        <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
          <a
            href={CONTACT_HREF}
            className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Start the conversation
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            See how it works
          </a>
        </div>
        <div className="mt-3 grid w-full max-w-3xl grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-2">
          <p>Bundled with every BSPG embedded team engagement.</p>
          <p>Sample bet, the full loop, and what we mean by drift — below.</p>
        </div>
      </div>

      <DemoCard />

      <p className="mt-6 text-center text-xs text-muted-foreground max-w-2xl mx-auto px-4">
        Every bet carries its owner, its outcome, its upside, its risk, and a live signal for whether it's actually moving.
      </p>
    </section>
  );
}

// === Hero demo ===
function DemoCard() {
  const decisionIn = `Should we go after platform pricing? Sales is asking. Engineering says 6 months. The board wants a Q3 story. Two enterprise customers just churned on per-seat. Notes are scattered across three docs and a Slack thread. Nobody owns it yet.`;

  const recordOut = `# BET — Platform pricing expansion
# Owner: [Name]
# Sponsor: [Name]
# Lifecycle: Defined
# Outcome target:
#   Move top-50 enterprise accounts to platform
#   pricing by Q4 to defend the renewal base.
# Upside: $12M+ expansion ARR
# Risk:   $20–30M ARR over 24 months
# Trigger: 2+ stalled renewals on per-seat`;

  return (
    <div
      id="demo"
      className="mt-16 mx-auto w-full max-w-[600px] bg-card border border-border rounded-[2px] p-4 md:p-6"
      style={{ borderWidth: "0.5px" }}
    >
      <div className="flex flex-col sm:flex-row items-stretch gap-4 sm:gap-3">
        {/* Decision In */}
        <div className="flex-1 bg-muted rounded-lg p-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground mb-3">
            Decision in
          </p>
          <p className="text-sm text-foreground leading-relaxed">{decisionIn}</p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center text-accent sm:px-1" aria-hidden="true">
          <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
        </div>

        {/* Durable Record Out */}
        <div className="flex-1 bg-foreground rounded-lg p-5">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-accent mb-3">
            Durable record out
          </p>
          <pre className="font-mono text-[12px] leading-relaxed text-background/90 whitespace-pre-wrap break-words">
            {recordOut}
          </pre>
        </div>
      </div>
    </div>
  );
}

// === Section helpers ===
function Section({
  id,
  variant = "default",
  children,
}: {
  id?: string;
  variant?: "default" | "card";
  children: React.ReactNode;
}) {
  const bg = variant === "card" ? "bg-card border-y border-border" : "";
  const style = variant === "card" ? ({ borderWidth: "0.5px 0" } as React.CSSProperties) : undefined;
  return (
    <section id={id} className={bg} style={style}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">{children}</div>
    </section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl md:text-[28px] font-semibold text-foreground tracking-tight leading-snug max-w-3xl">
      {children}
    </h2>
  );
}

// === The Drift ===
const ERRORS = [
  ["ERR_BET_DRIFT", "Strategic bets exist in decks but never show up in the work."],
  ["ERR_NO_OWNERSHIP", "Decisions made in rooms nobody can point back to."],
  ["ERR_VANITY_TRACKING", "Dashboards show activity, not whether the bet is moving."],
  ["ERR_QUIET_KILL", "Bets die without explicit retirement. The org just stops talking about them."],
] as const;

const RESOLVED = [
  ["01", "A durable, named record of every strategic bet."],
  ["02", "Explicit owner and sponsor on every bet."],
  ["03", "Lifecycle tracking with outcome targets and movement signals."],
  ["04", "Explicit retirement, naming wins and losses."],
] as const;

function Drift() {
  return (
    <Section variant="card">
      <SectionHeading>
        Strategy on slides doesn&apos;t show up in the work<span className="text-accent">.</span>
      </SectionHeading>
      <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-3xl">
        Strategic bets drift quietly. Owners get fuzzy. Movement stalls. The org keeps moving but
        the named bet stops being a named bet. Authority catches the drift before it ships.
      </p>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground mb-4">
            Errors
          </p>
          <div className="space-y-4">
            {ERRORS.map(([code, desc]) => (
              <div key={code} className="grid grid-cols-[auto_1fr] gap-4">
                <span className="font-mono text-xs text-signal-red shrink-0 pt-0.5">{code}</span>
                <span className="text-sm text-foreground leading-snug">{desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground mb-4">
            Resolved
          </p>
          <div className="space-y-4">
            {RESOLVED.map(([n, desc]) => (
              <div key={n} className="grid grid-cols-[auto_1fr] gap-4">
                <span className="font-mono text-xs text-muted-foreground shrink-0 pt-0.5">{n}</span>
                <span className="text-sm text-foreground leading-snug">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// === How It Works (the loop) ===
const LOOP_STEPS = [
  { call: "place_bets()", body: "Leadership names the 5–7 bets that matter this cycle. Each one gets a slot." },
  { call: "frame_outcomes()", body: "Each bet gets a target, an owner, a sponsor, an upside, a risk." },
  { call: "track_movement()", body: "Movement is logged. Stalls flag automatically. Decisions stay attached." },
  { call: "close_loop()", body: "Bets retire with evidence. Wins and losses are named, not absorbed." },
];

function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHeading>
        Bets travel a loop, not a slide<span className="text-accent">.</span>
      </SectionHeading>
      <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-3xl">
        Authority is the surface that closes the loop between leadership intent and execution
        evidence. Each strategic bet moves through four steps — auditable, owned, named.
      </p>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        {LOOP_STEPS.map((step) => (
          <div key={step.call} className="grid grid-cols-[auto_1fr] gap-4">
            <span className="font-mono text-sm text-accent shrink-0 pt-0.5">{step.call}</span>
            <span className="text-base text-foreground leading-relaxed">{step.body}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// === What Authority Is ===
const TENETS = [
  {
    n: "01",
    title: "Decision log",
    body:
      "Every strategic bet gets a single, durable record. Title, owner, sponsor, category, outcome target, upside and risk exposure. Visible to leadership. Editable by the owner.",
  },
  {
    n: "02",
    title: "Lifecycle states",
    body:
      "Defined → Activated → Shipping → Closed → Retired. State transitions are timestamped and named. No bet quietly disappears.",
  },
  {
    n: "03",
    title: "Outcome anchoring",
    body:
      "Every bet has a measurable outcome target. Upside and risk are quantified in ARR, conversion, retention, or cost. Judged against the outcome, not against activity.",
  },
  {
    n: "04",
    title: "Movement tracking",
    body:
      "Authority watches whether each bet is actually moving. Stalls trigger nudges. Decisions and changes are logged. Leadership has live visibility into what's working.",
  },
];

function WhatAuthorityIs() {
  return (
    <Section variant="card">
      <SectionHeading>
        Four properties that hold the system up<span className="text-accent">.</span>
      </SectionHeading>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        {TENETS.map((t) => (
          <div key={t.n}>
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-2">
              {t.n}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// === Engagement ===
function Engagement() {
  return (
    <Section id="engagement">
      <SectionHeading>
        Authority is the OS. BSPG is the operator<span className="text-accent">.</span>
      </SectionHeading>
      <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-3xl">
        Authority is not a SaaS subscription. It is the operating system that runs underneath every
        BSPG embedded team engagement. We bring the software. We bring the operators. We make the
        rigor real.
      </p>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground mb-2">
            Tools track
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Traditional planning tools give your team a place to write strategic intent down. They do
            not make intent durable. They do not surface drift. They do not connect to the work that ships.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground mb-2">
            We embed
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Authority is the system of record. The BSPG embedded team is the operator that makes it
            run. Bundled with every engagement — not licensed or sold standalone.
          </p>
        </div>
      </div>
    </Section>
  );
}

// === Sample Bet ===
function SampleBet() {
  return (
    <Section variant="card">
      <SectionHeading>
        A bet, recorded<span className="text-accent">.</span>
      </SectionHeading>
      <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-3xl">
        Every strategic bet lives as a single durable record. Here is what one looks like in Authority.
      </p>

      <div className="mt-12 rounded-[2px] overflow-hidden border border-border bg-background" style={{ borderWidth: "0.5px" }}>
        {/* Dark header bar */}
        <div className="bg-foreground text-background px-6 py-5">
          <div className="text-xs text-background/50 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            GOAL: Defend the enterprise renewal base in 2026
          </div>
          <p className="text-lg md:text-xl font-semibold leading-snug mb-4">
            1. Move top-50 enterprise accounts from per-seat to platform pricing.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <Meta label="Category" value="Growth (Revenue Defense)" />
            <Meta label="Owner" value="[Name]" />
            <Meta label="Sponsor" value="[Name]" />
            <Meta label="Lifecycle" value={<Pill>Defined</Pill>} />
          </div>
        </div>
        {/* Light body */}
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Outcome target
            </p>
            <div className="rounded-[2px] border border-border bg-muted p-4" style={{ borderWidth: "0.5px" }}>
              <p className="text-sm leading-relaxed">
                Move 50 of the top-50 enterprise accounts to platform pricing by end of Q4 2026 to
                defend ~$74M in renewal-at-risk ARR.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ExposurePanel tone="upside" label="Upside" value="$12M+ ARR" body="Platform pricing unlocks expansion across the top-50 over 24 months." />
            <ExposurePanel tone="risk" label="Risk" value="$20–30M ARR" body="Renewal exposure if customers continue to price-anchor on per-seat math." />
          </div>
        </div>
      </div>
    </Section>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-background/40 mb-1">{label}</p>
      <div className="text-background/90">{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.05em] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block mr-1.5" />
      {children}
    </span>
  );
}

function ExposurePanel({
  tone,
  label,
  value,
  body,
}: {
  tone: "upside" | "risk";
  label: string;
  value: string;
  body: string;
}) {
  const colors =
    tone === "upside"
      ? { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", eyebrow: "text-green-700" }
      : { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", eyebrow: "text-red-700" };
  return (
    <div className={`rounded-[2px] ${colors.bg} ${colors.border} border p-4`} style={{ borderWidth: "0.5px" }}>
      <p className={`font-mono text-[10px] uppercase tracking-[0.08em] ${colors.eyebrow} mb-1`}>{label}</p>
      <p className={`text-base font-semibold ${colors.text} leading-tight mb-1`}>{value}</p>
      <p className={`text-xs ${colors.text}/80 leading-relaxed`}>{body}</p>
    </div>
  );
}

// === Final CTA ===
function FinalCta() {
  return (
    <Section>
      <div className="max-w-3xl">
        <h2
          className="font-sans font-semibold text-foreground tracking-tight leading-[1.05]"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.025em" }}
        >
          Bring rigor to your bets<span className="text-accent">.</span>
        </h2>
        <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Authority is included in every BSPG embedded team engagement. Tell us what you are trying
          to ship.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href={CONTACT_HREF}
            className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Start the conversation
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Section>
  );
}

// === Footer ===
function Footer() {
  return (
    <footer className="border-t border-border bg-card" style={{ borderTopWidth: "0.5px" }}>
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Authority" className="h-5 w-auto opacity-80" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            a BSPG operating system
          </span>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          © {new Date().getFullYear()} BSPG
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingNav />
      <Hero />
      <main className="flex-1">
        <Drift />
        <HowItWorks />
        <WhatAuthorityIs />
        <Engagement />
        <SampleBet />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
