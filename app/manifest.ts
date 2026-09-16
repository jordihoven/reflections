import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reflections",
    short_name: "Reflections",
    description: "A personal space to write public thoughts.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0070f3",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logo-xl.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}