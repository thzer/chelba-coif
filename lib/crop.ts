import { validateImageFile } from "@/lib/images";

/** Une demande de recadrage en attente (affichée par <ImageCropper />). */
export type CropRequest = {
  file: File;
  aspect: number;
  title: string;
  hint?: string;
  onDone: (file: File) => void;
};

/**
 * Formats utilisés par le site. Recadrer au bon format évite que l'image soit
 * coupée n'importe comment une fois affichée.
 */
export const CROP = {
  service: {
    aspect: 3 / 2,
    title: "Recadrer la photo du service",
    hint: "Format paysage, comme sur les cartes de services du site.",
  },
  gallery: {
    aspect: 4 / 3,
    title: "Recadrer la photo",
    hint: "Format paysage, comme dans la galerie du site.",
  },
  barber: {
    aspect: 3 / 4,
    title: "Recadrer la photo du coiffeur",
    hint: "Format portrait : cadrez le visage au centre, comme sur la section « Nos coiffeurs ».",
  },
} as const;

/**
 * Handler d'un <input type="file"> : valide le fichier puis ouvre le
 * recadrage. Le champ est vidé pour pouvoir re-choisir la même photo.
 */
export function pickImage(
  e: React.ChangeEvent<HTMLInputElement>,
  open: (request: CropRequest) => void,
  request: Omit<CropRequest, "file">
) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  const problem = validateImageFile(file);
  if (problem) {
    alert(problem);
    return;
  }

  open({ ...request, file });
}
