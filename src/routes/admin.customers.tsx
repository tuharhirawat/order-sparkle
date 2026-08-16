import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { adminCustomersQuery, adminOrdersQuery } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const { data: customers, isPending } = useQuery(adminCustomersQuery());
  const { data: orders } = useQuery(adminOrdersQuery());
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const rows = (customers ?? []).filter(
    (c) =>
      !term ||
      c.full_name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.email ?? "").toLowerCase().includes(term),
  );

  return (
    <div>
      <p className="eyebrow">Relationships</p>
      <h1 className="mt-2 font-display text-4xl">Customers</h1>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, phone or email"
        className="mt-8 h-10 max-w-xs rounded-sm"
      />

      <div className="mt-8 overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">First seen</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending && (
              <tr>
                <td colSpan={6} className="p-4">
                  <Skeleton className="h-6 w-full" />
                </td>
              </tr>
            )}
            {rows.map((customer) => {
              const theirs = (orders ?? []).filter((o) => o.customer_id === customer.id);
              const value = theirs
                .filter((o) => o.status !== "Cancelled")
                .reduce((sum, o) => sum + Number(o.total), 0);
              return (
                <tr key={customer.id}>
                  <td className="px-4 py-3">{customer.full_name}</td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(customer.created_at)}</td>
                  <td className="px-4 py-3 text-right">{theirs.length}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(value)}</td>
                </tr>
              );
            })}
            {!isPending && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
