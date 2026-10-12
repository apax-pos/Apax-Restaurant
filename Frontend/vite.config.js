import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifestFilename: "manifest.json",
      registerType: "autoUpdate",
      // Logos only here — SVG/illustrations are covered by globPatterns (duplicate breaks SW install)
      includeAssets: ["logo.png", "logo_192.png", "theme-favicon-logo.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Do not precache locale JSON — old SW cache caused raw i18n keys after deploy
        globIgnores: ["**/locales/**/*.json", "**/hero.webp"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/locales/") &&
              url.pathname.endsWith("translation.json"),
            handler: "NetworkFirst",
            options: {
              cacheName: "i18n-locales",
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60,
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      manifest: {
        name: "Apax Pos",
        short_name: "Apax Pos",
        description: "Apax Pos — point of sale for restaurants, cafes, hotels, food trucks, stalls, and food businesses.",
        theme_color: "#ECF1EB",
        icons: [
          {
            src: "/logo_192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/logo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
