import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const base = process.env.BASE_PATH || "/";

// Map Replit's NEXT_PUBLIC_FIREBASE_* secrets → VITE_FIREBASE_* at build time.
// Only inject when the source var exists so Vercel's own VITE_* vars aren't overwritten.
const firebaseDefines = Object.fromEntries(
  [
    ["VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY"],
    ["VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
    ["VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
    ["VITE_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
    ["VITE_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
    ["VITE_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"],
  ]
    .filter(([, src]) => process.env[src])
    .map(([vite, src]) => [`import.meta.env.${vite}`, JSON.stringify(process.env[src])])
);

export default defineConfig({
  base,
  define: firebaseDefines,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: "wss" },
    fs: { strict: true },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
