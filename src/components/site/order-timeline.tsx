import { Check, Circle, X } from "lucide-react";
import { formatDate, titleCase } from "@/lib/format";

export interface TimelineEvent {
  status: string;
  paymentStatus: string | null;
  note: string | null;
  createdAt: string;
}

const STEPS: { key: string; label: string; matches: string[] }[] = [
  { key: "requested", label: "Requested", matches: ["PendingConfirmation"] },
  { key: "confirmed", label: "Confirmed", matches: ["Confirmed", "PaymentPending", "PaymentReceived"] },
  { key: "processing", label: "Processing", matches: ["Processing"] },
  { key: "shipped", label: "Shipped", matches: ["Shipped"] },
  { key: "completed", label: "Completed", matches: ["Delivered"] },
];

const ORDER_SEQUENCE = [
  "PendingConfirmation",
  "Confirmed",
  "PaymentPending",
  "PaymentReceived",
  "Processing",
  "Shipped",
  "Delivered",
];

function stepIndexFor(status: string): number {
  return STEPS.findIndex((step) => step.matches.includes(status));
}

export function OrderTimeline({
  status,
  events,
  createdAt,
}: {
  status: string;
  events: TimelineEvent[];
  createdAt: string;
}) {
  const cancelled = status === "Cancelled";
  const history = events.length
    ? events
    : [{ status, paymentStatus: null, note: null, createdAt }];

  const reachedIndex = history.reduce((max, event) => {
    const index = stepIndexFor(event.status);
    return index > max ? index : max;
  }, stepIndexFor(status));

  const timestampFor = (step: (typeof STEPS)[number]) =>
    history.find((event) => step.matches.includes(event.status))?.createdAt ?? null;

  const cancelEvent = history.find((event) => event.status === "Cancelled");
  const paymentEvents = history.filter(
    (event, index) =>
      event.paymentStatus &&
      event.paymentStatus !== "Unpaid" &&
      history.findIndex((e) => e.paymentStatus === event.paymentStatus) === index,
  );

  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Progress</p>

      <ol className="mt-4 space-y-0">
        {STEPS.map((step, index) => {
          const time = timestampFor(step);
          const done = !cancelled && (Boolean(time) || index <= reachedIndex);
          const current =
            !cancelled && index === reachedIndex && ORDER_SEQUENCE.includes(status);
          const last = index === STEPS.length - 1;

          return (
            <li key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                    done
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-3" /> : <Circle className="size-2" />}
                </span>
                {!last && (
                  <span
                    className={`w-px flex-1 ${
                      index < reachedIndex && !cancelled ? "bg-gold/50" : "bg-border"
                    }`}
                  />
                )}
              </div>
              <div className={`pb-6 ${last ? "pb-0" : ""}`}>
                <p
                  className={`text-sm ${
                    done ? "text-foreground" : "text-muted-foreground"
                  } ${current ? "font-medium" : ""}`}
                >
                  {step.label}
                  {current && (
                    <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-gold">
                      Current
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {time ? formatDate(time) : "Pending"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {cancelled && (
        <div className="mt-2 flex items-center gap-3 rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3">
          <X className="size-4 text-destructive" />
          <div>
            <p className="text-sm text-destructive">Cancelled</p>
            <p className="text-xs text-muted-foreground">
              {cancelEvent ? formatDate(cancelEvent.createdAt) : ""}
            </p>
          </div>
        </div>
      )}

      {paymentEvents.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border pt-4">
          {paymentEvents.map((event) => (
            <li key={`${event.paymentStatus}-${event.createdAt}`} className="text-xs text-muted-foreground">
              Payment {titleCase(event.paymentStatus ?? "").toLowerCase()} · {formatDate(event.createdAt)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
