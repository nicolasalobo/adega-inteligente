/**
 * Feature flags do MVP (docs/MVP.md, seção 4).
 * Funcionalidades fora do MVP que já existem ficam escondidas, sem apagar código.
 * Todas começam DESLIGADAS: só liga com o valor "true" (ou "1") na variável de ambiente.
 */
export type Features = {
  /** Identificação por foto do rótulo com IA (UI e rota /api/identification/photo). */
  photoIdentification: boolean;
};

export function isFlagOn(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

export function readFeatures(env: { NEXT_PUBLIC_FEATURE_PHOTO_IDENTIFICATION?: string }): Features {
  return {
    photoIdentification: isFlagOn(env.NEXT_PUBLIC_FEATURE_PHOTO_IDENTIFICATION),
  };
}

// Next.js só troca `process.env.NEXT_PUBLIC_*` no navegador quando o nome aparece escrito por extenso.
export const features: Features = readFeatures({
  NEXT_PUBLIC_FEATURE_PHOTO_IDENTIFICATION: process.env.NEXT_PUBLIC_FEATURE_PHOTO_IDENTIFICATION,
});
