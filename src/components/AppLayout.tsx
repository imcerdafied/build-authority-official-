import { ReactNode, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
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

const SUB_NAV: { label: string; to: string }[] = [
  { label: "Bets", to: "/bets" },
  { label: "Review", to: "/review" },
];

function displayName(user: any): string {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User"
  );
}

function initial(user: any): string {
  const name = displayName(user);
  return (name?.[0] ?? "?").toUpperCase();
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentOrg, currentRole } = useOrg();
  const navigate = useNavigate();

  const lastViewed =
    typeof window !== "undefined"
      ? localStorage.getItem("feedback_last_viewed") || "1970-01-01"
      : "1970-01-01";
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Single header row: wordmark + workspace switcher (left) · sub-nav (center) · profile (right) */}
      <header
        className="border-b border-border bg-background"
        style={{ borderBottomWidth: "0.5px" }}
      >
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3 flex items-center gap-6">
          {/* Left cluster: logo + workspace switcher inline */}
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/bets" className="flex items-center shrink-0" onClick={closeMenu}>
              <img src="/logo.svg" alt="Authority" className="h-6 w-auto" />
            </Link>
            <span
              className="w-px h-5 bg-border hidden md:inline-block"
              aria-hidden
            />
            <div className="hidden md:block min-w-0">
              <WorkspaceSwitcher onCreateWorkspace={() => setCreateWorkspaceOpen(true)} />
            </div>
          </div>

          {/* Sub-nav as inline text links — Bets / Review */}
          <nav
            aria-label="Sections"
            className="hidden md:flex items-center gap-6 flex-1"
          >
            {SUB_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "text-sm transition-colors",
                  location.pathname === item.to ||
                    (item.to === "/bets" && location.pathname.startsWith("/bets"))
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground font-medium",
                )}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 -mr-2 ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Right: profile dropdown */}
          <div className="hidden md:flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  aria-label="Profile menu"
                >
                  <span className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-medium text-foreground shrink-0">
                    {initial(user)}
                  </span>
                  <span className="truncate max-w-[140px] hidden lg:inline text-foreground font-medium">
                    {displayName(user)}
                  </span>
                  {unreadCount != null && unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-signal-red inline-block" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{displayName(user)}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {user?.email}
                  </p>
                  {currentRole && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {roleLabels[currentRole] || currentRole}
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    closeMenu();
                    navigate("/team");
                  }}
                  className="text-sm cursor-pointer"
                >
                  Team
                </DropdownMenuItem>
                {currentRole === "admin" && (
                  <DropdownMenuItem
                    onSelect={() => {
                      closeMenu();
                      navigate("/feedback");
                    }}
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
                    onSelect={() => {
                      closeMenu();
                      navigate("/settings");
                    }}
                    className="text-sm cursor-pointer"
                  >
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() => {
                    closeMenu();
                    setCreateWorkspaceOpen(true);
                  }}
                  className="text-sm cursor-pointer"
                >
                  Create Workspace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    closeMenu();
                    signOut();
                  }}
                  className="text-sm cursor-pointer text-muted-foreground"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {menuOpen && (
          <div
            className="md:hidden border-t border-border px-4 py-3 space-y-3"
            style={{ borderTopWidth: "0.5px" }}
          >
            <WorkspaceSwitcher onCreateWorkspace={() => setCreateWorkspaceOpen(true)} />
            <div className="flex flex-col gap-2">
              {SUB_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "text-sm py-1",
                    location.pathname === item.to ||
                      (item.to === "/bets" && location.pathname.startsWith("/bets"))
                      ? "text-foreground font-medium"
                      : "text-muted-foreground font-medium",
                  )}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="pt-2 border-t border-border" style={{ borderTopWidth: "0.5px" }}>
              <p className="text-sm font-medium">{displayName(user)}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <button
                onClick={() => signOut()}
                className="text-sm text-muted-foreground hover:text-foreground mt-2"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main
        className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          chatOpen && "md:mr-96",
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 w-full">
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
