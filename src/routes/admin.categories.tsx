import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/Services/api";
import { adminCategoriesQuery } from "@/lib/admin-data";

export default function AdminCategories() {
  const { data: categories } = useQuery(adminCategoriesQuery());
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });

  const create = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 2) {
        throw new Error("Enter a category name.");
      }

      const formData = new FormData();
      formData.append("name", name.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (image) formData.append("image", image);
      await api.post("/Product/Categories", formData);
    },

    onSuccess: () => {
      setName("");
      setDescription("");
      setImage(null);
      setImagePreview(null);

      toast.success("Category added");

      void refresh();
    },

    onError: (e: any) => {
      toast.error("Could not add category", {
        description:
          e.response?.data?.message ?? "Something went wrong.",
      });
    },
  });

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

    onSuccess: () => {
      void refresh();
    },

    onError: (e: any) => {
      toast.error("Update failed", {
        description: e.response?.data?.message ?? "Something went wrong.",
      });
    },
  });

  const remove = useMutation({
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
                      <img src={category.imageUrl} alt="" className="size-10 rounded-full object-cover" />
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
                        toggle.mutate({ id: category.id, isActive: checked })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => remove.mutate(category.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="surface-panel h-fit rounded-sm p-6">
          <h2 className="font-display text-2xl">Add category</h2>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="cat-name" className="text-xs uppercase tracking-[0.16em]">
                Name
              </Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-10 rounded-sm"
              />
            </div>
            <div>
              <Label htmlFor="cat-image" className="text-xs uppercase tracking-[0.16em]">
                Image (optional)
              </Label>
              <label htmlFor="cat-image" className="mt-2 flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-border p-3 text-sm text-muted-foreground">
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="size-12 rounded-full object-cover" />
                ) : (
                  <ImagePlus className="size-5 text-gold" />
                )}
                <span>{image ? image.name : "Choose an image"}</span>
              </label>
              <Input
                id="cat-image"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) return;
                  if (!file.type.startsWith("image/")) {
                    toast.error("Please choose a valid image.");
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error("The category image must not exceed 5 MB.");
                    return;
                  }
                  setImage(file);
                  setImagePreview(URL.createObjectURL(file));
                }}
              />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="text-xs uppercase tracking-[0.16em]">
                Description
              </Label>
              <Input
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 h-10 rounded-sm"
              />
            </div>
            <Button
              className="w-full rounded-sm text-xs uppercase tracking-[0.2em]"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              Add category
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
