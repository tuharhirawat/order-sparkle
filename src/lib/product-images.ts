import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Uploads files to storage and records them against a product, preserving order. */
export async function uploadProductImages(
  productId: string,
  files: File[],
  alt: string,
  startPosition = 0,
): Promise<void> {
  let position = startPosition;
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, TEN_YEARS);
    if (signError || !signed) throw new Error(signError?.message ?? "Could not create image link.");

    const { error: insertError } = await supabase.from("product_images").insert({
      product_id: productId,
      url: signed.signedUrl,
      alt,
      position,
    });
    if (insertError) throw new Error(insertError.message);
    position += 1;
  }
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);
}
