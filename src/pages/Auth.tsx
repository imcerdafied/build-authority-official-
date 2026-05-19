import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PENDING_ORG_JOIN_KEY = "pending_org_join";

interface AuthProps {
  skipInviteCode?: boolean;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.63Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3A7.16 7.16 0 0 1 12 19.34a7.2 7.2 0 0 1-6.75-4.97H1.26v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.37A7.2 7.2 0 0 1 4.85 12c0-.82.14-1.61.4-2.37v-3.1H1.26A12 12 0 0 0 0 12c0 1.93.46 3.76 1.26 5.47l3.99-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.2 15.24 0 12 0A12 12 0 0 0 1.26 6.53l3.99 3.1A7.2 7.2 0 0 1 12 4.77Z"
      />
    </svg>
  );
}

export default function Auth({ skipInviteCode }: AuthProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orgId } = useParams<{ orgId?: string }>();
  const queryOrgId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("org");
  }, [location.search]);
  const joinOrgId = queryOrgId || orgId || null;
  const isJoinFlow =
    skipInviteCode || !!joinOrgId || /^\/join\/[^/]+$/.test(location.pathname);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getOAuthRedirectTo = () => {
    if (isJoinFlow && joinOrgId) return `${window.location.origin}/join/${joinOrgId}`;
    return window.location.origin;
  };

  useEffect(() => {
    if (!user) return;
    if (joinOrgId) {
      navigate(`/join/${joinOrgId}`, { replace: true });
      return;
    }
    navigate("/bets", { replace: true });
  }, [user, joinOrgId, navigate]);

  const handleGoogleSSO = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    if (isJoinFlow && joinOrgId) {
      localStorage.setItem(PENDING_ORG_JOIN_KEY, joinOrgId);
    }

    const workspaceDomain = import.meta.env.VITE_GOOGLE_WORKSPACE_DOMAIN as
      | string
      | undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getOAuthRedirectTo(),
        queryParams: workspaceDomain ? { hd: workspaceDomain } : undefined,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setMessage("Redirecting to Google…");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <img src="/logo.svg" alt="Authority" className="h-8 w-auto" />
        </div>

        <div
          className="bg-card rounded-[2px] border border-border p-8"
          style={{ borderWidth: "0.5px" }}
        >
          <h1 className="text-xl font-semibold text-foreground tracking-tight mb-1">
            Welcome to Authority.
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            System of record for strategic bets.
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSSO}
            className="w-full inline-flex items-center justify-center gap-3 rounded-[2px] border border-border bg-background px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <GoogleIcon />
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>

          {error && (
            <p className="text-xs text-signal-red font-medium mt-4">{error}</p>
          )}
          {message && (
            <p className="text-xs text-muted-foreground mt-4">{message}</p>
          )}

          <p className="text-xs text-muted-foreground mt-6">
            Authority is bundled with every BSPG embedded team engagement. Sign in
            with the email your workspace was provisioned to.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs">
          <a
            href="/privacy-policy.pdf"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </a>
          <a
            href="/terms-of-service.pdf"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </a>
          <a
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            About Authority
          </a>
        </div>
      </div>
    </div>
  );
}
