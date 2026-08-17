import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, slugify } from "@/lib/format";
import { adminCategoriesQuery, adminProductsQuery } from "@/lib/admin-data";
import { deleteProductImage, uploadProductImages } from "@/lib/product-images";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

interface Draft {
  name: string;
  sku: string;
  price: string;
  stock: string;
  categoryId: string;
  description: string;
  imageUrl: string;
}

const EMPTY: Draft = {
  name: "",
  sku: "",
  price: "",
  stock: "0",
  categoryId: "",
  description: "",
  imageUrl: "",
};

function AdminProducts() {
  const { data: products, isPending } = useQuery(adminProductsQuery());
  const { data: categories } = useQuery(adminCategoriesQuery());
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  const set = (key: keyof Draft, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const create = useMutation({
    mutationFn: async () => {
      const price = Number(draft.price);
      if (draft.name.trim().length < 2) throw new Error("Enter a product name.");
      if (!draft.sku.trim()) throw new Error("Enter a SKU.");
      if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a valid price.");
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: draft.name.trim(),
          slug: slugify(draft.name),
          sku: draft.sku.trim().toUpperCase(),
          price,
          stock: Number(draft.stock) || 0,
          description: draft.description.trim() || null,
          category_id: draft.categoryId || null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (draft.imageUrl.trim() && data) {
        await supabase.from("product_images").insert({
          product_id: data.id,
          url: draft.imageUrl.trim(),
          alt: draft.name.trim(),
          position: 0,
        });
      }
      if (files.length && data) {
        await uploadProductImages(
          data.id,
          files,
          draft.name.trim(),
          draft.imageUrl.trim() ? 1 : 0,
        );
      }
    },
    onSuccess: () => {
      setDraft(EMPTY);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Product added");
      void refresh();
    },
    onError: (e: Error) => toast.error("Could not add product", { description: e.message }),
  });

  const patch = useMutation({
    mutationFn: async (input: { id: string; is_active?: boolean; stock?: number; price?: number }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("products").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Product removed");
      void refresh();
    },
    onError: (e: Error) => toast.error("Could not remove", { description: e.message }),
  });

  return (
    <div>
      <p className="eyebrow">Catalogue</p>
      <h1 className="mt-2 font-display text-4xl">Products</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Photos</th>
                <th className="px-4 py-3 text-left">Collection</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-left">Live</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(products ?? []).map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    {product.name}
                    <span className="block text-xs text-muted-foreground">{product.sku}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ProductPhotos
                      productId={product.id}
                      productName={product.name}
                      images={product.product_images ?? []}
                      onChanged={refresh}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.categories?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(product.price))}</td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      min={0}
                      defaultValue={product.stock}
                      className="h-8 w-20 rounded-sm text-right"
                      aria-label={`Stock for ${product.name}`}
                      onBlur={(e) =>
                        patch.mutate({ id: product.id, stock: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={product.is_active}
                      aria-label={`Toggle ${product.name}`}
                      onCheckedChange={(checked) =>
                        patch.mutate({ id: product.id, is_active: checked })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${product.name}`}
                      onClick={() => remove.mutate(product.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!isPending && (products ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="surface-panel h-fit rounded-sm p-6">
          <h2 className="font-display text-2xl">Add product</h2>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="p-name" className="text-xs uppercase tracking-[0.16em]">Name</Label>
              <Input id="p-name" value={draft.name} onChange={(e) => set("name", e.target.value)} className="mt-2 h-10 rounded-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-sku" className="text-xs uppercase tracking-[0.16em]">SKU</Label>
                <Input id="p-sku" value={draft.sku} onChange={(e) => set("sku", e.target.value)} className="mt-2 h-10 rounded-sm" />
              </div>
              <div>
                <Label htmlFor="p-price" className="text-xs uppercase tracking-[0.16em]">Price</Label>
                <Input id="p-price" type="number" min={0} value={draft.price} onChange={(e) => set("price", e.target.value)} className="mt-2 h-10 rounded-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-stock" className="text-xs uppercase tracking-[0.16em]">Stock</Label>
                <Input id="p-stock" type="number" min={0} value={draft.stock} onChange={(e) => set("stock", e.target.value)} className="mt-2 h-10 rounded-sm" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.16em]">Collection</Label>
                <Select value={draft.categoryId} onValueChange={(value) => set("categoryId", value)}>
                  <SelectTrigger className="mt-2 h-10 rounded-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="p-image" className="text-xs uppercase tracking-[0.16em]">Image URL</Label>
              <Input id="p-image" value={draft.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="/images/piece.jpg" className="mt-2 h-10 rounded-sm" />
            </div>
            <div>
              <Label htmlFor="p-files" className="text-xs uppercase tracking-[0.16em]">
                Upload photos
              </Label>
              <Input
                id="p-files"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="mt-2 h-10 rounded-sm"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {files.length} photo{files.length > 1 ? "s" : ""} ready to upload
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="p-desc" className="text-xs uppercase tracking-[0.16em]">Description</Label>
              <Textarea id="p-desc" rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} className="mt-2 rounded-sm" />
            </div>
            <Button
              className="w-full rounded-sm text-xs uppercase tracking-[0.2em]"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              Add product
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

function ProductPhotos({
  productId,
  productName,
  images,
  onChanged,
}: {
  productId: string;
  productName: string;
  images: ProductImage[];
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sorted = [...images].sort((a, b) => a.position - b.position);

  const upload = useMutation({
    mutationFn: async (selected: File[]) =>
      uploadProductImages(productId, selected, productName, sorted.length),
    onSuccess: () => {
      toast.success("Photos uploaded");
      if (inputRef.current) inputRef.current.value = "";
      onChanged();
    },
    onError: (e: Error) => toast.error("Upload failed", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: deleteProductImage,
    onSuccess: () => {
      toast.success("Photo removed");
      onChanged();
    },
    onError: (e: Error) => toast.error("Could not remove photo", { description: e.message }),
  });

  return (
    <div className="flex items-center gap-2">
      {sorted.map((image) => (
        <div key={image.id} className="group relative">
          <img
            src={image.url}
            alt={image.alt ?? productName}
            loading="lazy"
            className="size-10 rounded-sm object-cover"
          />
          <button
            type="button"
            aria-label={`Remove photo from ${productName}`}
            onClick={() => remove.mutate(image.id)}
            className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
          >
            <X className="size-2.5" />
          </button>
        </div>
      ))}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label={`Upload photos for ${productName}`}
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          if (selected.length) upload.mutate(selected);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-10 rounded-sm"
        disabled={upload.isPending}
        aria-label={`Add photos to ${productName}`}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
      </Button>
    </div>
  );
}
