import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async ({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: false,
    host: host || "0.0.0.0",
    allowedHosts: true,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: mode !== "production" ? true : false,
    chunkSizeWarningLimit: 700,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep React isolated to avoid circular vendor -> vendor-react
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/jsx") || id.match(/node_modules\/react\//)) {
              return "vendor-react";
            }
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("@tauri-apps")) return "vendor-tauri";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("@fontsource") || id.includes("tailwindcss")) return "vendor-style";
            // everything else in node_modules -> separate but not overlapping with above
            // Use vendor for remaining small deps like clsx, tailwind-merge, zod
            if (id.includes("clsx") || id.includes("tailwind-merge") || id.includes("class-variance-authority") || id.includes("zod") || id.includes("qrcode.react")) {
              return "vendor-misc";
            }
            // fallback - let Rollup auto-chunk to avoid circular
            return undefined;
          }
          if (id.includes("src/mocks/")) return "frp-mocks";
          if (id.includes("src/components/views/")) return "views";
          if (id.includes("src/lib/frp-commands")) return "frp-logic";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    }
  },
  preview: {
    port: 1420,
    host: "0.0.0.0"
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-query",
      "@tauri-apps/api",
      "lucide-react"
    ]
  }
}));
