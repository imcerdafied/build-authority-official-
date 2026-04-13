import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useOrgFromUrl } from "@/hooks/useOrgFromUrl";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface ProductArea {
  key: string;
  label: string;
}

export interface CustomCategory {
  key: string;
  label: string;
}

const DEFAULT_PRODUCT_AREAS: ProductArea[] = [
  { key: "S1", label: "Area 1" },
  { key: "S2", label: "Area 2" },
  { key: "S3", label: "Area 3" },
];

interface OrgMembership {
  org_id: string;
  role: AppRole;
  role_label: string | null;
  organization: Tables<"organizations">;
}

interface OrgContextType {
  currentOrg: Tables<"organizations"> | null;
  currentRole: AppRole | null;
  memberships: OrgMembership[];
  loading: boolean;
  productAreas: ProductArea[];
  customOutcomeCategories: CustomCategory[] | null;
  setCurrentOrgId: (orgId: string) => void;
  createOrg: (name: string, productAreas?: ProductArea[], customOutcomeCategories?: CustomCategory[], allowedEmailDomain?: string) => Promise<string>;
  updateOrg: (fields: { product_areas?: ProductArea[]; custom_outcome_categories?: CustomCategory[]; allowed_email_domain?: string | null }) => Promise<void>;
  refetchMemberships: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType>({
  currentOrg: null,
  currentRole: null,
  memberships: [],
  loading: true,
  productAreas: DEFAULT_PRODUCT_AREAS,
  customOutcomeCategories: null,
  setCurrentOrgId: () => {},
  createOrg: async () => {
    throw new Error("Not implemented");
  },
  updateOrg: async () => {},
  refetchMemberships: async () => {},
});

const LAST_ACTIVE_ORG_STORAGE_KEY = "ba_last_active_org";
const LEGACY_ORG_STORAGE_KEY = "ba_current_org";
const PENDING_ORG_JOIN_KEY = "pending_org_join";
const PENDING_JOIN_TTL_MS = 1000 * 60 * 30;

function readLastActiveOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(LAST_ACTIVE_ORG_STORAGE_KEY) ||
    localStorage.getItem(LEGACY_ORG_STORAGE_KEY)
  );
}

function writeLastActiveOrgId(orgId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ACTIVE_ORG_STORAGE_KEY, orgId);
  localStorage.setItem(LEGACY_ORG_STORAGE_KEY, orgId);
}

function clearLastActiveOrgId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAST_ACTIVE_ORG_STORAGE_KEY);
  localStorage.removeItem(LEGACY_ORG_STORAGE_KEY);
}

function readPendingOrgJoin(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PENDING_ORG_JOIN_KEY);
  if (!raw) return null;

  // Legacy value support (plain org id string)
  if (!raw.startsWith("{")) return raw;

  try {
    const parsed = JSON.parse(raw) as { orgId?: string; createdAt?: number; expiresAt?: number };
    if (!parsed?.orgId) return null;
    const expiry = parsed.expiresAt ?? ((parsed.createdAt ?? 0) + PENDING_JOIN_TTL_MS);
    if (expiry && Date.now() > expiry) {
      localStorage.removeItem(PENDING_ORG_JOIN_KEY);
      return null;
    }
    return parsed.orgId;
  } catch {
    localStorage.removeItem(PENDING_ORG_JOIN_KEY);
    return null;
  }
}

function parseProductAreas(raw: unknown): ProductArea[] {
  if (!raw || !Array.isArray(raw)) return DEFAULT_PRODUCT_AREAS;
  const parsed = raw.filter(
    (item: any) => item && typeof item.key === "string" && typeof item.label === "string",
  ) as ProductArea[];
  return parsed.length > 0 ? parsed : DEFAULT_PRODUCT_AREAS;
}

function parseCustomCategories(raw: unknown): CustomCategory[] | null {
  if (!raw || !Array.isArray(raw)) return null;
  const parsed = raw.filter(
    (item: any) => item && typeof item.key === "string" && typeof item.label === "string",
  ) as CustomCategory[];
  return parsed.length > 0 ? parsed : null;
}

function fallbackOrganization(orgId: string, fallbackName?: string): Tables<"organizations"> {
  return {
    id: orgId,
    name: fallbackName || "Organization",
    created_at: new Date(0).toISOString(),
    created_by: null,
    allowed_email_domain: null,
    custom_outcome_categories: null,
    product_areas: [],
  };
}


