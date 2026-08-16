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
  statusTone,
  type AdminOrder,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-data";

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
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Order updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
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
        <span className="ml-auto text-sm">{formatCurrency(Number(order.total))}</span>
      </button>

      {open && (
        <div className="grid gap-8 border-t border-border p-5 lg:grid-cols-2">
          <div>
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
