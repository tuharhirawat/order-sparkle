import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
import { formatCurrency } from "@/lib/format";
import { adminCategoryNamesQuery, adminProductsQuery } from "@/lib/admin-data";
import api from "@/Services/api";
import { PRODUCT_IMAGE_LIMITS } from "@/Constants/productConstants";
import type { AdminProduct } from "@/DBTypes/types";

interface Draft {
  name: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  categoryId: string;
  material: string;
  details: string;
  isFeatured: boolean;
  images: File[];
  existingImages: AdminProduct["productImages"];
}

const EMPTY: Draft = {
  name: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  categoryId: "",
  material: "",
  details: "",
  isFeatured: false,
  images: [],
  existingImages: [],
};

export default function AdminProducts() {
  const { data: products, isPending } = useQuery(adminProductsQuery());
  const { data: categories } = useQuery(adminCategoryNamesQuery());
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const handleImages = (files: FileList | null) => {
    if (!files) return;

    const selectedFiles = Array.from(files);

    if (selectedFiles.length + draft.existingImages.length > PRODUCT_IMAGE_LIMITS.maxCount) {
      toast.error("Maximum 5 images are allowed.");
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidFile) {
      toast.error(`${invalidFile.name} is not a valid image.`);
      return;
    }

    const totalSize = selectedFiles.reduce(
      (total, file) => total + file.size,
      0
    );

    const maxTotalSize = PRODUCT_IMAGE_LIMITS.maxTotalSizeBytes;

    if (totalSize > maxTotalSize) {
      toast.error("The total size of all images must not exceed 10 MB.");
      return;
    }

    setDraft((prev) => ({
      ...prev,
      images: selectedFiles,
    }));

    setImagePreviews(
      selectedFiles.map((file) => URL.createObjectURL(file))
    );
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  const set = (key: keyof Draft, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const create = useMutation({
    mutationFn: async () => {
      const price = Number(draft.price);

      if (draft.name.trim().length < 2) {
        throw new Error("Enter a product name.");
      }

      if (!draft.categoryId) {
        throw new Error("Select a collection.");
      }

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Enter a valid price.");
      }
      
      const formData = new FormData();

      formData.append("name", draft.name.trim());
      formData.append("price", price.toString());
      if (draft.compareAtPrice.trim()) {
        formData.append("compareAtPrice", draft.compareAtPrice.trim());
      }
      formData.append(
        "stock",
        (Number(draft.stock) || 0).toString()
      );
      formData.append("categoryId", draft.categoryId);
      formData.append("isFeatured", draft.isFeatured.toString());

      if (draft.material.trim()) formData.append("material", draft.material.trim());
      if (draft.details.trim()) formData.append("details", draft.details.trim());

      draft.images.forEach((image) => {
        formData.append("images", image);
      });

      await api.post("/Product", formData);
    },

    onSuccess: () => {
      setDraft(EMPTY);
      setImagePreviews([]);

      toast.success("Product added");

      void refresh();
    },

    onError: (e: any) => {
      toast.error("Could not add product", {
        description:
          e.response?.data?.message ??
          "Something went wrong.",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async (input: {
      id: string;
      price?: number;
      compareAtPrice?: number | null;
      stock?: number;
      isActive?: boolean;
      isFeatured?: boolean;
      details?: string | null;
      manageImages?: boolean;
      existingImageIds?: string[];
      images?: File[];
    }) => {
      const { id, images, existingImageIds, manageImages, ...data } = input;
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });

      if (manageImages) {
        formData.append("manageImages", "true");
        existingImageIds?.forEach((imageId) => formData.append("existingImageIds", imageId));
        images?.forEach((image) => formData.append("images", image));
      }

      await api.patch(`/Product/${id}`, formData);
    },

    onSuccess: () => {
      setDraft(EMPTY);
      setEditingProductId(null);
      setImagePreviews([]);
      toast.success("Product updated");
      void refresh();
    },

    onError: (e: any) => {
      toast.error("Update failed", {
        description:
          e.response?.data?.message ?? "Something went wrong.",
      });
    },
  });

  const editProduct = (product: NonNullable<typeof products>[number]) => {
    setEditingProductId(product.id);
    setDraft({
      name: product.name,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice == null ? "" : String(product.compareAtPrice),
      stock: String(product.stock),
      categoryId: product.category?.id ?? "",
      material: product.material ?? "",
      details: product.details ?? "",
      isFeatured: product.isFeatured,
      images: [],
      existingImages: product.productImages ?? [],
    });
    setImagePreviews([]);
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setDraft(EMPTY);
    setImagePreviews([]);
  };

  const saveProduct = () => {
    if (!editingProductId) {
      create.mutate();
      return;
    }

    const price = Number(draft.price);
    const compareAtPrice = draft.compareAtPrice.trim()
      ? Number(draft.compareAtPrice)
      : null;

    if (draft.name.trim().length < 2) {
      toast.error("Enter a product name.");
      return;
    }
    if (!draft.categoryId) {
      toast.error("Select a collection.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid price.");
      return;
    }
    if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice <= price)) {
      toast.error("Compare price must be greater than the product price.");
      return;
    }

    updateProduct.mutate({
      id: editingProductId,
      price,
      compareAtPrice,
      stock: Number(draft.stock) || 0,
      details: draft.details.trim() || null,
      isFeatured: draft.isFeatured,
      manageImages: true,
      existingImageIds: draft.existingImages.map((image) => image.id),
      images: draft.images,
    });
  };

  const removeNewImage = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
    setImagePreviews((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const removeExistingImage = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((image) => image.id !== id),
    }));
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/Product/${id}`);
    },

    onSuccess: () => {
      toast.success("Product removed");
      void refresh();
    },

    onError: (e: any) => {
      toast.error("Could not remove", {
        description:
          e.response?.data?.message ?? "Something went wrong.",
      });
    },
  });

  return (
    <div>
      <p className="eyebrow">Catalogue</p>
      <h1 className="mt-2 font-display text-4xl">Products</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[15%]" />
              <col className="w-[20%]" />
              <col className="w-[22%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-secondary/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Collection</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Live</th>
                <th className="px-4 py-3 text-center">Featured</th>
                <th className="px-4 py-3 text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(products ?? []).map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {product.productImages?.[0]?.url ? (
                        <img
                          src={product.productImages[0].url}
                          alt={product.name}
                          className="h-12 w-12 shrink-0 rounded-sm border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-border text-xs text-muted-foreground">
                          —
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="truncate">{product.name}</div>

                        <span className="block text-xs text-muted-foreground">
                          {product.productCode}
                        </span>

                        {product.productImages?.length > 0 && (
                          <span className="block text-[10px] text-muted-foreground">
                            {product.productImages.length}{" "}
                            {product.productImages.length === 1 ? "photo" : "photos"}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-left text-muted-foreground">
                    {product.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {formatCurrency(Number(product.price))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={product.stock}
                        className="h-8 w-20 rounded-sm text-right"
                        aria-label={`Stock for ${product.name}`}
                        onBlur={(e) =>
                          updateProduct.mutate({
                            id: product.id,
                            stock: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Switch
                        checked={product.isActive}
                        aria-label={`Toggle ${product.name}`}
                        onCheckedChange={(checked) =>
                          updateProduct.mutate({
                            id: product.id,
                            isActive: checked,
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Switch
                        checked={product.isFeatured}
                        aria-label={`Toggle featured status for ${product.name}`}
                        onCheckedChange={(checked) =>
                          updateProduct.mutate({
                            id: product.id,
                            isFeatured: checked,
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${product.name}`}
                      onClick={() => editProduct(product)}
                    >
                      <Pencil className="size-4" />
                    </Button>
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
          <h2 className="font-display text-2xl">{editingProductId ? "Edit product" : "Add product"}</h2>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="p-name" className="text-xs uppercase tracking-[0.16em]">Name</Label>
              <Input id="p-name" value={draft.name} onChange={(e) => set("name", e.target.value)} disabled={Boolean(editingProductId)} className="mt-2 h-10 rounded-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-price" className="text-xs uppercase tracking-[0.16em]">Price</Label>
                <Input id="p-price" type="number" min={0} value={draft.price} onChange={(e) => set("price", e.target.value)} className="mt-2 h-10 rounded-sm" />
              </div>
              <div>
                <Label htmlFor="p-compare-price" className="text-xs uppercase tracking-[0.16em]">Compare price</Label>
                <Input id="p-compare-price" type="number" min={0} value={draft.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} className="mt-2 h-10 rounded-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-stock" className="text-xs uppercase tracking-[0.16em]">Stock</Label>
                <Input id="p-stock" type="number" min={0} value={draft.stock} onChange={(e) => set("stock", e.target.value)} className="mt-2 h-10 rounded-sm" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.16em]">Collection</Label>
                <Select
                  value={draft.categoryId}
                  onValueChange={(value) => set("categoryId", value)}
                  disabled={Boolean(editingProductId)}
                >
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
              <Label
                htmlFor="p-images"
                className="text-xs uppercase tracking-[0.16em]"
              >
                Product Photos
              </Label>

              <Input
                id="p-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImages(e.target.files)}
                className="mt-2 h-10 rounded-sm"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Maximum 5 images, 10 MB total.
              </p>
            </div>
            {(draft.existingImages.length > 0 || imagePreviews.length > 0) && (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {draft.existingImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative aspect-square overflow-hidden rounded-sm border border-border"
                  >
                    <img
                      src={image.url}
                      alt={`Product photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label={`Remove product photo ${index + 1}`}
                      className="absolute right-1 top-1 size-6"
                      onClick={() => removeExistingImage(image.id)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
                {imagePreviews.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-sm border border-border"
                  >
                    <img
                      src={src}
                      alt={`New product photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label={`Remove new product photo ${index + 1}`}
                      className="absolute right-1 top-1 size-6"
                      onClick={() => removeNewImage(index)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label htmlFor="p-material" className="text-xs uppercase tracking-[0.16em]">Material</Label>
              <Textarea id="p-material" rows={3} value={draft.material} onChange={(e) => set("material", e.target.value)} disabled={Boolean(editingProductId)} className="mt-2 rounded-sm" />
            </div>
            <div>
              <Label htmlFor="p-details" className="text-xs uppercase tracking-[0.16em]">Details</Label>
              <Textarea id="p-details" rows={3} value={draft.details} onChange={(e) => set("details", e.target.value)} className="mt-2 rounded-sm" />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Label htmlFor="p-featured" className="text-xs uppercase tracking-[0.16em]">Featured product</Label>
              <Switch id="p-featured" checked={draft.isFeatured} onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, isFeatured: checked }))} />
            </div>
            <div className="flex gap-3">
              {editingProductId && (
                <Button variant="outline" className="flex-1 rounded-sm text-xs uppercase tracking-[0.2em]" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
              <Button
                className="flex-1 rounded-sm text-xs uppercase tracking-[0.2em]"
                disabled={create.isPending || updateProduct.isPending}
                onClick={saveProduct}
              >
                {editingProductId ? "Update product" : "Add product"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

