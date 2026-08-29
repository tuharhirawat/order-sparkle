import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { adminCustomersQuery } from "@/lib/admin-data";

export default function AdminCustomers() {
  const { data: customers, isPending } = useQuery(adminCustomersQuery());
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const rows = (customers ?? []).filter(
    (c) =>
      !term ||
      c.fullName.toLowerCase().includes(term) ||
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
            {rows.map((customer) => (
              <tr key={customer.profileId}>
                <td className="px-4 py-3">{customer.fullName}</td>
                <td className="px-4 py-3">{customer.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{customer.email ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(customer.firstSeen)}</td>
                <td className="px-4 py-3 text-right">{customer.ordersCount}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(customer.totalValue)}</td>
              </tr>
            ))}
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
