import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { useCart } from "@/lib/cart";
import { categoriesQuery, storeSettingsQuery } from "@/lib/catalog";

const navLinks = [
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Collections" },
  { to: "/about", label: "Our Story" },
];

export function SiteHeader() {
  const { count, hydrated } = useCart();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: settings } = useQuery(storeSettingsQuery());
  const { data: categories } = useQuery(categoriesQuery());

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    setMenuOpen(false);
    navigate({ to: "/shop", search: q ? { q } : {} });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl font-normal">
                {settings?.store_name ?? "Aurelia"}
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-2 flex flex-col gap-1 px-4 pb-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-sm px-2 py-3 text-sm uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 gold-rule" />
              <p className="eyebrow mt-4 px-2">Collections</p>
              {(categories ?? []).map((c) => (
                <Link
                  key={c.id}
                  to="/shop"
                  search={{ category: c.slug }}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-sm px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.name}
                </Link>
              ))}
              <form onSubmit={submitSearch} className="mt-6 flex gap-2 px-2">
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search jewellery"
                  aria-label="Search jewellery"
                />
                <Button type="submit" size="icon" variant="secondary" aria-label="Search">
                  <Search className="size-4" />
                </Button>
              </form>
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex shrink-0 flex-col leading-none">
          <span className="font-display text-2xl tracking-[0.16em] text-foreground lg:text-[1.75rem]">
            {settings?.store_name?.split(" ")[0]?.toUpperCase() ?? "AURELIA"}
          </span>
          <span className="hidden text-[0.6rem] uppercase tracking-[0.34em] text-muted-foreground sm:block">
            Fine Jewellery
          </span>
        </Link>

        <nav className="ml-8 hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden items-center lg:flex">
          <label htmlFor="site-search" className="sr-only">
            Search jewellery
          </label>
          <Input
            id="site-search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search"
            className="h-9 w-44 rounded-sm border-0 border-b border-border bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
          />
          <Button type="submit" variant="ghost" size="icon" aria-label="Search">
            <Search className="size-4" />
          </Button>
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/cart" aria-label={`Shopping bag, ${hydrated ? count : 0} items`}>
              <ShoppingBag className="size-4" />
              {hydrated && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-gold text-[0.6rem] font-medium text-gold-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
