"use client";

import { Barcode, Camera, Check, LoaderCircle, Search, Sparkles } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { features } from "@/lib/features";
import { normalizeEan13 } from "@/lib/identification/ean13";
import type { IdentificationCandidate, IdentificationResponse } from "@/lib/identification/contracts";
import type { NeonBrowserClient } from "@/lib/neon/client";

type AssociationChoice = { ean13: string; sourceProvider: "user" | "open_food_facts" | "wineapi" | "web"; sourceUrl: string | null };

async function compressPhoto(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Escolha uma imagem JPEG, PNG ou WebP.");
  if (file.size > 12_000_000) throw new Error("A foto precisa ter menos de 12 MB antes da compressão.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu preparar a imagem.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (dataUrl.length > 1_800_000) throw new Error("A foto continua grande demais após compressão.");
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function BarcodeIdentification({
  client,
  canPersist,
  onSelect,
  onAssociationChange,
}: {
  client: NeonBrowserClient | null;
  canPersist: boolean;
  onSelect: (candidate: IdentificationCandidate) => void;
  onAssociationChange: (choice: AssociationChoice | null) => void;
}) {
  const [input, setInput] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<IdentificationResponse | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [allowWineApi, setAllowWineApi] = useState(false);
  const [allowWebSearch, setAllowWebSearch] = useState(false);
  const [allowAiResolution, setAllowAiResolution] = useState(false);
  const [allowPhotoAi, setAllowPhotoAi] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const normalized = normalizeEan13(input);
  const invalid = input.trim().length > 0 && !normalized;

  async function accessToken() {
    if (!client) throw new Error("Entre na sua conta para consultar catálogos.");
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.access_token) throw new Error("Entre na sua conta da adega para continuar.");
    return data.session.access_token;
  }

  async function lookupBarcode() {
    if (!normalized) { setMessage("Informe um EAN-13 com dígito verificador válido."); return; }
    setLoading(true);
    setMessage("");
    setResult(null);
    setSelectedCandidate("");
    onAssociationChange(null);
    try {
      const token = await accessToken();
      const response = await fetch("/api/identification/barcode", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ean13: normalized, allowWineApi, allowWebSearch, allowAiResolution }),
      });
      const data = await response.json() as IdentificationResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível consultar este código.");
      setResult(data);
      setMessage(data.status === "not_found"
        ? "Não encontramos uma ficha confirmada. Revise as fontes ou continue com o cadastro manual."
        : data.status === "ambiguous"
          ? "Há mais de uma possibilidade. Selecione uma ficha para revisar."
          : "Resultado encontrado. Revise os campos antes de cadastrar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível identificar o EAN.");
    } finally {
      setLoading(false);
    }
  }

  function selectCandidate(candidate: IdentificationCandidate) {
    setSelectedCandidate(candidate.id);
    onSelect(candidate);
    const provider = candidate.sources[0]?.id;
    const sourceProvider = provider === "open_food_facts" || provider === "wineapi" || provider === "web" ? provider : "user";
    onAssociationChange(normalized ? { ean13: normalized, sourceProvider, sourceUrl: candidate.sources[0]?.url ?? null } : null);
  }

  async function analyzePhoto() {
    if (!photoFile) { setMessage("Selecione uma fotografia do rótulo."); return; }
    if (!allowPhotoAi) { setMessage("Autorize explicitamente o envio da foto à IA para continuar."); return; }
    setLoading(true);
    setMessage("");
    try {
      const token = await accessToken();
      const imageDataUrl = await compressPhoto(photoFile);
      const response = await fetch("/api/identification/photo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, consent: true }),
      });
      const data = await response.json() as { candidate?: IdentificationCandidate; warnings?: string[]; error?: string };
      if (!response.ok || !data.candidate) throw new Error(data.error ?? "Não foi possível analisar a foto.");
      setResult(null);
      setSelectedCandidate(data.candidate.id);
      onSelect(data.candidate);
      onAssociationChange(null);
      setMessage(`${data.warnings?.join(" ") ?? ""} Campos sem evidência foram deixados em branco.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível analisar a fotografia.");
    } finally {
      setLoading(false);
    }
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setPhotoFile(event.target.files?.[0] ?? null);
  }

  return (
    <section className="identification-panel" aria-label={features.photoIdentification ? "Identificação por código de barras ou foto" : "Identificação por código de barras"}>
      <div className="identification-heading"><Barcode size={16} /><div><strong>{features.photoIdentification ? "Identificar pelo código ou rótulo" : "Identificar pelo código de barras"}</strong><small>Catálogos fornecem candidatos; a revisão é sempre sua.</small></div></div>
      {!canPersist && <p className="identification-note">Entre na sua conta Neon para consultar catálogos e associar um EAN. O cadastro manual continua disponível.</p>}
      <div className="ean-entry-row">
        <label className="field"><span>EAN-13</span><input inputMode="numeric" autoComplete="off" maxLength={17} value={input} onChange={(event) => { setInput(event.target.value); setResult(null); setMessage(""); onAssociationChange(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void lookupBarcode(); } }} placeholder="Ex.: 7892500022445" aria-invalid={invalid} /></label>
        <button type="button" className="secondary-button" onClick={() => void lookupBarcode()} disabled={!canPersist || loading || !normalized}>
          {loading ? <LoaderCircle size={15} className="spin" /> : <Search size={15} />} Consultar
        </button>
        <button type="button" className="secondary-button scanner-open-button" onClick={() => setScannerOpen(true)} disabled={loading} aria-label="Abrir câmera para ler o código"><Camera size={15} /> Escanear</button>
      </div>
      {invalid && <p className="identification-warning" role="alert">EAN-13 inválido. Confira os 13 dígitos e o checksum.</p>}
      {normalized && canPersist && <label className="optional-provider"><input type="checkbox" checked={allowWineApi} onChange={(event) => setAllowWineApi(event.target.checked)} /> Permitir complemento WineAPI nesta busca, se habilitado no servidor.</label>}
      {normalized && canPersist && <label className="optional-provider"><input type="checkbox" checked={allowWebSearch} onChange={(event) => setAllowWebSearch(event.target.checked)} /> Permitir pesquisa na web nesta busca, se habilitada no servidor; pode ter custo.</label>}
      {normalized && canPersist && <label className="optional-provider"><input type="checkbox" checked={allowAiResolution} onChange={(event) => setAllowAiResolution(event.target.checked)} /> Permitir que a IA compare candidatos, se habilitada no servidor; pode ter custo.</label>}
      {message && <p className="identification-message" role="status">{message}</p>}
      {result && <div className="identification-results">
        {result.candidates.map((candidate) => <article key={candidate.id} className={`identification-candidate ${selectedCandidate === candidate.id ? "selected" : ""}`}>
          <div><strong>{candidate.name || "Nome não informado"}</strong><small>{candidate.producer || "Produtor não informado"}</small></div>
          <p>{[
            candidate.vintage ? `Safra sugerida ${candidate.vintage} · revisar` : "Safra não confirmada",
            candidate.country,
            candidate.region,
            candidate.grape,
            candidate.volume,
          ].filter(Boolean).join(" · ")}</p>
          {candidate.fieldsToReview.length > 0 && <small>Revisar: {candidate.fieldsToReview.join(", ")}</small>}
          <div className="identification-sources">{candidate.sources.map((source) => source.url
            ? <a key={`${source.id}:${source.url}`} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
            : <span key={source.id}>{source.label}</span>)}</div>
          <button type="button" className="text-button identification-select" onClick={() => selectCandidate(candidate)}>
            {selectedCandidate === candidate.id ? <><Check size={14} /> Selecionada para revisão</> : "Usar esta ficha"}
            {result.aiSelection?.candidateId === candidate.id && <span><Sparkles size={12} /> Sugestão da IA</span>}
          </button>
        </article>)}
        {result.warnings.map((warning, index) => <p className="identification-warning" key={`${index}:${warning}`}>{warning}</p>)}
        {result.sources.length > 0 && <small className="identification-attribution">As informações externas podem estar incorretas ou incompletas. Confira a fonte antes de salvar.</small>}
      </div>}
      {features.photoIdentification && <details className="photo-identification">
        <summary><Camera size={14} /> Alternativa: ler uma foto do rótulo</summary>
        <p>A fotografia só será enviada à OpenAI depois de selecionar o arquivo e confirmar abaixo. A análise não cadastra dados sozinha.</p>
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onPhotoChange} disabled={!canPersist || loading} aria-label="Selecionar foto do rótulo" />
        <label className="optional-provider"><input type="checkbox" checked={allowPhotoAi} onChange={(event) => setAllowPhotoAi(event.target.checked)} /> Autorizo enviar esta foto à OpenAI. A chamada pode ter custo e os dados retornados exigem revisão.</label>
        <button type="button" className="secondary-button" disabled={!canPersist || loading || !photoFile || !allowPhotoAi} onClick={() => void analyzePhoto()}>
          {loading ? <LoaderCircle size={14} className="spin" /> : <Sparkles size={14} />} Analisar fotografia
        </button>
      </details>}
      {scannerOpen && <BarcodeScanner onCancel={() => setScannerOpen(false)} onDetected={(ean13) => { setInput(ean13); setScannerOpen(false); setMessage(canPersist ? "Código lido. Consulte as fontes para revisar o rótulo." : "Código lido. Entre na sua conta Neon para consultar fontes e associar o EAN."); }} />}
    </section>
  );
}
