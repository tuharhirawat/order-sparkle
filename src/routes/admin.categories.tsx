import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/Services/api";
import { adminCategoriesQuery } from "@/lib/admin-data";
import { ConfirmActionDialog } from "@/components/site/ConfirmActionDialog";
import { ImagePreviewModal } from "@/components/site/ImagePreviewModal";

interface Draft {
  name: string;
  description: string;
  image: File | null;
  imagePreview: string | null;
  existingImageUrl: string | null;
  removeImage: boolean;
}

const EMPTY: Draft = {
  name: "",
  description: "",
  image: null,
  imagePreview: null,
  existingImageUrl: null,
  removeImage: false,
};

type PendingToggle = {
  id: string;
  name: string;
  nextActive: boolean
};

export default function AdminCategories() {
  const { data: categories } = useQuery(adminCategoriesQuery());
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });

  const handleImageFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("The category image must not exceed 5 MB.");
      return;
    }
    setDraft((prev) => ({
      ...prev,
      image: file,
      imagePreview: URL.createObjectURL(file),
      existingImageUrl: null,
      removeImage: false,
    }));
  };

  const removeImage = () => {
    setDraft((prev) => ({
      ...prev,
      image: null,
      imagePreview: null,
      existingImageUrl: null,
      removeImage: true,
    }));
  };

  const editCategory = (category: NonNullable<typeof categories>[number]) => {
    setEditingCategoryId(category.id);
    setDraft({
      name: category.name,
      description: category.description ?? "",
      image: null,
      imagePreview: null,
      existingImageUrl: category.imageUrl ?? null,
      removeImage: false,
    });
  };

  const cancelEdit = () => {
    setEditingCategoryId(null);
    setDraft(EMPTY);
  };

  const create = useMutation({
    mutationFn: async () => {
      if (draft.name.trim().length < 2) {
        throw new Error("Enter a category name.");
      }

      const formData = new FormData();
      formData.append("name", draft.name.trim());
      if (draft.description.trim()) formData.append("description", draft.description.trim());
      if (draft.image) formData.append("image", draft.image);
      await api.post("/Product/Categories", formData);
    },

    onSuccess: () => {
      setDraft(EMPTY);
      toast.success("Category added");
      void refresh();
    },

    onError: (e: any) => {
      toast.error("Could not add category", {
        description: e.response?.data?.message ?? "Something went wrong.",
      });
    },
  });

  const update = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("description", draft.description.trim());

      if (draft.image) {
        formData.append("manageImage", "true");
        formData.append("image", draft.image);
      } else if (draft.removeImage) {
        formData.append("manageImage", "true");
        formData.append("removeImage", "true");
      }

      await api.patch(`/Product/Categories/${editingCategoryId}`, formData);
    },

    onSuccess: () => {
      setEditingCategoryId(null);
      setDraft(EMPTY);
      toast.success("Category updated");
      void refresh();
    },

    onError: (e: any) => {
      toast.error("Update failed", {
        description: e.response?.data?.message ?? "Something went wrong.",
      });
    },
  });

  const saveCategory = () => {
    if (editingCategoryId) {
      update.mutate();
    } else {
      create.mutate();
    }
  };

  const toggle = useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      await api.patch(
        `/Product/Categories/${input.id}/Status`,
        null,
        {
          params: {
            isActive: input.isActive,
          },
        }
      );
    },

    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? "Category enabled" : "Category disabled");
      void refresh();
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },

    onError: (e: any) => {
      toast.error("Update failed", {
        description: e.response?.data?.message ?? "Something went wrong.",
      });
    },
  });

  // Removing category not in use since it has data risks
  {/*  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/Product/Categories/${id}`);
    },

    onSuccess: () => {
      toast.success("Category removed");
      void refresh();
    },

    onError: (e: any) => {
      toast.error("Could not remove", {
        description: e.response?.data?.message ?? "Something went wrong.",
      });
    },
  });
*/}

  const previewSrc = draft.imagePreview ?? draft.existingImageUrl;

  return (
    <div>
      <p className="eyebrow">Catalogue</p>
      <h1 className="mt-2 font-display text-4xl">Categories</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Image</th>
                <th className="px-4 py-3 text-left">URL Name</th>
                <th className="px-4 py-3 text-left">Visible</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(categories ?? []).map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3">{category.name}</td>
                  <td className="px-4 py-3">
                    {category.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(category.imageUrl ?? null)}
                        className="rounded-full transition-opacity hover:opacity-80"
                        aria-label={`Enlarge ${category.name} image`}
                      >
                        <img src={category.imageUrl} alt="" className="size-10 rounded-full object-cover" />
                      </button>
                    ) : (
                      <span className="grid size-10 place-items-center rounded-full bg-secondary font-display text-gold">
                        {category.initials ?? category.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{category.urlName}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={category.isActive}
                      aria-label={`Toggle ${category.name}`}
                      onCheckedChange={(checked) =>
                        setPendingToggle({ id: category.id, name: category.name, nextActive: checked })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => editCategory(category)}
                    >
                      <Pencil className="size-4" />
                    </Button>

                    {/* Delet button should not be used for categories since a category has multiple products 
                    and removing a category would remove the product as well unnecessarily */}
                    {/* <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => remove.mutate(category.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="surface-panel h-fit rounded-sm p-6">
          <h2 className="font-display text-2xl">{editingCategoryId ? "Edit category" : "Add category"}</h2>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="cat-name" className="text-xs uppercase tracking-[0.16em]">
                Name
              </Label>
              <Input
                id="cat-name"
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                disabled={Boolean(editingCategoryId)}
                className="mt-2 h-10 rounded-sm"
              />
            </div>
            <div>
              <Label htmlFor="cat-image" className="text-xs uppercase tracking-[0.16em]">
                Image (optional)
              </Label>

              {previewSrc ? (
                <div className="relative mt-2 inline-block">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(previewSrc)}
                    className="block rounded-full transition-opacity hover:opacity-80"
                    aria-label="Enlarge image"
                  >
                    <img src={previewSrc} alt="" className="size-16 rounded-full object-cover" />
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Remove image"
                    className="absolute -right-1 -top-1 size-6"
                    onClick={removeImage}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="cat-image"
                  className="mt-2 flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-border p-3 text-sm text-muted-foreground"
                >
                  <ImagePlus className="size-5 text-gold" />
                  <span>Choose an image</span>
                </label>
              )}

              <Input
                id="cat-image"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handleImageFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="text-xs uppercase tracking-[0.16em]">
                Description
              </Label>
              <Input
                id="cat-desc"
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                className="mt-2 h-10 rounded-sm"
              />
            </div>
            <div className="flex gap-3">
              {editingCategoryId && (
                <Button
                  variant="outline"
                  className="flex-1 rounded-sm text-xs uppercase tracking-[0.2em]"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              )}
              <Button
                className="flex-1 rounded-sm text-xs uppercase tracking-[0.2em]"
                disabled={create.isPending || update.isPending}
                onClick={saveCategory}
              >
                {editingCategoryId ? "Update category" : "Add category"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionDialog
        open={!!pendingToggle}
        onOpenChange={(open) => !open && setPendingToggle(null)}
        title={`${pendingToggle?.nextActive ? "Enable" : "Disable"} "${pendingToggle?.name}"?`}
        description={
          pendingToggle?.nextActive
            ? `This will re-enable every product in "${pendingToggle?.name}", including any you had individually disabled before. Those earlier choices will be overridden.`
            : `This will hide "${pendingToggle?.name}" from customers, and every product currently in this collection will also be disabled.`
        }
        confirmLabel={`Yes, ${pendingToggle?.nextActive ? "enable" : "disable"}`}
        onConfirm={() => {
          if (pendingToggle) {
            toggle.mutate({ id: pendingToggle.id, isActive: pendingToggle.nextActive });
          }
          setPendingToggle(null);
        }}
      />

      {previewImage && (
        <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
}
