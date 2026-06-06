import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrgProvider, useOrg } from "@/contexts/OrgContext";
import AppLayout from "@/components/AppLayout";
import PageSkeleton from "@/components/PageSkeleton";
import Bets from "@/pages/Bets";
import BetDetail from "@/pages/BetDetail";
import Loops from "@/pages/Loops";
import Review from "@/pages/Review";
import Initiatives from "@/pages/Initiatives";
import HowItWorks from "@/pages/HowItWorks";
import Signals from "@/pages/Signals";
import Pods from "@/pages/Pods";
import Ask from "@/pages/Ask";
import Team from "@/pages/Team";
import FeedbackAdmin from "@/pages/FeedbackAdmin";
import CapabilityMap from "@/pages/CapabilityMap";
import OrgSettings from "@/pages/OrgSettings";
import Join from "@/pages/Join";
import Auth from "@/pages/Auth";
import Landing from "@/pages/Landing";
import ContactForAccess from "@/components/ContactForAccess";
import DomainJoinPrompt from "@/components/DomainJoinPrompt";
import NotFound from "./pages/NotFound";

// Goals: detail page kept as a deep-link target for the bet's goal chip.
// /goals (list) and /goals/review are unmounted — Goals is no longer a section.
import OKRDetail from "@/pages/goals/OKRDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// Public landing for `/`. Logged-in users bounce straight to /bets.
function LandingOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/bets" replace />;
  return <Landing />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading } = useOrg();
  const [showAccessGate, setShowAccessGate] = React.useState(false);

  if (authLoading || orgLoading) {
    return <PageSkeleton fullScreen />;
  }

  if (!user) return <Auth />;

  // No memberships: try to match the user's email domain to an existing
  // workspace before showing the access gate. DomainJoinPrompt calls
  // onFallback() if no domain match is found OR if the user explicitly opts
  // out. Either way, non-clients see the ContactForAccess screen — they
  // cannot self-serve a workspace.
  if (memberships.length === 0) {
    if (showAccessGate) return <ContactForAccess />;
    return <DomainJoinPrompt onFallback={() => setShowAccessGate(true)} />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <Routes>
      {/* Public marketing page at the root */}
      <Route path="/" element={<LandingOrRedirect />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/join/:orgId" element={<Join />} />
      <Route path="*" element={
        <AuthGate>
          <AppLayout>
            <Routes>
              <Route path="/home" element={<Navigate to="/bets" replace />} />

              {/* Goal detail kept as a deep-link target reachable from a bet's goal chip */}
              <Route path="/goals/:okrId" element={<OKRDetail />} />
              <Route path="/goals" element={<Navigate to="/bets" replace />} />
              <Route path="/goals/review" element={<Navigate to="/bets" replace />} />

              {/* Bets altitude */}
              <Route path="/bets" element={<Bets />} />
              <Route path="/bets/:id" element={<BetDetail />} />
              <Route path="/initiatives" element={<Initiatives />} />
              {/* Legacy URL preserved as a redirect */}
              <Route path="/decisions" element={<Navigate to="/bets" replace />} />
              <Route path="/loops" element={<Loops />} />
              <Route path="/review" element={<Review />} />
              <Route path="/signals" element={<Signals />} />
              <Route path="/pods" element={<Pods />} />
              <Route path="/capability-map" element={<CapabilityMap />} />
              <Route path="/ask" element={<Ask />} />
              <Route path="/how-it-works" element={<HowItWorks />} />

              {/* Build altitude removed — redirect any deep links back to bets */}
              <Route path="/build/*" element={<Navigate to="/bets" replace />} />

              {/* Utility routes */}
              <Route path="/closed-bets" element={<Navigate to="/bets" replace />} />
              <Route path="/altitude" element={<Navigate to="/bets" replace />} />
              <Route path="/team" element={<Team />} />
              <Route path="/feedback" element={<FeedbackAdmin />} />
              <Route path="/settings" element={<OrgSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </AuthGate>
      } />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OrgProvider>
            <AppContent />
          </OrgProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
