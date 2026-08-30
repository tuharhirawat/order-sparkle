import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { readLastOrder } from "@/lib/last-order";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { CreateOrderResponse as OrderConfirmation } from "@/Types/orderTypes";
import dictionary from "@/Constants/dictionary";

export default function OrderConfirmationPage() {
  const { orderNumber = "" } = useParams();
  const [order, setOrder] = useState<OrderConfirmation | null>(null);

  useEffect(() => {
    setOrder(readLastOrder(orderNumber));
  }, [orderNumber]);

  const storeName = dictionary.siteFullName;
  const whatsappNumber = dictionary.whatsappNumber ?? "Please configure a WhatsApp number";

  const whatsappHref = order
    ? buildWhatsAppUrl({
        storeName,
        whatsappNumber,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        items: order.items,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        addressLine: order.addressLine,
        note: order.note,
      })
    : `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hello ${storeName}, I would like to confirm my order ${orderNumber}.`,
      )}`;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-10 text-gold" aria-hidden />
          <p className="eyebrow mt-6">Order recorded</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Thank you</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your request is saved in our studio records. Please continue on WhatsApp so we can
            confirm sizing, availability and payment.
          </p>
          <p className="mt-8 text-xs uppercase tracking-[0.18em] text-muted-foreground">Order ID</p>
          <p className="mt-1 font-display text-3xl text-gold">{orderNumber}</p>
        </div>

        {order && (
          <div className="surface-panel mt-12 rounded-sm p-8">
            <h2 className="font-display text-2xl">Summary</h2>
            <Separator className="my-6" />
            <ul className="space-y-4 text-sm">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-4">
                  <span>
                    {item.name}
                    {item.variantLabel && (
                      <span className="block text-xs text-muted-foreground">{item.variantLabel}</span>
                    )}
                    <span className="block text-xs text-muted-foreground">Qty {item.quantity}</span>
                  </span>
                  <span className="whitespace-nowrap">{formatCurrency(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <Separator className="my-6" />
            <div className="flex justify-between text-base">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
            <Separator className="my-6" />
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Deliver to</p>
            <p className="mt-2 text-sm leading-relaxed">
              {order.customerName}
              <br />
              {order.addressLine}
              <br />
              {order.city}, {order.state} — {order.pincode}
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="rounded-sm px-8 text-xs uppercase tracking-[0.2em]">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 size-4" />
              Confirm on WhatsApp
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-sm px-8 text-xs uppercase tracking-[0.2em]"
          >
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Keep your order ID safe — quote it in any conversation with our studio.
        </p>
      </div>
    </SiteLayout>
  );
}
