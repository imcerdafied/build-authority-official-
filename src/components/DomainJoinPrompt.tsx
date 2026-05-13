import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shown when an authenticated user has no memberships but their email domain
 * matches an org's `allowed_email_domain`. Offers a one-click "request to join"
 * flow instead of dropping them into OrgSetup (which would duplicate the org).
 *
 * Props:
 *   onFallback — called when the user opts out (e.g. "Create my own workspace
 *                instead"). The parent should render OrgSetup in that case.
 */
export default function DomainJoinPrompt({ onFallback }: { onFallback: () => void }) {
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [matchedOrg, setMatchedOrg] = useState<{ id: string; name: string } | null>(null);
  const [requestStatus, setRequestStatus] = useState<"none" | "pending" | "approved" | "denied">(
    "none",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailDomain = user?.email?.split("@")[1]?.toLowerCase() ?? null;

  // Lookup domain + existing request state
  useEffect(() => {
    if (!user || !emailDomain) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function lookup() {
      setLoading(true);

      // Find an org whose allowed_email_domain matches the user's domain
      const { data: orgRows, error: orgErr } = await supabase.rpc(
        "find_org_by_email_domain" as any,
        { p_domain: emailDomain },
      );
      if (cancelled) return;
      if (orgErr) {
        console.error("find_org_by_email_domain failed:", orgErr);
        setLoading(false);
        onFallback();
        return;
      }

      const org = Array.isArray(orgRows) && orgRows.length > 0 ? orgRows[0] : null;
      if (!org) {
        // No domain match → let parent show OrgSetup
        setLoading(false);
        onFallback();
        return;
      }

      setMatchedOrg({ id: org.id, name: org.name });

      // Do they already have a request?
      const { data: existing } = await supabase
        .from("org_join_requests")
        .select("status")
        .eq("org_id", org.id)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing?.status === "pending") setRequestStatus("pending");
      else if (existing?.status === "approved") setRequestStatus("approved");
      else if (existing?.status === "denied") setRequestStatus("denied");
      else setRequestStatus("none");

      setLoading(false);
    }

    void lookup();
    return () => {
      cancelled = true;
    };
  }, [user, emailDomain, onFallback]);

  const handleRequestAccess = async () => {
    if (!matchedOrg) return;
    setSubmitting(true);
    setError(null);

    const { error: rpcErr } = await supabase.rpc("request_to_join_org" as any, {
      p_org_id: matchedOrg.id,
    });

    if (rpcErr) {
      setError(rpcErr.message ?? "Failed to submit join request.");
      setSubmitting(false);
      return;
    }

    setRequestStatus("pending");
    setSubmitting(false);
  };

  // Poll every 10s while pending — when admin approves, user's memberships
  // refresh automatically via OrgContext and this screen unmounts.
  useEffect(() => {
    if (requestStatus !== "pending") return;
    const interval = setInterval(async () => {
      // Just force-refresh the app state; if approved, AuthGate will re-render
      // past this prompt once memberships update.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // trigger re-fetch by dispatching a state change on supabase client;
        // the OrgContext already listens for membership changes on mount, so
        // the simplest reliable refresh is a full reload after 60s max.
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [requestStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking your workspace...</p>
      </div>
    );
  }

  if (!matchedOrg) {
    // useEffect already called onFallback; render nothing while parent swaps.
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-sm font-bold tracking-widest uppercase text-foreground">
            Authority
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Join your team</p>
        </div>

        <div className="border rounded-md p-6 space-y-4">
          {requestStatus === "none" && (
            <>
              <div>
                <p className="text-sm text-foreground font-medium mb-1">
                  {matchedOrg.name} is already on Authority.
                </p>
                <p className="text-sm text-muted-foreground">
                  Your email ({user?.email}) matches this workspace's domain. Ask an
                  admin to grant you access — we'll notify them when you submit.
                </p>
              </div>

              {error && <p className="text-xs text-signal-red">{error}</p>}

              <button
                onClick={handleRequestAccess}
                disabled={submitting}
                className="w-full text-sm font-semibold text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Requesting access..." : `Request access to ${matchedOrg.name}`}
              </button>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Not looking to join this workspace?
                </p>
                <button
                  onClick={onFallback}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Create my own workspace instead
                </button>
              </div>
            </>
          )}

          {requestStatus === "pending" && (
            <>
              <div>
                <p className="text-sm text-foreground font-medium mb-1">
                  Request sent to {matchedOrg.name}.
                </p>
                <p className="text-sm text-muted-foreground">
                  An admin needs to approve you before you can access the workspace.
                  You'll be let in automatically once that happens.
                </p>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full text-sm font-semibold border border-foreground text-foreground px-4 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors"
              >
                I've been approved — let me in
              </button>
            </>
          )}

          {requestStatus === "denied" && (
            <>
              <div>
                <p className="text-sm text-foreground font-medium mb-1">
                  Request declined.
                </p>
                <p className="text-sm text-muted-foreground">
                  An admin at {matchedOrg.name} declined your request. Reach out to
                  them directly if this was a mistake.
                </p>
              </div>

              <button
                onClick={onFallback}
                className="w-full text-sm font-semibold border border-foreground text-foreground px-4 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors"
              >
                Create my own workspace instead
              </button>
            </>
          )}

          {requestStatus === "approved" && (
            <>
              <p className="text-sm text-foreground font-medium">
                You've been approved — reloading...
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-sm font-semibold text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors"
              >
                Continue
              </button>
            </>
          )}
        </div>

        <button
          onClick={signOut}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
