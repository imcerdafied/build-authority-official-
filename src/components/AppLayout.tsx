import { ReactNode, useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { cn } from "@/lib/utils";
import ChatAdvisor from "@/components/ChatAdvisor";
import FeedbackButton from "@/components/FeedbackButton";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import CreateWorkspaceModal from "@/components/CreateWorkspaceModal";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  pod_lead: "Pod Lead",
  viewer: "Viewer",
};

const Sep = () => <span className="text-muted-foreground/30 mx-3 hidden md:inline">|</span>;

const navLinkClass = "text-sm uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors font-medium min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0 md:flex-initial";

const altitudePillClass = "text-sm uppercase tracking-widest font-semibold px-3 py-1 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0 md:flex-initial";

const subNavLinkClass = "text-sm text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1";

type Altitude = "goals" | "bets" | "build";

function getAltitude(pathname: string): Altitude {
  if (pathname.startsWith("/goals")) return "goals";
  if (pathname.startsWith("/build") || pathname.startsWith("/outcomes") || pathname.startsWith("/roadmap") || pathname.startsWith("/loops") || pathname.startsWith("/pods")) return "build";
  return "bets";
}

const SUB_NAV: Record<Altitude, { label: string; to: string }[]> = {
  goals: [],
  bets: [
    { label: "Bets", to: "/decisions" },
    { label: "Review", to: "/review" },
    { label: "Signals", to: "/signals" },
  ],
  build: [
    { label: "Analyze", to: "/build/analyze" },
    { label: "Initiatives", to: "/build/initiatives" },
    { label: "Roadmap", to: "/build/roadmap" },
    { label: "Pods", to: "/pods" },
    { label: "Loops", to: "/loops" },
    { label: "Outcomes", to: "/build" },
  ],
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentOrg, currentRole } = useOrg();
  const navigate = useNavigate();

  const lastViewed = typeof window !== "undefined" ? (localStorage.getItem("feedback_last_viewed") || "1970-01-01") : "1970-01-01";
  const { data: unreadCount } = useQuery({
    queryKey: ["unread_feedback", currentOrg?.id, lastViewed],
    queryFn: async () => {
      if (!currentOrg) return 0;
      const viewed = localStorage.getItem("feedback_last_viewed") || "1970-01-01";
      const { count } = await supabase
        .from("feedback")
        .select("*", { count: "exact", head: true })
        .eq("org_id", currentOrg.id)
        .gt("created_at", viewed);
      return count || 0;
    },
    enabled: !!currentOrg && currentRole === "admin",
    refetchInterval: 30000,
  });

  const location = useLocation();
  const closeMenu = () => setMenuOpen(false);

  const currentAltitude = useMemo(() => getAltitude(location.pathname), [location.pathname]);
  const subNavItems = SUB_NAV[currentAltitude];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 lg:px-6 py-4">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex flex-col">
              <Link to="/goals" className="flex items-center" onClick={closeMenu}>
                <img src="/logo.svg" alt="Authority" className="h-6 md:h-8 w-auto" />
              </Link>
              <div className="leading-tight mt-0.5">
                <WorkspaceSwitcher onCreateWorkspace={() => setCreateWorkspaceOpen(true)} />
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 -mr-2 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1"
              aria-label="Toggle menu"
            >
              <span className="w-5 h-0.5 bg-foreground block" />
              <span className="w-5 h-0.5 bg-foreground block" />
              <span className="w-5 h-0.5 bg-foreground block" />
            </button>
          </div>

          <nav className={cn(
            "md:flex md:items-center md:flex-1 md:justify-between",
            menuOpen ? "flex flex-col py-2 border-b" : "hidden md:flex"
          )}>
            <div className="flex flex-col md:flex-row md:items-center">
              <Sep />
              <Link
                to="/goals"
                className={cn(altitudePillClass, currentAltitude === "goals" ? "text-foreground bg-foreground/5" : "text-muted-foreground hover:text-foreground")}
                onClick={closeMenu}
              >
                Goals
              </Link>
              <Sep />
              <Link
                to="/decisions"
                className={cn(altitudePillClass, currentAltitude === "bets" ? "text-foreground bg-foreground/5" : "text-muted-foreground hover:text-foreground")}
                onClick={closeMenu}
              >
                Bets
              </Link>
              <Sep />
              <Link
                to="/build"
                className={cn(altitudePillClass, currentAltitude === "build" ? "text-foreground bg-foreground/5" : "text-muted-foreground hover:text-foreground")}
                onClick={closeMenu}
              >
                Build
              </Link>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 pt-2 md:pt-0 border-t md:border-t-0 mt-2 md:mt-0">
              <Sep />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 min-h-[44px] md:min-h-0"
                    aria-label="Profile menu"
                  >
                    <span className="w-6 h-6 rounded-full bg-foreground/10 border border-foreground/20 flex items-center justify-center text-[10px] font-bold uppercase text-foreground shrink-0">
                      {user?.email?.[0] ?? "?"}
                    </span>
                    <span className="truncate max-w-[140px] hidden md:inline">{user?.email}</span>
                    {unreadCount != null && unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-signal-red inline-block" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium truncate">{user?.email}</p>
                    {currentRole && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {roleLabels[currentRole] || currentRole}
                      </p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => { closeMenu(); navigate("/team"); }}
                    className="text-sm cursor-pointer"
                  >
                    Team
                  </DropdownMenuItem>
                  {currentRole === "admin" && (
                    <DropdownMenuItem
                      onSelect={() => { closeMenu(); navigate("/feedback"); }}
                      className="text-sm cursor-pointer flex items-center justify-between"
                    >
                      <span>Feedback</span>
                      {unreadCount != null && unreadCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-signal-red inline-block" />
                      )}
                    </DropdownMenuItem>
                  )}
                  {currentRole === "admin" && (
                    <DropdownMenuItem
                      onSelect={() => { closeMenu(); navigate("/settings"); }}
                      className="text-sm cursor-pointer"
                    >
                      Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() => { closeMenu(); setCreateWorkspaceOpen(true); }}
                    className="text-sm cursor-pointer"
                  >
                    Create Workspace
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => { closeMenu(); signOut(); }}
                    className="text-sm cursor-pointer text-muted-foreground"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </div>
      </header>

      {/* Sub-navigation for the current altitude */}
      {subNavItems.length > 0 && (
        <div className="border-b px-4 lg:px-6 py-2 flex items-center gap-1 overflow-x-auto">
          {subNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                subNavLinkClass,
                location.pathname === item.to
                  ? "text-foreground font-semibold"
                  : ""
              )}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <main className={cn("flex-1 overflow-auto transition-all duration-300", chatOpen && "md:mr-96")}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full">
          <div className="eyebrow-mono mb-4">{`// ${currentAltitude.toUpperCase()}`}</div>
          {children}
        </div>
      </main>

      <ChatAdvisor chatOpen={chatOpen} setChatOpen={setChatOpen} />
      <FeedbackButton />
      <CreateWorkspaceModal
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
      />
    </div>
  );
}
