import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Adega Inteligente",
    short_name: "Adega",
    description: "Organize sua coleção de vinhos e encontre cada garrafa na adega.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f5f1eb",
    theme_color: "#5b2030",
    icons: [
      { src: "/icons/adega-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/adega-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/adega-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
