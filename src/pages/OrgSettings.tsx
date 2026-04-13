import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrg, type ProductArea, type CustomCategory } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SLOT_KEYS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7"];

interface JoinRequest {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

export default function OrgSettings() {
  const {
    currentOrg,
    currentRole,
    productAreas: orgAreas,
    customOutcomeCategories: orgCategories,
    updateOrg,
  } = useOrg();
  const queryClient = useQueryClient();

  const [areas, setAreas] = useState<{ label: string }[]>([]);
  const [categories, setCategories] = useState<{ label: string }[]>([]);
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);

  // Sync from org context on load
  useEffect(() => {
    setAreas(orgAreas.map((a) => ({ label: a.label })));
  }, [orgAreas]);

  useEffect(() => {
    if (orgCategories) {
      setCategories(orgCategories.map((c) => ({ label: c.label })));
    }
  }, [orgCategories]);

  useEffect(() => {
    setDomain((currentOrg as any)?.allowed_email_domain ?? "");
  }, [currentOrg]);

  // Pending join requests
  const { data: joinRequests = [] } = useQuery<JoinRequest[]>({
    queryKey: ["join-requests", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("org_join_requests")
        .select("id, email, status, created_at")
        .eq("org_id", currentOrg.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JoinRequest[];
    },
    enabled: !!currentOrg && currentRole === "admin",
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("approve_join_request" as any, {
        p_request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", currentOrg?.id] });
      toast.success("Approved — they're now in the workspace.");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to approve."),
  });

  const denyMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("deny_join_request" as any, {
        p_request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", currentOrg?.id] });
      toast.success("Request denied.");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to deny."),
  });

  if (currentRole !== "admin") {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">Only admins can access organization settings.</p>
      </div>
    );
  }

  const updateArea = (index: number, label: string) => {
    setAreas((prev) => prev.map((a, i) => (i === index ? { label } : a)));
  };
  const addArea = () => {
    if (areas.length < 7) setAreas((prev) => [...prev, { label: "" }]);
  };
  const removeArea = (index: number) => {
    if (areas.length > 1) setAreas((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, label: string) => {
    setCategories((prev) => prev.map((c, i) => (i === index ? { label } : c)));
  };
  const addCategory = () => {
    setCategories((prev) => [...prev, { label: "" }]);
  };
  const removeCategory = (index: number) => {
    if (categories.length > 1) setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const filledAreas = areas.filter((a) => a.label.trim());
    if (filledAreas.length === 0) {
      toast.error("At least one product area is required.");
      return;
    }

    setSaving(true);
    try {
      const productAreas: ProductArea[] = filledAreas.map((a, i) => ({
        key: SLOT_KEYS[i],
        label: a.label.trim(),
      }));

      const filledCategories = categories.filter((c) => c.label.trim());
      const customOutcomeCategories: CustomCategory[] | undefined =
        filledCategories.length > 0
          ? filledCategories.map((c) => ({
              key: c.label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
              label: c.label.trim(),
            }))
          : undefined;

      await updateOrg({
        product_areas: productAreas,
        ...(customOutcomeCategories ? { custom_outcome_categories: customOutcomeCategories } : {}),
      });

      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomain = async () => {
    setSavingDomain(true);
    try {
      const normalized = domain
        .trim()
        .toLowerCase()
        .replace(/^@/, "")
        .replace(/\s+/g, "");
      await updateOrg({ allowed_email_domain: normalized || null });
      toast.success(
        normalized
          ? `Domain set — ${normalized} sign-ups will be routed to request access.`
          : "Domain cleared — this workspace won't auto-detect new sign-ups.",
      );
    } catch {
      toast.error("Failed to update domain.");
    } finally {
      setSavingDomain(false);
    }
  };

  const inputClass =
    "flex-1 border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {currentOrg?.name ?? "Organization"} configuration
        </p>
      </div>

      <div className="space-y-8 max-w-lg">
        {/* Team email domain */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3">
            Team Email Domain
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            When set, new sign-ups with emails at this domain will be prompted
            to request access to this workspace instead of creating a duplicate.
            Leave blank for consulting or private workspaces.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourcompany.com"
              className={inputClass}
            />
            <button
              onClick={handleSaveDomain}
              disabled={savingDomain}
              className="text-sm font-semibold text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {savingDomain ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        {/* Pending join requests */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3">
            Pending Join Requests
          </h2>
          {joinRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground/70">
              No pending requests.
            </p>
          ) : (
            <div className="space-y-2">
              {joinRequests.map((req) => (
                <div
                  key={req.id}
                  className="border border-border rounded-sm p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{req.email}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Requested {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={approveMutation.isPending || denyMutation.isPending}
                      className="text-xs font-semibold text-background bg-foreground px-3 py-1.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => denyMutation.mutate(req.id)}
                      disabled={approveMutation.isPending || denyMutation.isPending}
                      className="text-xs text-muted-foreground hover:text-signal-red transition-colors px-2 py-1.5"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Product Areas */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3">
            Product Areas
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            These organize your strategic bets into domains. 1 to 7 areas.
          </p>
          <div className="space-y-2">
            {areas.map((area, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={area.label}
                  onChange={(e) => updateArea(i, e.target.value)}
                  className={inputClass}
                  placeholder={`Product area ${i + 1}`}
                />
                {areas.length > 1 && (
                  <button
                    onClick={() => removeArea(i)}
                    className="text-muted-foreground hover:text-signal-red text-sm p-1 shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {areas.length < 7 && (
              <button
                onClick={addArea}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                + Add product area
              </button>
            )}
          </div>
        </section>

        {/* Outcome Categories */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3">
            Outcome Categories
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Classify what each bet is driving toward.
          </p>
          <div className="space-y-2">
            {categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={cat.label}
                  onChange={(e) => updateCategory(i, e.target.value)}
                  className={inputClass}
                  placeholder={`Category ${i + 1}`}
                />
                {categories.length > 1 && (
                  <button
                    onClick={() => removeCategory(i)}
                    className="text-muted-foreground hover:text-signal-red text-sm p-1 shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addCategory}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add category
            </button>
          </div>
        </section>

        {/* Save product areas + categories */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "text-sm font-semibold px-4 py-2.5 rounded-sm transition-colors",
              "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50",
            )}
          >
            {saving ? "Saving..." : "Save Product Areas & Categories"}
          </button>
        </div>
      </div>
    </div>
  );
}
