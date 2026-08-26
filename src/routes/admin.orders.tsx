import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  adminOrdersQuery,
  orderAvailabilityQuery,
  statusTone,
  type AdminOrder,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-data";

/** Order stages that reserve stock. */
const COMMITTING_STATUSES: OrderStatus[] = [
  "Confirmed",
  "PaymentPending",
  "PaymentReceived",
  "Processing",
  "Shipped",
  "Delivered",
];

interface Shortage {
  product_name: string;
  variant_label: string | null;
  requested: number;
  available: number;
}

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const { data: orders, isPending } = useQuery(adminOrdersQuery());
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      status?: OrderStatus;
      payment_status?: PaymentStatus;
      internal_notes?: string;
    }) => {
      const { id, ...patch } = input;

      // Stock-consuming stages go through an atomic database action that locks
      // the affected products, validates availability, deducts stock and
      // records the movement in one transaction.
      if (patch.status && COMMITTING_STATUSES.includes(patch.status)) {
        const { data, error } = await supabase.rpc("confirm_order_with_inventory", {
          _order_id: id,
          _status: patch.status,
        });
        if (error) throw new Error(error.message);
        const result = data as unknown as { ok: boolean; shortages?: Shortage[] };
        if (!result?.ok) {
          const lines = (result?.shortages ?? []).map(
            (s) =>
              `${s.product_name}${s.variant_label ? ` (${s.variant_label})` : ""}: requested ${s.requested}, only ${s.available} available`,
          );
          throw new Error(
            lines.length > 0 ? `Insufficient stock — ${lines.join("; ")}` : "Insufficient stock for this order.",
          );
        }
        const rest = { ...patch };
        delete rest.status;
        if (Object.keys(rest).length > 0) {
          const { error: restError } = await supabase.from("orders").update(rest).eq("id", id);
          if (restError) throw new Error(restError.message);
        }
        return;
      }

      if (patch.status === "Cancelled") {
        const { error: releaseError } = await supabase.rpc("release_order_inventory", { _order_id: id });
        if (releaseError) throw new Error(releaseError.message);
      }

      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Order updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "order-availability"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => toast.error("Update failed", { description: error.message }),
  });

  const term = query.trim().toLowerCase();
  const filtered = (orders ?? []).filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesTerm =
      !term ||
      order.order_number.toLowerCase().includes(term) ||
      order.ship_full_name.toLowerCase().includes(term) ||
      order.ship_phone.includes(term);
    return matchesStatus && matchesTerm;
  });

  return (
    <div>
      <p className="eyebrow">Fulfilment</p>
      <h1 className="mt-2 font-display text-4xl">Orders</h1>

      <div className="mt-8 flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order ID, name or phone"
          className="h-10 max-w-xs rounded-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}
        >
          <SelectTrigger className="h-10 w-52 rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 space-y-3">
        {isPending && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-sm" />)}
        {!isPending && filtered.length === 0 && (
          <p className="rounded-sm border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No orders match this view.
          </p>
        )}
        {filtered.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            open={openId === order.id}
            onToggle={() => setOpenId(openId === order.id ? null : order.id)}
            onUpdate={(patch) => update.mutate({ id: order.id, ...patch })}
            busy={update.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  open,
  onToggle,
  onUpdate,
  busy,
}: {
  order: AdminOrder;
  open: boolean;
  onToggle: () => void;
  onUpdate: (patch: { status?: OrderStatus; payment_status?: PaymentStatus; internal_notes?: string }) => void;
  busy: boolean;
}) {
  const [notes, setNotes] = useState(order.internal_notes ?? "");
  const { data: availability } = useQuery(
    orderAvailabilityQuery(order.id, open && !order.inventory_committed),
  );
  const shortages = (availability ?? []).filter((a) => a.tracked && a.available < a.requested);

  return (
    <div className="rounded-sm border border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left"
      >
        <span className="font-medium">{order.order_number}</span>
        <span className="text-sm text-muted-foreground">
          {order.ship_full_name} · {order.ship_phone}
        </span>
        <span className={`rounded-sm border px-2 py-1 text-xs ${statusTone(order.status)}`}>
          {order.status}
        </span>
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {order.payment_status}
        </span>
        {order.inventory_committed && (
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            Stock reserved
          </span>
        )}
        <span className="ml-auto text-sm">{formatCurrency(Number(order.total))}</span>
      </button>

      {open && (
        <div className="grid gap-8 border-t border-border p-5 lg:grid-cols-2">
          <div>
            {shortages.length > 0 && (
              <div className="mb-4 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="text-xs uppercase tracking-[0.14em]">Insufficient stock</p>
                <ul className="mt-2 space-y-1">
                  {shortages.map((s) => (
                    <li key={s.order_item_id}>
                      {s.product_name}
                      {s.variant_label ? ` (${s.variant_label})` : ""} — requested {s.requested},{" "}
                      {s.available <= 0
                        ? "currently unavailable"
                        : `only ${s.available} available`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h3 className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Items</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.product_name}
                    {item.variant_label && (
                      <span className="block text-xs text-muted-foreground">{item.variant_label}</span>
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {item.product_sku} · Qty {item.quantity}
                    </span>
                  </span>
                  <span>{formatCurrency(Number(item.line_total))}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Delivery
            </h3>
            <p className="mt-2 text-sm leading-relaxed">
              {order.ship_full_name}
              <br />
              {order.ship_line1}
              <br />
              {order.ship_city}, {order.ship_state} — {order.ship_pincode}
              <br />
              {order.ship_phone}
              {order.ship_email && (
                <>
                  <br />
                  {order.ship_email}
                </>
              )}
            </p>
            {order.customer_note && (
              <p className="mt-4 rounded-sm bg-secondary p-3 text-sm">
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Customer note
                </span>
                <br />
                {order.customer_note}
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Placed {formatDate(order.created_at)}
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Order status
              </label>
              <Select
                value={order.status}
                onValueChange={(value) => onUpdate({ status: value as OrderStatus })}
              >
                <SelectTrigger className="mt-2 h-10 rounded-sm" disabled={busy}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Payment status
              </label>
              <Select
                value={order.payment_status}
                onValueChange={(value) => onUpdate({ payment_status: value as PaymentStatus })}
              >
                <SelectTrigger className="mt-2 h-10 rounded-sm" disabled={busy}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor={`notes-${order.id}`} className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Internal notes
              </label>
              <Textarea
                id={`notes-${order.id}`}
                value={notes}
                rows={4}
                maxLength={1000}
                className="mt-2 rounded-sm"
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button
                size="sm"
                className="mt-3 rounded-sm"
                disabled={busy}
                onClick={() => onUpdate({ internal_notes: notes })}
              >
                Save notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
