import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  adminOrderStatusCountsQuery,
  statusTone,
} from "@/lib/admin-data";

export default function AdminOrdersOverview() {
  const { data: counts, isPending } = useQuery(adminOrderStatusCountsQuery());

  return (
    <div>
      <h1 className="mt-2 font-display text-4xl">Orders</h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER_STATUSES.map((status) => (
          <Link
            key={status}
            to={`/admin/orders/${status}`}
            className="surface-panel rounded-sm p-6 transition-colors hover:border-gold/40"
          >
            <span
              className={`inline-block rounded-sm border px-2 py-1 text-xs ${statusTone(status)}`}
            >
              {STATUS_LABELS[status]}
            </span>

            {isPending ? (
              <Skeleton className="mt-4 h-8 w-16" />
            ) : (
              <p className="mt-4 font-display text-3xl">
                {counts?.[status] ?? 0}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}