import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { contactHref } from "@/lib/contact";

const CONTACT_HREF = contactHref("Authority_: interested in an engagement");

// === Nav — full-width, logo at left edge, pill at right edge ===
function LandingNav() {
  return (
    <nav
      aria-label="Primary"
      className="px-6 md:px-10 py-6 flex items-center justify-between"
    >
      <Link to="/" aria-label="Authority_ home" className="leading-none">
        <img src="/logo.svg" alt="Authority_" className="h-7 w-auto" />
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
        className="inline-flex items-center rounded-[2px] bg-foreground px-5 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Client Login
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
          Authority_ is a system of record for strategic bets. A durable record of what was decided,
          who owns it, and what it moved.
        </p>

        <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
          <a
            href={CONTACT_HREF}
            className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Start the conversation
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            See how it works
          </a>
        </div>
        <div className="mt-3 grid w-full max-w-3xl grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-2">
          <p>Bundled with every BSPG embedded team engagement.</p>
          <p>Sample bet, the loop, and what we mean by drift below.</p>
        </div>
      </div>

      <FlowDiagram />

      <p className="mt-6 text-center text-xs text-muted-foreground max-w-2xl mx-auto px-4">
        Every bet carries its owner, its outcome, its upside, its risk, and a live signal for
        whether it&apos;s actually moving.
      </p>
    </section>
  );
}

// === Flow diagram replaces the messy-text demo ===
function FlowDiagram() {
  const nodes = [
    { label: "GOALS", body: "What success means this year." },
    { label: "STRATEGY", body: "How we get there given constraints." },
    { label: "BETS", body: "Where leadership places its chips." },
    { label: "OWNERSHIP", body: "Who is accountable for each one." },
    { label: "KPIs", body: "How we know it is working." },
  ];

  return (
    <div id="how-it-works" className="mt-16 mx-auto w-full max-w-5xl">
      <div className="flex flex-col md:flex-row items-stretch md:items-stretch gap-3 md:gap-2">
        {nodes.map((n, i) => (
          <Fragment key={n.label}>
            <div
              className="flex-1 bg-card border border-border rounded-[2px] p-4 md:p-5 text-center"
              style={{ borderWidth: "0.5px" }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent mb-2">
                {n.label}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
            </div>
            {i < nodes.length - 1 && (
              <div
                className="flex items-center justify-center text-accent shrink-0"
                aria-hidden="true"
              >
                <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// === Section primitives ===
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

// === Drift — single 2-column comparison, no code labels ===
const COMPARISONS: Array<{ without: string; with: string }> = [
  {
    without: "Strategic bets exist in decks but never show up in the work.",
    with: "A durable, named record of every strategic bet.",
  },
  {
    without: "Decisions made in rooms nobody can point back to.",
    with: "Explicit owner and sponsor on every bet.",
  },
  {
    without: "Dashboards show activity, not whether the bet is moving.",
    with: "Lifecycle tracking with outcome targets and movement signals.",
  },
  {
    without: "Bets die without explicit retirement. The org just stops talking about them.",
    with: "Explicit retirement that names wins and losses.",
  },
];

function Drift() {
  return (
    <Section variant="card">
      <SectionHeading>
        Strategy on slides doesn&apos;t show up in the work<span className="text-accent">.</span>
      </SectionHeading>
      <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-3xl">
        Strategic bets drift quietly. Owners get fuzzy. Movement stalls. The org keeps moving but
        the named bet stops being a named bet. Authority_ catches the drift before it ships.
      </p>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground mb-4">
            Without Authority_
          </p>
          <ul className="space-y-3 text-sm text-foreground leading-snug">
            {COMPARISONS.map((c) => (
              <li key={c.without} className="flex gap-3">
                <span className="text-muted-foreground shrink-0">·</span>
                <span>{c.without}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground mb-4">
            With Authority_
          </p>
          <ul className="space-y-3 text-sm text-foreground leading-snug">
            {COMPARISONS.map((c) => (
              <li key={c.with} className="flex gap-3">
                <span className="text-accent shrink-0">·</span>
                <span>{c.with}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

// === License to build — single column prose ===
function LicenseToBuild() {
  return (
    <Section id="engagement">
      <SectionHeading>
        Authority_ is the license to build<span className="text-accent">.</span>
      </SectionHeading>
      <div className="mt-6 max-w-3xl space-y-4 text-base text-muted-foreground leading-relaxed">
        <p>
          Strategy without rigor is theater. Authority_ gives every strategic bet a durable record,
          an explicit owner, and a measurable outcome. When the record is real, the work that
          follows is sanctioned.
        </p>
        <p>
          Authority_ is not a SaaS subscription. It is the operating system that runs underneath
          every BSPG embedded team engagement. We bring the software. We bring the operators. We
          make the rigor real.
        </p>
      </div>
    </Section>
  );
}

// === Sample bet ===
function SampleBet() {
  return (
    <Section variant="card">
      <SectionHeading>
        A bet, recorded<span className="text-accent">.</span>
      </SectionHeading>
      <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-3xl">
        Every strategic bet lives as a single durable record. Here is what one looks like in
        Authority_.
      </p>

      <div
        className="mt-12 rounded-[2px] overflow-hidden border border-border bg-background"
        style={{ borderWidth: "0.5px" }}
      >
        <div className="bg-foreground text-background px-6 py-5">
          <div className="text-xs text-background/50 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            GOAL: Defend Acme&apos;s enterprise renewal base in 2026
          </div>
          <p className="text-lg md:text-xl font-semibold leading-snug mb-4">
            1. Move top-50 enterprise accounts from per-seat to platform pricing.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <Meta label="Category" value="Growth (Revenue Defense)" />
            <Meta label="Owner" value="Peter Will" />
            <Meta label="Sponsor" value="Bob Bitzchen" />
            <Meta label="Lifecycle" value={<Pill>Defined</Pill>} />
          </div>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Outcome target
            </p>
            <div
              className="rounded-[2px] border border-border bg-muted p-4"
              style={{ borderWidth: "0.5px" }}
            >
              <p className="text-sm leading-relaxed">
                Move 12 of the top 50 enterprise accounts to platform value and pricing by end of
                Q4 &apos;26 to defend $350M in renewal-at-risk ARR.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ExposurePanel
              tone="upside"
              label="Upside"
              value="$65M+ ARR"
              body="Platform value and pricing unlocks expansion across the top 50 over 24 months."
            />
            <ExposurePanel
              tone="risk"
              label="Risk"
              value="$80M ARR"
              body="Renewal exposure if customers continue to price-anchor on per-seat math."
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-background/60 mb-1">
        {label}
      </p>
      <div className="text-background/90">{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-[2px]">
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
      ? { bg: "bg-signal-green/10", border: "border-signal-green/30", text: "text-signal-green" }
      : { bg: "bg-signal-red/10", border: "border-signal-red/30", text: "text-signal-red" };
  return (
    <div
      className={`rounded-[2px] ${colors.bg} ${colors.border} border p-4`}
      style={{ borderWidth: "0.5px" }}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${colors.text} mb-1`}>
        {label}
      </p>
      <p className={`text-base font-semibold ${colors.text} leading-tight mb-1`}>{value}</p>
      <p className="text-xs text-foreground/80 leading-relaxed">{body}</p>
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
          Authority_ is included in every BSPG embedded team engagement. Tell us what you are trying
          to ship.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href={CONTACT_HREF}
            className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
      <div className="px-6 md:px-10 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Authority_" className="h-5 w-auto opacity-80" />
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
        <LicenseToBuild />
        <SampleBet />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
