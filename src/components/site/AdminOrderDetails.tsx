import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  adminOrderDetailsQuery,
  acknowledgeOrder,
  addOrderPayment,
  markOrderDelivered,
  cancelOrder,
  refundOrder,
  addOrderNote,
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

function StatusBadge({ children, variant = "default" }: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const classes = {
    default: "border-border bg-secondary text-foreground",
    success: "border-gold/50 bg-gold/10 text-gold",
    warning: "border-gold/40 bg-gold/5 text-gold",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
  };

  return (
    <span
      className={`inline-flex rounded-sm border px-3 py-1.5 text-xs font-medium ${classes[variant]}`}
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
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);


  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["admin", "orders"],
    });
  };

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

  const paymentMutation = useMutation({
    mutationFn: (amount: number) => addOrderPayment(id!, amount),

    onSuccess: () => {
      toast.success("Payment recorded");

      setPaymentAmount("");
      setPaymentFormOpen(false);

      invalidate();
    },

    onError: (error: any) => {
      toast.error("Could not record payment", {
        description: error?.response?.data?.message ?? error.message,
      });
    },
  });

  const deliveredMutation = useMutation({
    mutationFn: () => markOrderDelivered(id!),

    onSuccess: () => {
      toast.success("Order marked as delivered");
      invalidate();
    },

    onError: (error: any) => {
      toast.error("Could not mark order as delivered", {
        description: error?.response?.data?.message ?? error.message,
      });
    },
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
    paymentMutation.isPending ||
    deliveredMutation.isPending ||
    cancelMutation.isPending ||
    refundMutation.isPending ||
    noteMutation.isPending;

  const handleAddPayment = () => {
    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    if (amount > order!.amountPending) {
      toast.error(
        `Payment cannot exceed ${formatCurrency(order!.amountPending)}.`
      );

      return;
    }

    paymentMutation.mutate(amount);
  };

  if (isPending || !order) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-96 w-full rounded-sm" />
      </div>
    );
  }

  const statusVariant =
    order.status === "Completed"
      ? "success"
      : order.status === "Cancelled" ||
        order.status === "Refunded"
        ? "danger"
        : order.status === "OrderConfirmed" ||
          order.status === "ReadyForShipment"
          ? "success"
          : "default";

  const paymentVariant =
    order.paymentStatus === "Paid"
      ? "success"
      : order.paymentStatus === "PartiallyPaid"
        ? "warning"
        : order.paymentStatus === "Refunded"
          ? "danger"
          : "default";

  const canAcknowledge =
    order.status === "PendingAcknowledgement";

  const canAddPayment =
    order.status === "OrderAcknowledged" ||
    order.status === "OrderConfirmed";

  const canMarkDelivered =
    order.status === "ReadyForShipment";

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
                <>
                  <Row
                    label="Amount Paid"
                    value={formatCurrency(order.amountPaid)}
                  />

                  <Row
                    label="Amount Pending"
                    value={formatCurrency(order.amountPending)}
                  />
                </>
              )}
            </div>
          </div>

          <Section
            title="Ordered Items"
            defaultOpen
          >
            <ul className="space-y-3 text-sm">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4"
                >
                  <span>
                    {item.name}

                    {item.variantLabel && (
                      <span className="block text-xs text-muted-foreground">
                        {item.variantLabel}
                      </span>
                    )}

                    <span className="block text-xs text-muted-foreground">
                      {item.sku ?? "No SKU"} · Qty {item.quantity}
                    </span>
                  </span>

                  <span>
                    {formatCurrency(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-between border-t border-border pt-3 text-sm font-medium">
              <span>
                Total
              </span>

              <span>
                {formatCurrency(order.total)}
              </span>
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

                {canAddPayment &&
                  order.paymentStatus !== "Paid" &&
                  order.paymentStatus !== "Refunded" && (
                    <Button
                      className="w-full rounded-sm"
                      disabled={busy}
                      onClick={() =>
                        setPaymentFormOpen((open) => !open)
                      }
                    >
                      Add Payment
                    </Button>
                  )}

                {canMarkDelivered && (
                  <Button
                    className="w-full rounded-sm bg-gold text-background hover:bg-gold/90"
                    disabled={busy}
                    onClick={() =>
                      deliveredMutation.mutate()
                    }
                  >
                    Mark as Delivered
                  </Button>
                )}

                {canCancel && (
                  <Button
                    variant="outline"
                    className="w-full rounded-sm"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to cancel this order?"
                        )
                      ) {
                        cancelMutation.mutate();
                      }
                    }}
                  >
                    Cancel Order
                  </Button>
                )}

                {canRefund && (
                  <Button
                    variant="outline"
                    className="w-full rounded-sm"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Refund ${formatCurrency(
                            order.amountPaid
                          )} for this order?`
                        )
                      ) {
                        refundMutation.mutate();
                      }
                    }}
                  >
                    Initiate Refund
                  </Button>
                )}
              </div>
            </div>

            {canAddPayment &&
              order.paymentStatus !== "Paid" &&
              order.paymentStatus !== "Refunded" &&
              paymentFormOpen && (
                <div className="rounded-sm border border-border p-5">
                  <div>
                    <p className="text-sm font-medium">
                      Record Payment
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Amount pending:{" "}
                      {formatCurrency(order.amountPending)}
                    </p>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="payment-amount"
                      className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Amount Paid
                    </label>

                    <input
                      id="payment-amount"
                      type="number"
                      min="0.01"
                      max={order.amountPending}
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) =>
                        setPaymentAmount(e.target.value)
                      }
                      className="mt-2 h-10 w-full rounded-sm border border-border bg-background px-3 text-sm outline-none focus:border-gold"
                      placeholder="Enter amount"
                    />
                  </div>

                  <Button
                    className="mt-3 w-full rounded-sm"
                    disabled={
                      paymentMutation.isPending ||
                      !paymentAmount
                    }
                    onClick={handleAddPayment}
                  >
                    Record Payment
                  </Button>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Maximum:{" "}
                    {formatCurrency(order.amountPending)}
                  </p>
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
    </div>
  );
}