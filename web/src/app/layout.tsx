import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adega pessoal — seu mapa de vinhos",
  description: "Organize sua coleção de vinhos e encontre cada garrafa na adega.",
  applicationName: "Adega Inteligente",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Adega Inteligente",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/adega-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/adega-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5b2030",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
