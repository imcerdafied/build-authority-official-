import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppId = "goals" | "bets" | "build";

interface SharedNavProps {
  activeApp: AppId;
  orgName?: string;
  orgId?: string;
  onNavigate?: (app: AppId) => void;
}

// ---------------------------------------------------------------------------
// App configuration
// ---------------------------------------------------------------------------

interface AppConfig {
  id: AppId;
  label: string;
  subtitle: string;
  url: string;
  envVar: string;
}

const APPS: AppConfig[] = [
  {
    id: "goals",
    label: "TrueNorthOS",
    subtitle: "Goals",
    url: import.meta.env.VITE_TRUENORTHOS_URL ?? "https://truenorthos.vercel.app",
    envVar: "VITE_TRUENORTHOS_URL",
  },
  {
    id: "bets",
    label: "Build Authority",
    subtitle: "Bets",
    url: import.meta.env.VITE_BUILD_AUTHORITY_URL ?? "https://buildauthority.vercel.app",
    envVar: "VITE_BUILD_AUTHORITY_URL",
  },
  {
    id: "build",
    label: "OutcomeOS",
    subtitle: "Build",
    url: import.meta.env.VITE_OUTCOMEOS_URL ?? "https://outcomeOS.vercel.app",
    envVar: "VITE_OUTCOMEOS_URL",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SharedNav({ activeApp, orgName, orgId, onNavigate }: SharedNavProps) {
  const handleClick = (app: AppConfig) => {
    if (app.id === activeApp) return;

    if (onNavigate) {
      onNavigate(app.id);
      return;
    }

    const url = new URL(app.url);
    if (orgId) {
      url.searchParams.set("org", orgId);
    }
    window.location.href = url.toString();
  };

  return (
    <nav className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
      {/* Brand mark */}
      <span className="hidden sm:inline-flex mr-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none whitespace-nowrap">
        BSPG Strategic OS
      </span>

      {/* Divider */}
      <span className="hidden sm:block w-px h-5 bg-gray-200 mr-1" aria-hidden="true" />

      {/* App pills — scrollable on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
        {APPS.map((app) => {
          const isActive = app.id === activeApp;
          return (
            <button
              key={app.id}
              onClick={() => handleClick(app)}
              className={[
                "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="hidden md:inline">{app.label}:</span>
              <span>{app.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Org name badge */}
      {orgName && (
        <span className="hidden sm:inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200 whitespace-nowrap">
          {orgName}
        </span>
      )}
    </nav>
  );
}

export default SharedNav;

// ---------------------------------------------------------------------------
// Usage examples
// ---------------------------------------------------------------------------
//
// Usage in Build Authority:
// <SharedNav activeApp="bets" orgName="Conviva" orgId="aa6d6ba6-..." />
//
// Usage in TrueNorthOS:
// <SharedNav activeApp="goals" />
//
// Usage in OutcomeOS:
// <SharedNav activeApp="build" orgName="Conviva" />
//
// With custom navigation handler (e.g., for SPA routing):
// <SharedNav
//   activeApp="bets"
//   onNavigate={(app) => {
//     if (app === 'goals') router.push('/goals');
//   }}
// />
