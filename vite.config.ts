import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

function replacePagination(): Plugin {
  const browserPath = resolve(__dirname, "src/pagination.browser.ts");
  return {
    name: "replace-pagination",
    enforce: "pre",
    resolveId(source, importer) {
      if (
        importer &&
        source.includes("pagination") &&
        source.endsWith(".js")
      ) {
        return browserPath;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), replacePagination()],
});
