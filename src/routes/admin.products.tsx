import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { AdminProduct } from "@/Types/productTypes";
import { ConfirmActionDialog } from "@/components/site/ConfirmActionDialog";
import { ImagePreviewModal } from "@/components/site/ImagePreviewModal";

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

type PendingProductToggle =
  | { kind: "confirm"; id: string; name: string; nextActive: boolean }
  | { kind: "blocked"; productName: string; message: string };
type PendingStockChange = { id: string; name: string; oldStock: number; newStock: number };
type PendingFeaturedToggle = { id: string; name: string; nextFeatured: boolean };

export default function AdminProducts() {
  const { data: products, isPending } = useQuery(adminProductsQuery());
  const { data: categories } = useQuery(adminCategoryNamesQuery());
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingStockChange, setPendingStockChange] = useState<PendingStockChange | null>(null);
  const [pendingFeaturedToggle, setPendingFeaturedToggle] = useState<PendingFeaturedToggle | null>(null);
  const [pendingProductToggleDialog, setPendingProductToggleDialog] = useState<PendingProductToggle | null>(null);
  const [stockResetTick, setStockResetTick] = useState(0);

  const toggleCategoryFilter = (id: string) => {
    setCategoryFilter((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const filteredProducts = useMemo(() => {
    if (categoryFilter.length === 0) return products ?? [];
    return (products ?? []).filter(
      (product) => product.category?.id && categoryFilter.includes(product.category.id)
    );
  }, [products, categoryFilter]);

  const handleImages = (files: FileList | null) => {
    if (!files) return;

    const selectedFiles = Array.from(files);

    if (selectedFiles.length + draft.existingImages.length > PRODUCT_IMAGE_LIMITS.maxCount) {
      toast.error(`Maximum ${PRODUCT_IMAGE_LIMITS.maxCount} images are allowed.`);
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

    onSuccess: (_data, variables) => {
      if (variables.id === editingProductId && variables.manageImages) {
        setDraft(EMPTY);
        setEditingProductId(null);
        setImagePreviews([]);
        toast.success("Product updated");
      } else if (variables.isActive !== undefined) {
        toast.success(variables.isActive ? "Product enabled" : "Product disabled");
      } else if (variables.stock !== undefined) {
        toast.success("Stock updated");
      } else if (variables.isFeatured !== undefined) {
        toast.success(variables.isFeatured ? "Marked as featured" : "Removed from featured");
      }
      else {
        toast.success("Product updated");
      }
      void refresh();
    },

    onError: (e: any, variables) => {
      const message = e.response?.data?.message ?? "Something went wrong.";

      if (variables.isActive === true && message.toLowerCase().includes("category")) {
        const product = products?.find((p) => p.id === variables.id);
        setPendingProductToggleDialog({ kind: "blocked", productName: product?.name ?? "This product", message });
        return;
      }

      toast.error("Update failed", { description: message });
      setStockResetTick((t) => t + 1);
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

  // Remove product functionality not in use
  {/* const remove = useMutation({
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
  }); */}

  return (
    <div>
      <p className="eyebrow">Catalogue</p>
      <h1 className="mt-2 font-display text-4xl">Products</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          {(categories ?? []).length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {categories!.map((c) => {
                const active = categoryFilter.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategoryFilter(c.id)}
                    className={`rounded-sm border px-3 py-1 text-xs uppercase tracking-[0.12em] transition-colors ${active
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {c.name}
                  </button>
                );
              })}

              {categoryFilter.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter([])}
                  className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          )}

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
                {filteredProducts.map((product) => {
                  const thumbnailSrc = product.productImages?.[0]?.url || product.category?.imageUrl || "";

                  return (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {thumbnailSrc ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(thumbnailSrc)}
                              className="shrink-0 overflow-hidden rounded-sm border border-border transition-opacity hover:opacity-80"
                              aria-label={`Enlarge ${product.name} image`}
                            >
                              <img
                                src={thumbnailSrc}
                                alt={product.name}
                                className="h-12 w-12 object-cover"
                              />
                            </button>
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-border text-xs text-muted-foreground">
                              No image
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
                            key={`stock-${product.id}-${product.stock}-${stockResetTick}`}
                            type="number"
                            min={0}
                            defaultValue={product.stock}
                            className="h-8 w-20 rounded-sm text-right"
                            aria-label={`Stock for ${product.name}`}
                            onBlur={(e) => {
                              const newStock = Number(e.target.value) || 0;
                              if (newStock !== product.stock) {
                                setPendingStockChange({
                                  id: product.id,
                                  name: product.name,
                                  oldStock: product.stock,
                                  newStock,
                                });
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Switch
                            checked={product.isActive}
                            aria-label={`Toggle ${product.name}`}
                            onCheckedChange={(checked) =>
                              setPendingProductToggleDialog({
                                kind: "confirm",
                                id: product.id,
                                name: product.name,
                                nextActive: checked
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
                              setPendingFeaturedToggle({
                                id: product.id,
                                name: product.name,
                                nextFeatured: checked
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

                        {/* Remove product button not under use */}
                        {/* <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => remove.mutate(product.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button> */}
                      </td>
                    </tr>
                  );
                })}
                {!isPending && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {categoryFilter.length > 0
                        ? "No products match the selected collections."
                        : "No products yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                Maximum {PRODUCT_IMAGE_LIMITS.maxCount} images, 10 MB total.
              </p>
            </div>
            {(draft.existingImages.length > 0 || imagePreviews.length > 0) && (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {draft.existingImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative aspect-square overflow-hidden rounded-sm border border-border"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewImage(image.url)}
                      className="block h-full w-full"
                      aria-label={`Enlarge product photo ${index + 1}`}
                    >
                      <img
                        src={image.url}
                        alt={`Product photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
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
                    <button
                      type="button"
                      onClick={() => setPreviewImage(src)}
                      className="block h-full w-full"
                      aria-label={`Enlarge new product photo ${index + 1}`}
                    >
                      <img
                        src={src}
                        alt={`New product photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
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

      {previewImage && (
        <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}

      <ConfirmActionDialog
        open={!!pendingStockChange}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStockChange(null);
            setStockResetTick((t) => t + 1);
          }
        }}
        title={`Update stock for "${pendingStockChange?.name}"?`}
        description={`Change stock from ${pendingStockChange?.oldStock} to ${pendingStockChange?.newStock}?`}
        confirmLabel="Yes, update stock"
        onConfirm={() => {
          if (pendingStockChange) {
            updateProduct.mutate({ id: pendingStockChange.id, stock: pendingStockChange.newStock });
          }
          setPendingStockChange(null);
        }}
      />

      <ConfirmActionDialog
        open={!!pendingFeaturedToggle}
        onOpenChange={(open) => !open && setPendingFeaturedToggle(null)}
        title={`${pendingFeaturedToggle?.nextFeatured ? "Feature" : "Unfeature"} "${pendingFeaturedToggle?.name}"?`}
        description={
          pendingFeaturedToggle?.nextFeatured
            ? `"${pendingFeaturedToggle?.name}" will be shown as a featured product.`
            : `"${pendingFeaturedToggle?.name}" will no longer be shown as a featured product.`
        }
        confirmLabel={`Yes, ${pendingFeaturedToggle?.nextFeatured ? "feature" : "unfeature"}`}
        onConfirm={() => {
          if (pendingFeaturedToggle) {
            updateProduct.mutate({ id: pendingFeaturedToggle.id, isFeatured: pendingFeaturedToggle.nextFeatured });
          }
          setPendingFeaturedToggle(null);
        }}
      />

      <ConfirmActionDialog
        open={!!pendingProductToggleDialog}
        onOpenChange={(open) => !open && setPendingProductToggleDialog(null)}
        title={
          pendingProductToggleDialog?.kind === "blocked"
            ? "Can't enable this product"
            : `${pendingProductToggleDialog?.nextActive ? "Enable" : "Disable"} "${pendingProductToggleDialog?.name}"?`
        }
        description={
          pendingProductToggleDialog?.kind === "blocked"
            ? pendingProductToggleDialog.message
            : pendingProductToggleDialog?.nextActive
              ? `This will make "${pendingProductToggleDialog?.name}" visible to customers again.`
              : `This will hide "${pendingProductToggleDialog?.name}" from customers.`
        }
        confirmLabel={
          pendingProductToggleDialog?.kind === "blocked"
            ? "OK"
            : `Yes, ${pendingProductToggleDialog?.nextActive ? "enable" : "disable"}`
        }
        hideCancel={pendingProductToggleDialog?.kind === "blocked"}
        onConfirm={() => {
          if (pendingProductToggleDialog?.kind === "confirm") {
            updateProduct.mutate({ id: pendingProductToggleDialog.id, isActive: pendingProductToggleDialog.nextActive });
          }
          setPendingProductToggleDialog(null);
        }}
      />
    </div>
  );
}