export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(
    readLastActiveOrgId(),
  );
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    let mapped: OrgMembership[] = [];

    let { data, error } = await supabase
      .from("organization_memberships")
      .select("org_id, role, role_label, organizations(*)")
      .eq("user_id", user.id);

    if (error && String(error.message || "").includes("role_label")) {
      const retry = await supabase
        .from("organization_memberships")
        .select("org_id, role, organizations(*)")
        .eq("user_id", user.id);
      data = retry.data?.map((row: any) => ({ ...row, role_label: null })) as any;
      error = retry.error as any;
    }

    if (!error) {
      mapped = (data || []).map((m: any) => ({
        org_id: m.org_id,
        role: m.role,
        role_label: m.role_label ?? null,
        organization: m.organizations ?? fallbackOrganization(m.org_id),
      }));
    } else {
      console.error("Primary membership fetch failed. Falling back to edge function:", error);
    }

    // Single fallback via edge function (service-role backed) if the primary RLS path returns empty.
    if (mapped.length === 0) {
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke("my-orgs");
      if (edgeError) {
        console.error("Edge membership fallback failed:", edgeError);
      } else {
        const edgeMemberships = Array.isArray((edgeData as any)?.memberships)
          ? (edgeData as any).memberships
          : [];
        mapped = edgeMemberships.map((m: any) => ({
          org_id: m.org_id,
          role: m.role,
          role_label: m.role_label ?? null,
          organization: m.organizations ?? fallbackOrganization(m.org_id),
        }));
      }
    }

    setMemberships(mapped);

    // Auto-select org
    if (mapped.length > 0) {
      const stored = readLastActiveOrgId();
      const validStored = mapped.find((m) => m.org_id === stored);
      if (!validStored) {
        setCurrentOrgId(mapped[0].org_id);
        writeLastActiveOrgId(mapped[0].org_id);
      }
    } else {
      setCurrentOrgId(null);
      clearLastActiveOrgId();
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/join/")) {
      return;
    }

    const pendingOrgId = readPendingOrgJoin();
    if (!user || !pendingOrgId) return;

    const processPendingJoin = async () => {
      try {
        const { error } = await supabase.functions.invoke("join-org", {
          body: { orgId: pendingOrgId },
        });
        if (!error) {
          localStorage.removeItem(PENDING_ORG_JOIN_KEY);
          await fetchMemberships();
          setCurrentOrgId(pendingOrgId);
          writeLastActiveOrgId(pendingOrgId);
        }
      } catch {
        // leave key for retry
      }
    };

    processPendingJoin();
  }, [user, fetchMemberships]);

  const handleSetCurrentOrgId = (orgId: string) => {
    setCurrentOrgId(orgId);
    writeLastActiveOrgId(orgId);
  };

  useOrgFromUrl(handleSetCurrentOrgId);

  const createOrg = async (
    name: string,
    productAreas?: ProductArea[],
    customOutcomeCategories?: CustomCategory[],
    allowedEmailDomain?: string,
  ): Promise<string> => {
    if (!user) throw new Error("Please sign in again.");
    const payload = {
      name,
      productAreas: productAreas?.length ? productAreas : undefined,
      customOutcomeCategories: customOutcomeCategories?.length ? customOutcomeCategories : undefined,
    };

    const { data, error } = await supabase.functions.invoke("create-org", { body: payload });
    if (!error && data?.orgId) {
      // Edge function doesn't accept domain; set it post-create as admin.
      const domain = allowedEmailDomain?.trim().toLowerCase();
      if (domain) {
        const { error: domainErr } = await supabase
          .from("organizations")
          .update({ allowed_email_domain: domain } as any)
          .eq("id", data.orgId);
        if (domainErr) {
          console.error("Failed to set allowed_email_domain:", domainErr);
        }
      }
      await fetchMemberships();
      handleSetCurrentOrgId(data.orgId);
      return data.orgId;
    }

    const errorMsg = error?.message ? String(error.message) : "Failed to create organization.";
    console.error("create-org edge function failed:", errorMsg);
    throw new Error(errorMsg);
  };

  const updateOrg = async (fields: { product_areas?: ProductArea[]; custom_outcome_categories?: CustomCategory[]; allowed_email_domain?: string | null }) => {
    if (!currentOrgId) return;
    const { error } = await supabase
      .from("organizations")
      .update(fields as any)
      .eq("id", currentOrgId);
    if (error) {
      console.error("Failed to update org:", error);
      throw error;
    }
    await fetchMemberships();
  };

  const currentMembership = memberships.find((m) => m.org_id === currentOrgId);
  const currentOrg = currentMembership?.organization ?? null;

  const productAreas = useMemo(
    () => parseProductAreas((currentOrg as any)?.product_areas),
    [currentOrg],
  );

  const customOutcomeCategories = useMemo(
    () => parseCustomCategories((currentOrg as any)?.custom_outcome_categories),
    [currentOrg],
  );

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        currentRole: currentMembership?.role ?? null,
        memberships,
        loading,
        productAreas,
        customOutcomeCategories,
        setCurrentOrgId: handleSetCurrentOrgId,
        createOrg,
        updateOrg,
        refetchMemberships: fetchMemberships,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
