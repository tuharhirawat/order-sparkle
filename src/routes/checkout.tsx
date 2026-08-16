import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { createOrderRequest, type OrderConfirmation } from "@/lib/orders.functions";
import { saveLastOrder } from "@/lib/last-order";
import { accountSessionQuery } from "@/lib/account";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Request Your Order — Aurelia Fine Jewellery" },
      {
        name: "description",
        content:
          "Share your delivery details to request your Aurelia jewellery order. We record it instantly and confirm on WhatsApp.",
      },
      { property: "og:title", content: "Request Your Order — Aurelia Fine Jewellery" },
      { property: "og:description", content: "Request your Aurelia jewellery order in a minute." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  note: string;
}

const EMPTY: FormState = {
  fullName: "",
  phone: "",
  email: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
  note: "",
};

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
  if (!/^[6-9]\d{9}$/.test(form.phone.trim()))
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
    errors.email = "Enter a valid email address.";
  if (form.line1.trim().length < 6) errors.line1 = "Please enter your full address.";
  if (form.city.trim().length < 2) errors.city = "Please enter your city.";
  if (form.state.trim().length < 2) errors.state = "Please enter your state.";
  if (!/^\d{6}$/.test(form.pincode.trim())) errors.pincode = "Enter a valid 6-digit pincode.";
  if (form.note.length > 500) errors.note = "Please keep the note under 500 characters.";
  return errors;
}

function CheckoutPage() {
  const { items, subtotal, clear, hydrated } = useCart();
  const navigate = useNavigate();
  const submitOrder = useServerFn(createOrderRequest);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const { data: account } = useQuery(accountSessionQuery());
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !account?.userId) return;
    prefilled.current = true;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || account.profile?.fullName || "",
      phone: prev.phone || account.profile?.phone || "",
      email: prev.email || account.email || "",
    }));
  }, [account]);
  const idempotencyKey = useRef<string>("");
  if (!idempotencyKey.current && typeof crypto !== "undefined") {
    idempotencyKey.current = crypto.randomUUID();
  }

  const payloadItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    [items],
  );

  const mutation = useMutation({
    mutationFn: (): Promise<OrderConfirmation> =>
      submitOrder({
        data: {
          idempotencyKey: idempotencyKey.current,
          customer: {
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            line1: form.line1.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
            note: form.note.trim(),
          },
          items: payloadItems,
        },
      }),
    onSuccess: (confirmation) => {
      // Database first: the order exists before we hand off to WhatsApp.
      saveLastOrder(confirmation);
      clear();
      void navigate({ to: "/order/$orderNumber", params: { orderNumber: confirmation.orderNumber } });
    },
    onError: (error: Error) => {
      toast.error("We couldn't place your request", { description: error.message });
    },
  });

  const set = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please check the highlighted fields");
      return;
    }
    mutation.mutate();
  };

  if (hydrated && items.length === 0 && !mutation.isPending) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-4xl">Your bag is empty</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Add a piece to your bag before sending an order request.
          </p>
          <Button asChild className="mt-8 rounded-sm px-8 text-xs uppercase tracking-[0.2em]">
            <Link to="/shop">Explore the collection</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="eyebrow">Step 2 of 2</p>
        <h1 className="mt-2 font-display text-5xl">Request your order</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Nothing is charged now. We save your request, give you an order ID, and confirm the details
          with you personally on WhatsApp.
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            <fieldset disabled={mutation.isPending} className="space-y-6">
              <legend className="font-display text-2xl">Your details</legend>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  id="fullName"
                  label="Full name"
                  value={form.fullName}
                  onChange={set("fullName")}
                  error={errors.fullName}
                  autoComplete="name"
                  required
                />
                <Field
                  id="phone"
                  label="WhatsApp number"
                  value={form.phone}
                  onChange={set("phone")}
                  error={errors.phone}
                  autoComplete="tel-national"
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
              </div>
              <Field
                id="email"
                label="Email (optional)"
                type="email"
                value={form.email}
                onChange={set("email")}
                error={errors.email}
                autoComplete="email"
              />
            </fieldset>

            <fieldset disabled={mutation.isPending} className="space-y-6">
              <legend className="font-display text-2xl">Delivery address</legend>
              <Field
                id="line1"
                label="Address"
                value={form.line1}
                onChange={set("line1")}
                error={errors.line1}
                autoComplete="street-address"
                required
              />
              <div className="grid gap-6 sm:grid-cols-3">
                <Field
                  id="city"
                  label="City"
                  value={form.city}
                  onChange={set("city")}
                  error={errors.city}
                  autoComplete="address-level2"
                  required
                />
                <Field
                  id="state"
                  label="State"
                  value={form.state}
                  onChange={set("state")}
                  error={errors.state}
                  autoComplete="address-level1"
                  required
                />
                <Field
                  id="pincode"
                  label="Pincode"
                  value={form.pincode}
                  onChange={set("pincode")}
                  error={errors.pincode}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <Label htmlFor="note" className="text-xs uppercase tracking-[0.16em]">
                  Note for the studio (optional)
                </Label>
                <Textarea
                  id="note"
                  value={form.note}
                  maxLength={500}
                  rows={4}
                  className="mt-2 rounded-sm"
                  placeholder="Sizing, engraving, delivery timing…"
                  onChange={(e) => set("note")(e.target.value)}
                />
                {errors.note && <p className="mt-1 text-xs text-destructive">{errors.note}</p>}
              </div>
            </fieldset>

            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
              className="w-full rounded-sm text-xs uppercase tracking-[0.2em] sm:w-auto sm:px-12"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving your order…
                </>
              ) : (
                "Place order request"
              )}
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5" />
              Your details are stored securely and used only for this order.
            </p>
          </form>

          <aside className="surface-panel h-fit rounded-sm p-8">
            <h2 className="font-display text-2xl">Your bag</h2>
            <Separator className="my-6" />
            <ul className="space-y-4 text-sm">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.variantId ?? "base"}`}
                  className="flex justify-between gap-4"
                >
                  <span>
                    {item.name}
                    {item.variantLabel && (
                      <span className="block text-xs text-muted-foreground">{item.variantLabel}</span>
                    )}
                    <span className="block text-xs text-muted-foreground">Qty {item.quantity}</span>
                  </span>
                  <span className="whitespace-nowrap">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <Separator className="my-6" />
            <div className="flex justify-between text-base">
              <span>Estimated total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Final total, making charges and delivery are confirmed by our studio before payment.
            </p>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
} & Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "id">) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-[0.16em]">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 h-11 rounded-sm"
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
