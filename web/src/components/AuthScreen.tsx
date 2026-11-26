"use client";

import { Wine } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { NeonBrowserClient } from "@/lib/neon/client";

/** Entrar ou criar conta (Neon Auth). */
export function AuthScreen({
  client,
  onAuthenticated,
}: {
  client: NeonBrowserClient;
  onAuthenticated: (user: { id: string; email?: string | null }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      if (mode === "sign-in") {
        const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (!data.user) throw new Error("Não foi possível confirmar sua conta.");
        await onAuthenticated(data.user);
        return;
      }

      const { data, error: authError } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: email.trim().split("@")[0] },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;
      if (data.session && data.user) {
        await onAuthenticated(data.user);
      } else {
        setMessage("Conta criada. Confirme seu e-mail e depois entre para abrir sua adega.");
        setMode("sign-in");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Não foi possível concluir o acesso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="brand auth-brand"><span className="brand-mark"><Wine size={20} /></span><span className="brand-wordmark">ADEGA<span>pessoal</span></span></div>
      <section className="auth-card">
        <div className="auth-emblem"><Wine size={23} /></div>
        <div className="eyebrow"><span className="eyebrow-line" /> SUA COLEÇÃO, BEM CUIDADA</div>
        <h1>{mode === "sign-in" ? "Que bom ter você de volta." : "Sua adega começa aqui."}</h1>
        <p className="auth-intro">{mode === "sign-in" ? "Entre para abrir seu mapa e encontrar cada garrafa." : "Crie sua conta para guardar a coleção com segurança."}</p>
        <form className="auth-form" onSubmit={submit}>
          <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" required /></label>
          <label className="field"><span>Senha</span><input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" minLength={8} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? "Aguarde…" : mode === "sign-in" ? "Entrar na adega" : "Criar minha conta"}</button>
        </form>
        <div className="auth-switch">{mode === "sign-in" ? "Ainda não tem conta?" : "Já tem uma conta?"}<button onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setMessage(""); }}>{mode === "sign-in" ? "Criar conta" : "Fazer login"}</button></div>
        <div className="auth-footnote"><span className="local-status-dot" /> Seus vinhos ficam privados na sua conta.</div>
      </section>
      <p className="auth-bottom-note">Cadastro manual disponível desde o primeiro acesso.</p>
    </main>
  );
}
