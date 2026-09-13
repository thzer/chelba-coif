import { supabase } from "@/lib/supabase";

/** Types d'images acceptés à l'upload (alignés sur la config du bucket). */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const STORAGE_BUCKET = "gallery";

const STORAGE_PUBLIC_MARKER = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

/** Chemin dans le bucket à partir d'une URL publique, sinon null. */
export function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;

  const index = url.indexOf(STORAGE_PUBLIC_MARKER);

  return index === -1 ? null : url.substring(index + STORAGE_PUBLIC_MARKER.length);
}

export function buildStorageFileName(file: File) {
  return `${Date.now()}-${Math.random().toString(36).substring(2)}.${
    IMAGE_EXTENSIONS[file.type]
  }`;
}

/** Renvoie un message d'erreur si le fichier n'est pas une image acceptable. */
export function validateImageFile(file: File) {
  if (!IMAGE_EXTENSIONS[file.type]) {
    return "Format non supporté. Utilisez une image JPG, PNG ou WebP.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "L'image ne doit pas dépasser 5 MB.";
  }

  return null;
}

/**
 * Upload dans le bucket sous `folder/` et renvoie { path, publicUrl }.
 * Lève une erreur en cas d'échec.
 */
export async function uploadImage(file: File, folder: string) {
  const path = `${folder}/${buildStorageFileName(file)}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  return { path, publicUrl };
}

/** Supprime un fichier du bucket s'il nous appartient (URL publique du bucket). */
export async function removeImageByUrl(url: string | null | undefined) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;

  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
