import { Link } from "react-router-dom";

// Email for the "Start the conversation" CTA.
// Swap this constant to redirect inquiries elsewhere (e.g. hello@buildauthorityos.com).
const CONTACT_EMAIL = "mc@bspg.build";
const CONTACT_SUBJECT = "Authority — interested in an engagement";
const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}`;

function TopBar() {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 md:px-10 py-5">
      <img src="/logo.svg" alt="Authority" className="h-8 w-auto invert" />
      <Link
        to="/auth"
        className="font-mono text-xs uppercase tracking-[0.05em] text-gray-300 hover:text-white transition-colors"
      >
        Login →
      </Link>
    </div>
  );
}

function Section({
  variant,
  className = "",
  children,
}: {
  variant: "dark" | "light";
  className?: string;
  children: React.ReactNode;
}) {
  const bg = variant === "dark" ? "bg-foreground text-background" : "bg-background text-foreground";
  return (
    <section className={`${bg} ${className}`}>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">{children}</div>
    </section>
  );
}

function Eyebrow({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "onDark" }) {
  const color = tone === "onDark" ? "text-gray-500" : "text-gray-500";
  return (
    <div className={`font-mono text-xs uppercase tracking-[0.05em] ${color} mb-6`}>{children}</div>
  );
}

function PrimaryCta({ children, dense = false }: { children: React.ReactNode; dense?: boolean }) {
  return (
    <a
      href={CONTACT_HREF}
      className={`inline-flex items-center bg-white text-black font-mono uppercase tracking-[0.05em] hover:opacity-[0.85] transition-opacity ${
        dense ? "text-sm px-5 py-3" : "text-base px-6 py-4"
      }`}
    >
      {children}
    </a>
  );
}

// === Section 1: Hero ===
function Hero() {
  return (
    <div className="relative bg-foreground text-background">
      <TopBar />
      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-32 md:pt-40 pb-24 md:pb-32">
        <div className="font-mono text-xs uppercase tracking-[0.05em] text-gray-500 mb-6">
          // AUTHORITY_
        </div>
        <h1 className="text-[64px] md:text-[96px] lg:text-[128px] font-black leading-[0.95] tracking-tight mb-8">
          The system of record<br />for strategic bets.
        </h1>
        <p className="text-[20px] md:text-[28px] text-gray-300 font-medium max-w-3xl leading-tight mb-10">
          Authority turns leadership intent into shipped outcomes. A durable record of what was decided,
          who owns it, and what it moved.
        </p>
        <PrimaryCta>Start the conversation →</PrimaryCta>
        <p className="font-mono text-xs uppercase tracking-[0.05em] text-gray-500 mt-4">
          // bundled with every BSPG engagement
        </p>
      </div>
    </div>
  );
}

// === Section 2: The Drift ===
const ERRORS = [
  ["ERR_BET_DRIFT", "Strategic bets exist in decks but never show up in the work"],
  ["ERR_NO_OWNERSHIP", "Decisions made in rooms nobody can point back to"],
  ["ERR_VANITY_TRACKING", "Dashboards show activity, not whether the bet is moving"],
  ["ERR_QUIET_KILL", "Bets die without explicit retirement. The org just stops talking about them"],
] as const;

const RESOLVED = [
  ["01", "A durable, named record of every strategic bet"],
  ["02", "Explicit owner and sponsor on every bet"],
  ["03", "Lifecycle tracking with outcome targets and movement signals"],
  ["04", "Explicit retirement, naming wins and losses"],
] as const;

function Drift() {
  return (
    <Section variant="light">
      <h2 className="text-[64px] md:text-[96px] lg:text-[128px] font-black leading-[0.95] tracking-tight mb-16">
        The Drift.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <div className="border-t border-gray-300 pt-6">
          <div className="font-mono text-xs uppercase tracking-[0.05em] text-gray-500 mb-6">
            ERRORS
          </div>
          <div className="space-y-5">
            {ERRORS.map(([code, desc]) => (
              <div key={code} className="grid grid-cols-[auto_1fr] gap-4 md:gap-6">
                <span className="font-mono text-sm text-signal-red shrink-0">{code}</span>
                <span className="text-[18px] text-gray-700 leading-snug">{desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-300 pt-6">
          <div className="font-mono text-xs uppercase tracking-[0.05em] text-gray-500 mb-6">
            RESOLVED
          </div>
          <div className="space-y-5">
            {RESOLVED.map(([n, desc]) => (
              <div key={n} className="grid grid-cols-[auto_1fr] gap-4 md:gap-6">
                <span className="font-mono text-sm text-gray-500 shrink-0">{n}</span>
                <span className="text-[18px] text-gray-700 leading-snug">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// === Section 3: What Authority Is ===
const WHAT_AUTHORITY_IS = [
  {
    n: "01",
    title: "Decision log",
    body:
      "Every strategic bet gets a single, durable record. Title, owner, sponsor, category, outcome target, upside exposure, risk exposure. Visible to the whole leadership team. Editable by the owner. Audited by lifecycle.",
  },
  {
    n: "02",
    title: "Lifecycle states",
    body:
      "Each bet moves through clear states: Defined, Activated, Shipping, Closed, Retired. State transitions are timestamped and named. No bet quietly disappears.",
  },
  {
    n: "03",
    title: "Outcome anchoring",
    body:
      "Every bet has a measurable outcome target. Upside and risk are quantified in business terms (ARR, conversion, retention, cost). The bet is judged against the outcome, not against activity.",
  },
  {
    n: "04",
    title: "Movement tracking",
    body:
      "Authority tracks whether each bet is actually moving. Stalls trigger nudges. Decisions and changes are logged. Leadership has live visibility into which bets are working and which need attention.",
  },
];

function WhatAuthorityIs() {
  return (
    <Section variant="light" className="border-t border-gray-300">
      <h2 className="text-[64px] md:text-[96px] lg:text-[128px] font-black leading-[0.95] tracking-tight mb-16">
        What Authority Is.
      </h2>
      <div className="space-y-12">
        {WHAT_AUTHORITY_IS.map((item) => (
          <div key={item.n} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-10">
            <div className="font-mono text-xs text-gray-500 md:pt-2">{item.n}</div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-3">{item.title}</h3>
              <p className="text-[18px] text-gray-700 leading-relaxed max-w-3xl">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// === Section 4: The Loop ===
const LOOP_NODES = [
  { call: "place_bets()", desc: "Leadership names the 5–7 bets that matter this cycle" },
  { call: "frame_outcomes()", desc: "Each bet gets a target, an owner, an upside, a risk" },
  { call: "track_movement()", desc: "Movement is logged. Stalls are flagged. Decisions are recorded." },
  { call: "close_loop()", desc: "Bets retire with evidence. Wins and losses are named." },
];

function Loop() {
  return (
    <section className="bg-foreground text-background relative overflow-hidden">
      {/* Faint grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />
      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <h2 className="text-[64px] md:text-[96px] lg:text-[128px] font-black leading-[0.95] tracking-tight mb-8">
          The Loop.
        </h2>
        <p className="text-[18px] text-gray-300 max-w-3xl leading-snug mb-16">
          Our proprietary system turns strategic bets into shipped outcomes. A continuous value loop
          between leadership intent and execution evidence.
        </p>
        <div className="font-mono text-xs uppercase tracking-[0.05em] text-gray-500 mb-6">
          INTENT · LEADERSHIP
        </div>
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-6 left-0 right-0 h-px bg-gray-500/40" aria-hidden />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 relative">
            {LOOP_NODES.map((node, i) => (
              <div key={node.call} className="relative">
                <div className="hidden md:block absolute top-5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent ring-4 ring-foreground" />
                <div className="font-mono text-base md:text-lg text-accent mb-3 md:mt-12">
                  {node.call}
                  {i < LOOP_NODES.length - 1 && <span className="md:hidden text-gray-500 ml-2">→</span>}
                </div>
                <p className="text-base text-gray-500 leading-snug">{node.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="font-mono text-xs uppercase tracking-[0.05em] text-gray-500 mt-6">
          EXECUTION · TEAMS
        </div>
      </div>
    </section>
  );
}

// === Section 5: How It Lives ===
function HowItLives() {
  return (
    <Section variant="light">
      <h2 className="text-[64px] md:text-[96px] lg:text-[128px] font-black leading-[0.95] tracking-tight mb-8">
        How It Lives.
      </h2>
      <p className="text-[18px] text-gray-700 leading-relaxed max-w-3xl mb-16">
        Authority is not a SaaS subscription. It is the operating system that runs underneath every BSPG
        embedded team engagement. We bring the software. We bring the operators. We make the rigor real.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-10 md:gap-16 items-start">
        <div>
          <h3 className="text-[48px] md:text-[64px] lg:text-[96px] font-black leading-none tracking-tight text-foreground">
            Tools track.
          </h3>
        </div>
        <div>
          <h3 className="text-[48px] md:text-[64px] lg:text-[96px] font-black leading-none tracking-tight text-gray-500">
            We embed.
          </h3>
        </div>
        <div className="font-mono text-sm text-gray-500 space-y-2 max-w-xs">
          <p>// Comes standard with every BSPG engagement</p>
          <p>// Not licensed or sold standalone</p>
          <p>// Not appropriate for self-serve teams</p>
        </div>
      </div>
      <p className="text-[18px] text-gray-700 leading-relaxed max-w-3xl mt-12">
        Traditional planning tools give your team a place to write down strategic intent. They do not
        make the intent durable, do not surface drift, and do not connect to the work that ships.
        Authority is the system of record. The BSPG embedded team is the operator that makes it run.
      </p>
    </Section>
  );
}

// === Section 6: Sample View — static mock of a bet card ===
function SampleBet() {
  return (
    <section className="bg-foreground text-background">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <h2 className="text-[64px] md:text-[96px] lg:text-[128px] font-black leading-[0.95] tracking-tight mb-8">
          A Bet, Recorded.
        </h2>
        <p className="text-[18px] text-gray-300 max-w-3xl leading-snug mb-16">
          Every strategic bet lives as a single durable record. Here is what one looks like in Authority.
        </p>
        <div className="rounded-lg overflow-hidden border border-gray-700 bg-background text-foreground">
          {/* Dark header bar */}
          <div className="bg-black text-white px-6 py-5">
            <div className="text-xs text-white/50 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
              GOAL: Define category leadership in outcome validation
            </div>
            <p className="text-xl md:text-2xl font-semibold leading-snug mb-4">
              1. Establish [Company] as the category system of record for outcome validation.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-white/40 mb-1">Category</p>
                <p className="text-white/90">Growth (Revenue Expansion)</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-white/40 mb-1">Owner</p>
                <p className="text-white/90">[Name]</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-white/40 mb-1">Sponsor</p>
                <p className="text-white/90">[Name]</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-white/40 mb-1">Lifecycle</p>
                <span className="inline-block font-mono text-[11px] uppercase tracking-[0.05em] bg-gray-100 text-gray-900 px-2 py-0.5">
                  Defined
                </span>
              </div>
            </div>
          </div>
          {/* Light body */}
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.05em] text-gray-500 mb-2">// OUTCOME TARGET</p>
              <div className="rounded-md border border-gray-300 bg-gray-100 p-4">
                <p className="text-sm leading-relaxed">
                  [Company] becomes the system of record that customers rely on to determine which product
                  changes measurably move business metrics.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-md border border-signal-green/30 bg-signal-green/10 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.05em] text-signal-green mb-2">// UPSIDE EXPOSURE</p>
                <p className="text-sm leading-relaxed text-signal-green">
                  $12M+ expansion ARR by embedding into enterprise decision workflows.
                </p>
              </div>
              <div className="rounded-md border border-signal-red/30 bg-signal-red/10 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.05em] text-signal-red mb-2">// RISK EXPOSURE</p>
                <p className="text-sm leading-relaxed text-signal-red">
                  $20–30M ARR at risk over 24 months if [Company] remains positioned as telemetry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// === Section 7: Final CTA ===
function FinalCta() {
  return (
    <section className="bg-foreground text-background">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.05em] text-gray-500 mb-6">// START</div>
        <h2 className="text-[48px] md:text-[72px] lg:text-[96px] font-black leading-[0.95] tracking-tight mb-8">
          Bring rigor to your bets.
        </h2>
        <p className="text-[20px] text-gray-300 leading-snug max-w-2xl mx-auto mb-10">
          Authority is included in every BSPG embedded team engagement. Tell us what you are trying to ship.
        </p>
        <PrimaryCta>Start the conversation →</PrimaryCta>
      </div>
    </section>
  );
}

// === Section 8: Footer ===
function MinimalFooter() {
  return (
    <footer className="bg-foreground text-gray-500 border-t border-gray-700">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Authority" className="h-5 w-auto invert opacity-80" />
          <span className="font-mono text-xs uppercase tracking-[0.05em]">
            // a BSPG operating system
          </span>
        </div>
        <div className="font-mono text-xs uppercase tracking-[0.05em]">
          © {new Date().getFullYear()} BSPG
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Drift />
      <WhatAuthorityIs />
      <Loop />
      <HowItLives />
      <SampleBet />
      <FinalCta />
      <MinimalFooter />
    </div>
  );
}
