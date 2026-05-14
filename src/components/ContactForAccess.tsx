import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Shown when an authenticated user has no workspace membership and their email
// domain does not match any existing workspace. Replaces the prior self-serve
// OrgSetup screen so non-clients cannot mint workspaces themselves.

const CONTACT_EMAIL = "mc@bspg.build";
const CONTACT_SUBJECT = "Authority: requesting access";
const CONTACT_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}`;

export default function ContactForAccess() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src="/logo.svg" alt="Authority" className="h-7 w-auto" />
        </div>

        <div className="rounded-[2px] border border-border bg-card p-8" style={{ borderWidth: "0.5px" }}>
          <h1 className="text-xl font-semibold text-foreground tracking-tight mb-3">
            Authority is bundled with BSPG engagements.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Authority is not licensed or sold standalone. It is included with every BSPG embedded
            team engagement. Reach out and we can talk about whether an engagement makes sense for
            your team.
          </p>

          <a
            href={CONTACT_HREF}
            className="inline-flex items-center justify-center w-full rounded-[2px] bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Contact BSPG
          </a>

          {user?.email && (
            <p className="text-xs text-muted-foreground mt-6 text-center">
              Signed in as <span className="text-foreground">{user.email}</span>.
            </p>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Sign out and try a different email
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Already a client and seeing this? Email above and we&apos;ll get you on your workspace.
        </p>
      </div>
    </div>
  );
}
