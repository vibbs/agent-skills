import { render } from "preact";
import Root from "./App.jsx";
import { SPEC } from "./spec.js";
import faces from "virtual:theme-faces";
import "./styles.css";

// virtual:theme-faces (see vite.config.js) imports only the families the
// active theme uses, so the other subsetted faces tree-shake out instead of
// riding along as dead base64.
const s = document.createElement("style");
s.textContent = faces
  .map(([family, url, weight]) =>
    `@font-face{font-family:${family};src:url(${url}) format('woff2');font-weight:${weight};font-display:block}`)
  .join("\n");
document.head.appendChild(s);

document.title = SPEC.meta.title;

render(<Root spec={SPEC} />, document.getElementById("app"));
