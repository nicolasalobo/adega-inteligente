import { analyzeLabelPhoto, getIdentificationCapabilities, consumeIdentificationQuota } from "@/lib/identification/providers";
import { isAllowedPhotoDataUrl } from "@/lib/identification/image-validation";
import { getAuthenticatedNeonRequest } from "@/lib/neon/server-auth";

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedNeonRequest(request);
  if (!authenticated) return Response.json({ error: "Entre na sua conta para analisar um rótulo." }, { status: 401 });

  const capabilities = getIdentificationCapabilities();
  if (!capabilities.photo) return Response.json({ error: "Análise por foto está desabilitada. Configure uma chave e habilite ENABLE_OPENAI_IDENTIFICATION explicitamente." }, { status: 503 });

  let body: { imageDataUrl?: unknown; consent?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Envie uma fotografia JPEG, PNG ou WebP." }, { status: 400 }); }
  if (body.consent !== true) return Response.json({ error: "Confirme a autorização antes de enviar a fotografia à IA." }, { status: 400 });
  if (typeof body.imageDataUrl !== "string" || !isAllowedPhotoDataUrl(body.imageDataUrl)) {
    return Response.json({ error: "A imagem deve ser JPEG, PNG ou WebP e ter no máximo 1,3 MB após compressão." }, { status: 400 });
  }

  try {
    const allowed = await consumeIdentificationQuota(authenticated, "photo");
    if (!allowed) return Response.json({ error: "Limite de 5 análises de foto por hora atingido. Tente novamente mais tarde." }, { status: 429 });
  } catch {
    return Response.json({ error: "Não foi possível validar o limite de análises. Nenhuma fotografia foi enviada à IA." }, { status: 503 });
  }

  try {
    const result = await analyzeLabelPhoto(body.imageDataUrl);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível analisar o rótulo. Nenhum dado foi gravado na adega." }, { status: 502 });
  }
}
