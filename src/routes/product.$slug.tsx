import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/layout";
import { ProductCard } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/lib/cart";
import {
  availableStock,
  productQuery,
  productsQuery,
  variantPrice,
} from "@/lib/catalog";
import { ProductVariant } from "@/DBTypes/types";

export default function ProductPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { data: product } = useQuery(productQuery(slug));
  const { data: related } = useQuery({
    ...productsQuery({ categorySlug: product?.category?.urlName, limit: 8 }),
    enabled: Boolean(product?.category?.urlName),
  });

  const images = useMemo(
    () => [...(product?.productImages ?? [])].sort((a, b) => a.position - b.position),
    [product],
  );
  const variants = useMemo(
    () => [...(product?.productVariants ?? [])].sort((a, b) => a.position - b.position),
    [product],
  );

  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const selectedVariant: ProductVariant | null =
    variants.find((v) => v.id === variantId) ?? (variants.length > 0 ? variants[0]! : null);
  const price = variantPrice(product, selectedVariant);
  const stock = availableStock(product, selectedVariant);
  const soldOut = stock <= 0;
  const image = images[activeImage] ?? images[0];
  const displayImageUrl = image?.url ?? product.category?.imageUrl;

  const handleAdd = (goToCart: boolean) => {
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        slug: product.urlName,
        name: product.name,
        sku: `${product.productCode}${selectedVariant?.variantCode ?? ""}`,
        variantLabel: selectedVariant?.label ?? null,
        price,
        imageUrl: displayImageUrl ?? null,
        maxQuantity: stock,
      },
      quantity,
    );
    if (goToCart) void navigate("/cart");
    else toast.success("Added to your bag", { description: product.name });
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
        >
          <Link to="/shop" className="transition-colors hover:text-foreground">
            Shop
          </Link>
          {product.category && (
            <>
              <span className="px-2">/</span>
              <Link
                to={`/shop?category=${encodeURIComponent(product.category.urlName)}`}
                className="transition-colors hover:text-foreground"
              >
                {product.category.name}
              </Link>
            </>
          )}
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-sm bg-surface">
              {displayImageUrl ? (
                <img
                  src={displayImageUrl}
                  alt={(product.category?.name ?? product.name).toLocaleLowerCase()}
                  width={1024}
                  height={1024}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
                  Image coming soon
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`size-20 overflow-hidden rounded-sm border transition-colors 
                      ${i === activeImage ? "border-gold" : "border-border hover:border-foreground/30"}
                    `}
                  >
                    <img src={img.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.category && <p className="eyebrow">{product.category.name}</p>}
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <p className="text-2xl text-foreground">{formatCurrency(price)}</p>
              {product.compareAtPrice && Number(product.compareAtPrice) > price && (
                <p className="text-sm text-muted-foreground line-through">
                  {formatCurrency(Number(product.compareAtPrice))}
                </p>
              )}
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Inclusive of all taxes · {product.productCode}{selectedVariant?.variantCode ?? ""}
            </p>

            {variants.length > 0 && (
              <div className="mt-8">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Options</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const active = selectedVariant?.id === variant.id;
                    const out = product.trackStock && variant.stock <= 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={out}
                        onClick={() => {
                          setVariantId(variant.id);
                          setQuantity(1);
                        }}
                        className={`min-w-16 rounded-sm border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          active
                            ? "border-gold bg-gold/10 text-foreground"
                            : "border-border hover:border-foreground/40"
                        }`}
                      >
                        {variant.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-sm border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-sm"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-10 text-center text-sm" aria-live="polite">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-sm"
                  aria-label="Increase quantity"
                  disabled={quantity >= stock}
                  onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
              {product.trackStock && stock > 0 && stock <= 3 && (
                <p className="text-xs uppercase tracking-[0.16em] text-gold">Only {stock} left</p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 rounded-sm text-xs uppercase tracking-[0.2em]"
                disabled={soldOut}
                onClick={() => handleAdd(false)}
              >
                {soldOut ? "Sold out" : "Add to bag"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 rounded-sm text-xs uppercase tracking-[0.2em]"
                disabled={soldOut}
                onClick={() => handleAdd(true)}
              >
                Request this piece
              </Button>
            </div>

            <Separator className="my-8" />

            <dl className="space-y-3 text-sm">
              {product.material && (
                <div className="flex justify-between gap-6">
                  <dt className="text-muted-foreground">Material</dt>
                  <dd className="text-right">{product.material}</dd>
                </div>
              )}
              {product.details && (
                <div className="flex justify-between gap-6">
                  <dt className="text-muted-foreground">Details</dt>
                  <dd className="max-w-[60%] text-right">{product.details}</dd>
                </div>
              )}
            </dl>

            <div className="mt-8 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Check className="size-4 text-gold" /> BIS hallmarked and certified
              </p>
              <p className="flex items-center gap-2">
                <Truck className="size-4 text-gold" /> Insured delivery across India
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-gold" /> Confirmed personally before payment
              </p>
            </div>
          </div>
        </div>

        {related && related.filter((p) => p.id !== product.id).length > 0 && (
          <section className="mt-24">
            <p className="eyebrow">You may also like</p>
            <h2 className="mt-2 font-display text-3xl">More from this collection</h2>
            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
              {related
                .filter((p) => p.id !== product.id)
                .slice(0, 4)
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
