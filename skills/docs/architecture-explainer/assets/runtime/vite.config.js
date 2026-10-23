import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "url";
import { THEME_ID, themeById, themeFaces } from "./src/themes.js";
import { SPEC } from "./src/spec.js";

const FONTS = fileURLToPath(new URL("./src/fonts.gen.js", import.meta.url));
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

/**
 * Build-time glue between the spec, the theme and the page:
 *   - virtual:theme-faces exports [family, dataUrl, weight] for exactly the
 *     faces THEME_ID's font stacks lead with, so switching theme switches fonts.
 *   - the static <title> and description carry the spec's, so the file reads
 *     correctly before any script runs (link previews, file browsers, no-JS).
 */
function explainer() {
  const ID = "virtual:theme-faces";
  return {
    name: "explainer",
    resolveId: (id) => (id === ID ? "\0" + ID : null),
    load(id) {
      if (id !== "\0" + ID) return null;
      const faces = themeFaces(themeById(THEME_ID));
      return (
        `import { ${faces.map((f) => f.file).join(", ")} } from ${JSON.stringify(FONTS)};\n` +
        `export default [${faces.map((f) => `[${JSON.stringify(f.family)}, ${f.file}, ${JSON.stringify(f.weight)}]`).join(", ")}];\n`
      );
    },
    transformIndexHtml(html) {
      const m = SPEC.meta || {};
      return html
        .replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title || "Architecture explainer")}</title>`)
        .replace(/(name="description"\s+content=")[^"]*/, (_, a) => a + esc(m.subtitle || m.title || ""));
    },
  };
}

export default defineConfig({
  plugins: [explainer(), preact(), viteSingleFile()],
  build: {
    target: "es2019",
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 4000,
  },
});
