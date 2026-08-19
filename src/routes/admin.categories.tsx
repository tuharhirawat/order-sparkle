import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { slugify } from "@/lib/format";
import { adminCategoriesQuery } from "@/lib/admin-data";

export default function AdminCategories() {
  const { data: categories } = useQuery(adminCategoriesQuery());
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });

  const create = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 2) throw new Error("Enter a category name.");
      const { error } = await supabase.from("categories").insert({
        name: name.trim(),
        slug: slugify(name),
        description: description.trim() || null,
        position: (categories?.length ?? 0) + 1,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      toast.success("Category added");
      void refresh();
    },
    onError: (e: Error) => toast.error("Could not add category", { description: e.message }),
  });

  const toggle = useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: input.is_active })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Category removed");
      void refresh();
    },
    onError: (e: Error) => toast.error("Could not remove", { description: e.message }),
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
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Visible</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(categories ?? []).map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3">{category.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={category.is_active}
                      aria-label={`Toggle ${category.name}`}
                      onCheckedChange={(checked) =>
                        toggle.mutate({ id: category.id, is_active: checked })
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
