import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, storeSettingsQuery } from "@/lib/catalog";

export function SiteFooter() {
  const { data: settings } = useQuery(storeSettingsQuery());
  const { data: categories } = useQuery(categoriesQuery());

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <p className="font-display text-2xl tracking-[0.16em]">
            Mamta's Imitation Jewellery
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {settings?.tagline ?? "Handcrafted heirlooms in 22k gold and diamond."}
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Every order is confirmed personally on WhatsApp before payment.
          </p>
        </div>
        <div>
          <p className="eyebrow">Collections</p>
          <ul className="mt-4 space-y-2">
            {(categories ?? []).map((c) => (
              <li key={c.id}>
                <Link
                  to="/shop"
                  search={{ category: c.slug }}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Store</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shop" className="transition-colors hover:text-foreground">
                All jewellery
              </Link>
            </li>
            <li>
              <Link to="/about" className="transition-colors hover:text-foreground">
                Our story
              </Link>
            </li>
            <li>
              <Link to="/cart" className="transition-colors hover:text-foreground">
                Your bag
              </Link>
            </li>
            {settings?.support_email && (
              <li>
                <a
                  href={`mailto:${settings.support_email}`}
                  className="transition-colors hover:text-foreground"
                >
                  {settings.support_email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} Mamta's Imitation Jewellery. All rights reserved.
          </p>
          <Link to="/admin" className="transition-colors hover:text-foreground">
            Store admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
