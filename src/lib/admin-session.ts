import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminSession {
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  anyAdminExists: boolean;
}

export const adminSessionQuery = () =>
  queryOptions({
    queryKey: ["admin-session"],
    queryFn: async (): Promise<AdminSession> => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) return { userId: null, email: null, isAdmin: false, anyAdminExists: true };

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");

      let anyAdminExists = true;
      if (!isAdmin) {
        // Admins-only RLS means a non-admin sees zero rows; use it as a "no admin yet" probe.
        const { count } = await supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        anyAdminExists = (count ?? 0) > 0;
      }

      return { userId: user.id, email: user.email ?? null, isAdmin, anyAdminExists };
    },
    staleTime: 10_000,
  });
