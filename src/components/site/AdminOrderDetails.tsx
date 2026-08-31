import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { ImagePreviewModal } from "./ImagePreviewModal";
import {
  adminOrderDetailsQuery,
  acknowledgeOrder,
  markOrderPaid,
  cancelOrder,
  refundOrder,
  addOrderNote,
  adjustOrderItems
} from "@/lib/admin-data";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 px-6 py-4 odd:bg-secondary/30">
      <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-6 rounded-sm border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h3 className="text-sm font-medium">{title}</h3>

        <span
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""
            }`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-6 py-5">
          {children}
        </div>
      )}
    </div>
  );
}

const STATUS_BADGE_CLASSES = {
  default: "border-border bg-secondary text-foreground",
  success: "border-gold/50 bg-gold/10 text-gold",
  warning: "border-gold/40 bg-gold/5 text-gold",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
} as const;

function StatusBadge({ children, variant = "default" }: {
  children: React.ReactNode;
  variant?: keyof typeof STATUS_BADGE_CLASSES;
}) {
  return (
    <span
      className={`inline-flex rounded-sm border px-3 py-1.5 text-xs font-medium ${STATUS_BADGE_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}

export default function AdminOrderDetails() {
  const { id, category } = useParams<{ id: string; category: string }>();
  const queryClient = useQueryClient();
  const {
    data: order,
    isPending,
  } = useQuery(adminOrderDetailsQuery(id!));

  const [note, setNote] = useState("");
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["admin", "orders"],
    });
  };

  const adjustMutation = useMutation({
    mutationFn: () => adjustOrderItems(
      id!,
      order!.items
        .filter((i) => quantities[i.id] !== undefined && quantities[i.id] !== i.quantity)
        .map((i) => ({ orderItemId: i.id, quantity: quantities[i.id]! }))
    ),

    onSuccess: () => {
      toast.success("Quantities updated");
      setQuantities({});
      invalidate();
    },

    onError: (e: any) =>
      toast.error("Could not update quantities", { description: e?.response?.data?.message ?? e.message }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => acknowledgeOrder(id!),

    onSuccess: () => {
      toast.success("Order acknowledged");
      invalidate();
    },

    onError: (error: any) => {
      toast.error("Could not acknowledge order", {
        description: error?.response?.data?.message ?? error.message,
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: () => markOrderPaid(id!),

    onSuccess: () => {
      toast.success("Order marked as paid");

      invalidate();
    },

    onError: (e: any) =>
      toast.error("Could not mark as paid", {
        description: e?.response?.data?.message ?? e.message
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id!),

    onSuccess: () => {
      toast.success("Order cancelled");
      invalidate();
    },

    onError: (error: any) => {
      toast.error("Could not cancel order", {
        description: error?.response?.data?.message ?? error.message,
      });
    },
  });

  const refundMutation = useMutation({
    mutationFn: () => refundOrder(id!),

    onSuccess: () => {
      toast.success("Order refunded");
      invalidate();
    },

    onError: (error: any) => {
      toast.error("Could not refund order", {
        description: error?.response?.data?.message ?? error.message,
      });
    },
  });

  const noteMutation = useMutation({
    mutationFn: (text: string) =>
      addOrderNote(id!, text),

    onSuccess: () => {
      toast.success("Note added");

      setNote("");
      setNoteFormOpen(false);

      invalidate();
    },

    onError: (error: any) => {
      toast.error("Could not add note", {
        description: error?.response?.data?.message ?? error.message,
      });
    },
  });


  const busy =
    acknowledgeMutation.isPending ||
    adjustMutation.isPending ||
    markPaidMutation.isPending ||
    cancelMutation.isPending ||
    refundMutation.isPending ||
    noteMutation.isPending;

  if (isPending || !order) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-96 w-full rounded-sm" />
      </div>
    );
  }

  const statusVariant =
    order.status === "OrderConfirmed"
      ? "success"
      : order.status === "Cancelled" || order.status === "Refunded"
        ? "danger"
        : "default";

  const paymentVariant =
    order.paymentStatus === "Paid"
      ? "success"
      : order.paymentStatus === "Refunded"
        ? "danger"
        : "default";

  const canAcknowledge =
    order.status === "PendingAcknowledgement";

  const canCancel =
    order.status === "PendingAcknowledgement" ||
    order.status === "OrderAcknowledged";

  const canRefund =
    order.amountPaid > 0 &&
    order.status !== "Refunded" &&
    order.status !== "Cancelled";

  return (
    <div>
      <nav className="text-xs text-muted-foreground">
        <Link
          to={`/admin/orders/`}
          className="hover:text-foreground"
        >
          Orders
        </Link>

        <span className="mx-2">/</span>

        <Link
          to={`/admin/orders/${category}`}
          className="hover:text-foreground"
        >
          {category}
        </Link>

        <span className="mx-2">/</span>

        <span className="text-foreground">
          {order.orderNumber}
        </span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">
            Order Details
          </h1>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="rounded-sm border border-border">
            <div>
              <Row
                label="Order Reference"
                value={order.orderNumber}
              />

              <Row
                label="Order Status"
                value={
                  <StatusBadge variant={statusVariant}>
                    {order.status}
                  </StatusBadge>
                }
              />

              <Row
                label="Payment Status"
                value={
                  order.paymentStatus ? (
                    <StatusBadge variant={paymentVariant}>
                      {order.paymentStatus}
                    </StatusBadge>
                  ) : (
                    <span className="text-muted-foreground">
                      —
                    </span>
                  )
                }
              />

              <Row
                label="Date raised"
                value={formatDate(order.createdAt)}
              />

              <Row
                label="Customer"
                value={order.shipFullName}
              />

              <Row
                label="Email"
                value={order.shipEmail ?? "—"}
              />

              <Row
                label="Mobile number"
                value={order.shipPhone}
              />

              <Row
                label="Address Details"
                value={`${order.shipLine1}, ${order.shipCity}, ${order.shipState} — ${order.shipPincode}`}
              />

              <Row
                label="Customer Note"
                value={order.customerNote ?? "—"}
              />

              <Row
                label="Order Amount"
                value={formatCurrency(order.total)}
              />

              {order.paymentStatus !== "Refunded" && (
                order.amountPaid > 0 ? (
                  <Row
                    label="Amount Paid"
                    value={formatCurrency(order.amountPaid)}
                  />
                ) : (
                  <Row
                    label="Amount Pending"
                    value={formatCurrency(order.amountPending)}
                  />
                )
              )}
            </div>
          </div>

          <Section
            title="Ordered Items"
            defaultOpen
          >
            <ul className="space-y-3 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => item.imageUrl && setPreviewImage(item.imageUrl)}
                    disabled={!item.imageUrl}
                    className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border text-center text-[10px] leading-tight text-muted-foreground transition-opacity enabled:hover:opacity-80 disabled:cursor-default"
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                    ) : (
                      <span className="px-1">{item.name || "No image"}</span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p>{item.name}</p>
                    {item.variantLabel && <p className="text-xs text-muted-foreground">{item.variantLabel}</p>}
                    <p className="text-xs text-muted-foreground">{item.sku ?? "No SKU"}</p>
                    {item.originalQuantity != null && (
                      <p className="text-xs text-gold">
                        {item.quantity === 0
                          ? `Not available (was ${item.originalQuantity})`
                          : `Adjusted from ${item.originalQuantity}`}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    {canAcknowledge ? (
                      <input
                        type="number"
                        min={0}
                        max={item.originalQuantity ?? item.quantity}
                        value={quantities[item.id] ?? item.quantity}
                        onChange={(e) => {
                          const cap = item.originalQuantity ?? item.quantity;
                          const next = Math.min(cap, Math.max(0, Number(e.target.value)));
                          setQuantities((prev) => ({ ...prev, [item.id]: next }));
                        }}
                        className="h-8 w-16 rounded-sm border border-border bg-background px-2 text-sm"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Qty {item.quantity}</span>
                    )}
                    <span className={`w-20 text-right ${item.quantity === 0 ? "text-muted-foreground line-through" : ""}`}>
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {canAcknowledge && order.items.some((i) => quantities[i.id] !== undefined && quantities[i.id] !== i.quantity) && (
              <Button
                size="sm"
                className="mt-3 rounded-sm"
                disabled={adjustMutation.isPending}
                onClick={() => adjustMutation.mutate()}
              >
                Save Quantity Changes
              </Button>
            )}

            <div className="mt-4 flex justify-between border-t border-border pt-3 text-sm font-medium">
              <span>Total</span>

              <span>{formatCurrency(order.total)}</span>
            </div>
          </Section>

          <Section title="Payment History">
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payments recorded.
              </p>
            ) : (
              <ul className="space-y-3">
                {order.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex justify-between gap-4 border-b border-border/60 pb-3 text-sm last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">
                        Payment received
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>

                    <span className="font-medium">
                      {formatCurrency(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Internal Notes History">
            {order.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {order.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-sm bg-secondary p-3 text-sm"
                  >
                    <p>
                      {n.note}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(n.createdAt)}
                      {n.createdBy && ` · ${n.createdBy}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Status History">
            {order.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No changes yet.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.history.map((h, i) => (
                  <li
                    key={i}
                    className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0"
                  >
                    <span>
                      {h.field === "Status"
                        ? "Order status"
                        : h.field === "PaymentStatus"
                          ? "Payment status"
                          : h.field}

                      :{" "}

                      <span className="text-muted-foreground">
                        {h.fromValue || "—"}
                      </span>

                      {" → "}

                      <span className="font-medium">
                        {h.toValue}
                      </span>

                      {h.changedBy && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          by {h.changedBy}
                        </span>
                      )}
                    </span>

                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(h.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4">
            {order.status !== "Cancelled" && order.status !== "Refunded" && (
              <div className="rounded-sm border border-border p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Order Actions
                </p>

                <div className="mt-4 space-y-2">
                  {canAcknowledge && (
                    <Button
                      className="w-full rounded-sm bg-gold text-background hover:bg-gold/90"
                      disabled={busy}
                      onClick={() =>
                        acknowledgeMutation.mutate()
                      }
                    >
                      Acknowledge Order
                    </Button>
                  )}

                  {order.status === "OrderAcknowledged" && (
                    <Button
                      className="w-full rounded-sm bg-gold text-background hover:bg-gold/90"
                      disabled={busy}
                      onClick={() => setMarkPaidOpen(true)}
                    >
                      Mark as Paid
                    </Button>
                  )}

                  {canCancel && (
                    <Button
                      variant="outline"
                      className="w-full rounded-sm"
                      disabled={busy}
                      onClick={() => setCancelOpen(true)}
                    >
                      Cancel Order
                    </Button>
                  )}

                  {canRefund && (
                    <Button
                      variant="outline"
                      className="w-full rounded-sm"
                      disabled={busy}
                      onClick={() => setRefundOpen(true)}
                    >
                      Initiate Refund
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-sm border border-border p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Internal Notes
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Add a private note to this order.
                  </p>
                </div>
              </div>

              {!noteFormOpen ? (
                <Button
                  className="mt-4 w-full rounded-sm bg-gold text-background hover:bg-gold/90"
                  disabled={busy}
                  onClick={() => setNoteFormOpen(true)}
                >
                  Add Internal Note
                </Button>
              ) : (
                <div className="mt-4">
                  <Textarea
                    id="new-note"
                    value={note}
                    rows={4}
                    maxLength={1000}
                    className="rounded-sm"
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note for this order…"
                    autoFocus
                  />

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-sm"
                      disabled={
                        noteMutation.isPending ||
                        !note.trim()
                      }
                      onClick={() =>
                        noteMutation.mutate(
                          note.trim()
                        )
                      }
                    >
                      Save Note
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-sm"
                      onClick={() => {
                        setNoteFormOpen(false);
                        setNote("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {previewImage && (
        <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}

      <ConfirmActionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this order?"
        description={`This will cancel ${order.orderNumber}. This action cannot be undone.`}
        cancelLabel="Keep order"
        confirmLabel="Yes, cancel order"
        onConfirm={() => cancelMutation.mutate()}
      />

      <ConfirmActionDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="Refund this order?"
        description={`This will refund ${formatCurrency(order.amountPaid)} for ${order.orderNumber}.`}
        confirmLabel="Yes, initiate refund"
        onConfirm={() => refundMutation.mutate()}
      />

      <ConfirmActionDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        title="Mark order as paid?"
        description={`This confirms the full amount of ${formatCurrency(order.amountPending)} has been received for ${order.orderNumber}. The order will move to Confirmed.`}
        confirmLabel="Yes, mark as paid"
        onConfirm={() => markPaidMutation.mutate()}
      />
    </div>
  );
}