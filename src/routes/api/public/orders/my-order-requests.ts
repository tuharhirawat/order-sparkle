import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };

/**
 * Server-to-server endpoint for the ASP.NET backend.
 * Requires `Authorization: Bearer <supabase access token>`; the token is
 * validated before any profile or order data is read.
 */
export const Route = createFileRoute("/api/public/orders/my-order-requests")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const { verifyBearer, loadMyOrderRequests } = await import("@/lib/account.server");
        let auth;
        try {
          auth = await verifyBearer(request.headers.get("authorization"));
        } catch {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
        }
        try {
          const orders = await loadMyOrderRequests(auth.supabase, auth.userId, auth.email);
          return new Response(JSON.stringify(orders), { status: 200, headers: jsonHeaders });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Request failed";
          return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
        }
      },
    },
  },
});
