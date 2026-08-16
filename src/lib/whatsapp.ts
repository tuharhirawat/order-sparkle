/**
 * WhatsApp handoff, kept deliberately isolated behind one builder + one opener
 * so a WhatsApp Business API can replace the transport later without touching
 * the order pipeline.
 */
import { formatCurrency } from "./format";

export interface WhatsAppOrderPayload {
  storeName: string;
  whatsappNumber: string;
  orderNumber: string;
  customerName: string;
  items: { name: string; variantLabel?: string | null; quantity: number; unitPrice: number; lineTotal: number }[];
  total: number;
  city: string;
  state: string;
  pincode: string;
  addressLine: string;
  note?: string | null;
}

export function buildWhatsAppMessage(payload: WhatsAppOrderPayload): string {
  const lines: string[] = [];
  lines.push(`*${payload.storeName}* — New Order Request`);
  lines.push(`Order ID: *${payload.orderNumber}*`);
  lines.push(`Name: ${payload.customerName}`);
  lines.push("");
  lines.push("*Items*");
  payload.items.forEach((item, index) => {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : "";
    lines.push(
      `${index + 1}. ${item.name}${variant} × ${item.quantity} — ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.lineTotal)}`,
    );
  });
  lines.push("");
  lines.push(`*Total: ${formatCurrency(payload.total)}*`);
  lines.push("");
  lines.push("*Deliver to*");
  lines.push(payload.addressLine);
  lines.push(`${payload.city}, ${payload.state} — ${payload.pincode}`);
  if (payload.note) {
    lines.push("");
    lines.push(`*Note:* ${payload.note}`);
  }
  return lines.join("\n");
}

export function buildWhatsAppUrl(payload: WhatsAppOrderPayload): string {
  const number = payload.whatsappNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(payload))}`;
}

/** Returns false when the browser blocked the handoff; the order still exists. */
export function openWhatsApp(payload: WhatsAppOrderPayload): boolean {
  const url = buildWhatsAppUrl(payload);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(win);
}
