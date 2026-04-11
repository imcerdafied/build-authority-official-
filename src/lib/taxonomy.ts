import { supabase } from "@/integrations/supabase/client";

export interface OutcomeCategoryItem {
  key: string;
  label: string;
}

export async function fetchOutcomeCategories(): Promise<OutcomeCategoryItem[]> {
  const { data, error } = await supabase
    .from("outcome_categories" as any)
    .select("key, label")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OutcomeCategoryItem[];
}

export interface OrgDomainItem {
  id: string;
  name: string;
  label: string;
  color: string;
  sort_order: number;
}

export async function fetchOrgDomains(orgId: string): Promise<OrgDomainItem[]> {
  const { data, error } = await supabase
    .from("org_solution_domains" as any)
    .select("id, name, label, color, sort_order")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OrgDomainItem[];
}
