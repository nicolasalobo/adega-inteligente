"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { normalizeEan13 } from "@/lib/identification/ean13";

export function BarcodeScanner({ onDetected, onCancel }: { onDetected: (ean13: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [message, setMessage] = useState("Solicitando acesso à câmera…");

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    let disposed = false;
    let found = false;
    const video = videoRef.current;

    const releaseCamera = () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      const stream = video?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };

    async function startCamera() {
      if (!video) return;
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setMessage("A câmera precisa de uma conexão HTTPS e permissão do navegador. Você pode digitar o EAN manualmente.");
        return;
      }
      try {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            if (!result || found) return;
            const ean13 = normalizeEan13(result.getText());
            if (!ean13) {
              setMessage("O código lido não é um EAN-13 válido. Aponte para o código de barras do rótulo.");
              return;
            }
            found = true;
            releaseCamera();
            onDetectedRef.current(ean13);
          },
        );
        controlsRef.current = controls;
        if (disposed) {
          releaseCamera();
          return;
        }
        setMessage("Aponte para o código de barras. A câmera traseira será usada quando disponível.");
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setMessage("O acesso à câmera foi negado. Permita a câmera nas configurações do navegador ou digite o EAN manualmente.");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setMessage("Nenhuma câmera traseira compatível foi encontrada. Digite o EAN manualmente.");
        } else if (name === "NotReadableError") {
          setMessage("A câmera está ocupada por outro aplicativo. Feche-o e tente novamente.");
        } else {
          setMessage("Não foi possível iniciar o scanner. Digite o EAN manualmente.");
        }
        releaseCamera();
      }
    }

    void startCamera();
    return () => {
      disposed = true;
      releaseCamera();
    };
  }, []);

  return (
    <div className="barcode-scanner" role="dialog" aria-modal="true" aria-label="Scanner de código de barras">
      <div className="scanner-preview"><video ref={videoRef} autoPlay muted playsInline aria-label="Prévia da câmera" /><span className="scanner-frame" aria-hidden="true" /></div>
      <p role="status">{message}</p>
      <button type="button" className="text-button" onClick={onCancel}>Cancelar scanner</button>
    </div>
  );
}
