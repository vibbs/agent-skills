import { render } from "preact";
import Root from "./App.jsx";
import { SPEC } from "./spec.js";
import { archivo, newsreader } from "./fonts.gen.js";
import "./styles.css";

// Only the families this build's theme uses are imported, so the other
// subsetted faces tree-shake out instead of riding along as dead base64.
const s = document.createElement("style");
s.textContent = `
@font-face{font-family:Archivo;src:url(${archivo}) format('woff2');font-weight:100 900;font-display:block}
@font-face{font-family:Newsreader;src:url(${newsreader}) format('woff2');font-weight:200 800;font-display:block}
`;
document.head.appendChild(s);

document.title = SPEC.meta.title;

render(<Root spec={SPEC} />, document.getElementById("app"));
