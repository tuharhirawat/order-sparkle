import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MyOrderRequest } from "./account.types";

export type { MyOrderRequest };

/**
 * Orders a signed-in shopper may see: those placed with their verified account
 * email, or with the phone number claimed on their profile (unique per account).
 */
export const getMyOrderRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyOrderRequest[]> => {
    const { loadMyOrderRequests } = await import("./account.server");
    const authEmail = typeof context.claims['email'] === "string" ? (context.claims['email'] as string) : null;
    return loadMyOrderRequests(context.supabase, context.userId, authEmail);
  });
