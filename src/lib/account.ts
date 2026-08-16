import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyOrderRequests } from "./account.functions";

export interface AccountProfile {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
}

export interface AccountSession {
  userId: string | null;
  email: string | null;
  profile: AccountProfile | null;
}

export const accountSessionQuery = () =>
  queryOptions({
    queryKey: ["account-session"],
    queryFn: async (): Promise<AccountSession> => {
      const { data } = await supabase.auth.getUser();
      const user = data.user ?? null;
      if (!user) return { userId: null, email: null, profile: null };

      const { data: row } = await supabase
        .from("profiles")
        .select("id, full_name, phone, email")
        .eq("id", user.id)
        .maybeSingle();

      return {
        userId: user.id,
        email: user.email ?? null,
        profile: row
          ? { id: row.id, fullName: row.full_name, phone: row.phone, email: row.email }
          : null,
      };
    },
    staleTime: 30_000,
  });

export const myOrderRequestsQuery = () =>
  queryOptions({
    queryKey: ["my-order-requests"],
    queryFn: () => getMyOrderRequests(),
    staleTime: 15_000,
  });

/** Signup metadata is applied once the confirmed user first reaches the app. */
export async function ensureProfile(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const meta = (user.user_metadata ?? {}) as { full_name?: string; phone?: string };
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    const patch: { full_name?: string; phone?: string; email?: string } = {};
    if (!existing.full_name && meta.full_name) patch.full_name = meta.full_name;
    if (!existing.phone && meta.phone) patch.phone = meta.phone;
    if (Object.keys(patch).length > 0) {
      await supabase.from("profiles").update(patch).eq("id", user.id);
    }
    return;
  }

  await supabase.from("profiles").insert({
    id: user.id,
    full_name: meta.full_name ?? "",
    phone: meta.phone ?? null,
    email: user.email ?? null,
  });
}
