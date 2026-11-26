"use client";

import { Wine } from "lucide-react";

export function ConnectionStateScreen({ title, message }: { title: string; message: string }) {
  return <main className="connection-screen"><div className="connection-card"><span className="brand-mark"><Wine size={21} /></span><span className="loading-spinner" /><h1>{title}</h1><p>{message}</p></div></main>;
}

export function ConnectionErrorScreen({ message, onOpenDemo }: { message: string; onOpenDemo: () => void }) {
  return <main className="connection-screen"><div className="connection-card error-card"><span className="brand-mark"><Wine size={21} /></span><div className="connection-warning">!</div><h1>Não conseguimos abrir sua adega.</h1><p>Confira a conexão com Neon e se o banco está configurado.</p><details><summary>Detalhes</summary><code>{message}</code></details><button className="primary-button" onClick={onOpenDemo}>Abrir demonstração local</button></div></main>;
}
