import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adega pessoal — seu mapa de vinhos",
  description: "Organize sua coleção de vinhos e encontre cada garrafa na adega.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
