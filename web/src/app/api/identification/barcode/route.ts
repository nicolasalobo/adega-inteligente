import { normalizeEan13 } from "@/lib/identification/ean13";
import { identifyBarcode } from "@/lib/identification/service";
import { consumeIdentificationQuota, createIdentificationProviders, getIdentificationCapabilities } from "@/lib/identification/providers";
import { getAuthenticatedNeonRequest } from "@/lib/neon/server-auth";

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedNeonRequest(request);
  if (!authenticated) return Response.json({ error: "Entre na sua conta para identificar um vinho." }, { status: 401 });

  let body: { ean13?: unknown; allowWineApi?: unknown; allowWebSearch?: unknown; allowAiResolution?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Envie um EAN-13 válido." }, { status: 400 }); }
  const ean13 = normalizeEan13(typeof body.ean13 === "string" ? body.ean13 : "");
  if (!ean13) return Response.json({ error: "Informe um EAN-13 válido, incluindo o dígito verificador." }, { status: 400 });

  const capabilities = getIdentificationCapabilities();
  try {
    const allowed = await consumeIdentificationQuota(authenticated, "barcode");
    if (!allowed) return Response.json({ error: "Limite de 30 identificações por hora atingido. Tente novamente mais tarde." }, { status: 429 });
  } catch {
    return Response.json({ error: "Não foi possível validar o limite de consultas. Nenhuma busca externa foi iniciada." }, { status: 503 });
  }

  try {
    const result = await identifyBarcode(ean13, createIdentificationProviders(authenticated), {
      allowWineApi: body.allowWineApi === true && capabilities.wineApi,
      allowWebSearch: body.allowWebSearch === true && capabilities.webSearch,
      allowAiResolution: body.allowAiResolution === true && capabilities.ai,
    });
    if (body.allowWineApi === true && !capabilities.wineApi) result.warnings.push("Complementação WineAPI desabilitada no servidor ou sem credencial. Nenhuma chamada foi feita.");
    if (body.allowWebSearch === true && !capabilities.webSearch) result.warnings.push("Pesquisa externa desabilitada no servidor ou sem credencial. Nenhuma chamada foi feita.");
    if (body.allowAiResolution === true && !capabilities.ai) result.warnings.push("IA desabilitada no servidor ou sem credencial. Nenhuma chamada paga foi feita.");
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível concluir a identificação. A busca não alterou o inventário." }, { status: 502 });
  }
}
