/**
 * Themes.
 *
 * Two rules hold across every theme:
 *   1. Colour belongs to the LENS. Node kind is encoded by shape, never hue.
 *   2. Light is the default. Decks get projected in lit rooms and printed.
 *
 * Font *data* lives in fonts.gen.js and is injected by the entry point, so a
 * build only carries the typefaces its theme actually uses.
 */

const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

export const THEMES = [
  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "house",
    metrics: { charFactor: 0.505 },
    name: "House",
    blurb:
      "Editorial prose on warm paper; the figure sits on it as a hard-edged monochrome plate. Colour appears only when a lens asks for it.",
    font: { ui: `Archivo, ${SANS}`, prose: `Newsreader, Georgia, serif`, mono: `Archivo, ${SANS}` },
    type: { tightness: "-0.014em", proseSize: "18.5px", uiWeight: 500, labelWeight: 600, caps: true },
    shape: { radius: 0, nodeStroke: 1.5, groupStroke: 1, chipRadius: 0, shadow: "none", grid: "none" },
    modes: {
      light: {
        bg: "#F8F5EF", stage: "#FFFFFF", panel: "#FFFFFF", surface: "#FFFFFF", surfaceAlt: "#F0ECE4",
        ink: "#0F0D0A", ink2: "#57514A", ink3: "#8B857C",
        line: "#DCD6CB", line2: "#0F0D0A", edge: "#0F0D0A", ghost: "#C6BFB3",
        lens: { flow: "#0F0D0A", cost: "#A96C00", trust: "#006647", failure: "#C22A16", ownership: "#1442B8" },
      },
      dark: {
        bg: "#131110", stage: "#0A0908", panel: "#131110", surface: "#1A1816", surfaceAlt: "#221F1C",
        ink: "#F4F0E9", ink2: "#A79F94", ink3: "#6F675D",
        line: "#2A2724", line2: "#8A8378", edge: "#D8D2C8", ghost: "#38342F",
        lens: { flow: "#F4F0E9", cost: "#E8B23F", trust: "#3FC79A", failure: "#FF6B4F", ownership: "#6E9CFF" },
      },
    },
  },

  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "swiss",
    metrics: { charFactor: 0.505 },
    name: "Swiss modernist",
    blurb:
      "Flat, high-contrast, hard corners, strict grid. Colour arrives only as a signal. The layout carries the personality, not the decoration.",
    font: { ui: `Archivo, ${SANS}`, prose: `Archivo, ${SANS}`, mono: `JetBrainsMono, monospace` },
    type: { tightness: "-0.03em", proseSize: "16px", uiWeight: 500, labelWeight: 600, caps: true },
    shape: { radius: 0, nodeStroke: 1.4, groupStroke: 1, chipRadius: 0, shadow: "none", blur: "none", grid: "none" },
    modes: {
      light: {
        bg: "#ffffff", panel: "#ffffff", surface: "#ffffff", surfaceAlt: "#f2f2f2",
        ink: "#0a0a0a", ink2: "#5c5c5c", ink3: "#8f8f8f",
        line: "#dcdcdc", line2: "#0a0a0a", edge: "#0a0a0a", ghost: "#c4c4c4",
        lens: { flow: "#0a0a0a", cost: "#F0B400", trust: "#00794A", failure: "#E5341F", ownership: "#0B4FD8" },
      },
      dark: {
        bg: "#0a0a0a", panel: "#0f0f0f", surface: "#141414", surfaceAlt: "#1c1c1c",
        ink: "#fafafa", ink2: "#a3a3a3", ink3: "#6e6e6e",
        line: "#262626", line2: "#787878", edge: "#c8c8c8", ghost: "#3a3a3a",
        lens: { flow: "#fafafa", cost: "#FFC933", trust: "#22C08A", failure: "#FF5A44", ownership: "#5B8DFF" },
      },
    },
  },

  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "editorial",
    metrics: { charFactor: 0.525 },
    name: "Editorial print",
    blurb:
      "Warm paper, ink, hairline rules. A serif carries the prose, a grotesque labels the figure. Reads like a plate in a technical journal.",
    font: { ui: `InstrumentSans, ${SANS}`, prose: `Newsreader, Georgia, serif`, mono: `JetBrainsMono, monospace` },
    type: { tightness: "-0.011em", proseSize: "18.5px", uiWeight: 500, labelWeight: 600, caps: false },
    shape: { radius: 2, nodeStroke: 1, groupStroke: 1, chipRadius: 2, shadow: "none", blur: "none", grid: "none" },
    modes: {
      light: {
        bg: "#FAF7F1", panel: "#FFFDF8", surface: "#FFFDF8", surfaceAlt: "#F1EBE0",
        ink: "#1A1611", ink2: "#5F574B", ink3: "#8C8375",
        line: "#DED5C6", line2: "#B4A894", edge: "#7A6F5E", ghost: "#D3C9B8",
        lens: { flow: "#3B342A", cost: "#9A6B12", trust: "#3E6B45", failure: "#8C2F23", ownership: "#2A4A7C" },
      },
      dark: {
        bg: "#16130F", panel: "#1D1A15", surface: "#211D18", surfaceAlt: "#2A251E",
        ink: "#F0EAE0", ink2: "#A99E8D", ink3: "#7C7263",
        line: "#332D25", line2: "#4E463A", edge: "#8C8272", ghost: "#3B342B",
        lens: { flow: "#D9CFBF", cost: "#D3A04A", trust: "#7FB088", failure: "#D9705F", ownership: "#7B9CD1" },
      },
    },
  },

  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "draft",
    metrics: { charFactor: 0.60 },
    name: "Technical drafting",
    blurb:
      "Hairline strokes, monospace annotation, a visible drafting grid. Corner ticks and sheet marks. Reads as a schematic, not an interface.",
    font: { ui: `JetBrainsMono, monospace`, prose: `InstrumentSans, ${SANS}`, mono: `JetBrainsMono, monospace` },
    type: { tightness: "-0.005em", proseSize: "16px", uiWeight: 500, labelWeight: 500, caps: true },
    shape: { radius: 0, nodeStroke: 0.9, groupStroke: 0.9, chipRadius: 0, shadow: "none", blur: "none", grid: "fine", ticks: true },
    modes: {
      light: {
        bg: "#F5F6F4", panel: "#FCFCFB", surface: "#FFFFFF", surfaceAlt: "#EDEEEB",
        ink: "#1F2933", ink2: "#5A6672", ink3: "#8B959F",
        line: "#D4D8D5", line2: "#8B959F", edge: "#5A6672", ghost: "#C3C9C6",
        lens: { flow: "#1F2933", cost: "#B2611F", trust: "#1F7D57", failure: "#A62B34", ownership: "#1F6FB2" },
      },
      dark: {
        bg: "#0C2233", panel: "#0F2A3E", surface: "#123049", surfaceAlt: "#163956",
        ink: "#DCEAF5", ink2: "#8FB3CC", ink3: "#5E86A3",
        line: "#1E4A66", line2: "#3E6D8F", edge: "#7FA8C4", ghost: "#254F6E",
        lens: { flow: "#CFE6F7", cost: "#E8A34A", trust: "#4FC79A", failure: "#FF7A6B", ownership: "#5CB3F0" },
      },
    },
  },

  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "warm",
    metrics: { charFactor: 0.525 },
    name: "De-Tailwinded",
    blurb:
      "Warm neutrals instead of blue-greys, desaturated earth accents instead of sky/violet/emerald. No blur, no glow, no gradient.",
    font: { ui: `InstrumentSans, ${SANS}`, prose: `InstrumentSans, ${SANS}`, mono: `JetBrainsMono, monospace` },
    type: { tightness: "-0.018em", proseSize: "16.5px", uiWeight: 500, labelWeight: 600, caps: false },
    shape: { radius: 5, nodeStroke: 1.1, groupStroke: 1, chipRadius: 3, shadow: "none", blur: "none", grid: "dot" },
    modes: {
      light: {
        bg: "#F7F5F2", panel: "#FCFBF9", surface: "#FFFFFF", surfaceAlt: "#EFEBE5",
        ink: "#1C1A17", ink2: "#615C54", ink3: "#918B81",
        line: "#E2DDD5", line2: "#BFB8AC", edge: "#8A8378", ghost: "#D8D2C8",
        lens: { flow: "#4A443B", cost: "#9C6F26", trust: "#4F7A52", failure: "#A8503A", ownership: "#5A6E96" },
      },
      dark: {
        bg: "#131211", panel: "#191817", surface: "#201E1C", surfaceAlt: "#2A2724",
        ink: "#EAE6E0", ink2: "#A29B91", ink3: "#726B62",
        line: "#2C2926", line2: "#433E38", edge: "#8A8378", ghost: "#332F2B",
        lens: { flow: "#CFC8BE", cost: "#C99A45", trust: "#7FA882", failure: "#D07A60", ownership: "#8B9DC4" },
      },
    },
  },

  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "shadcn",
    metrics: { charFactor: 0.535 },
    name: "shadcn (control)",
    blurb:
      "The familiar baseline: zinc neutrals, 8px radius, muted foregrounds, Inter. Included so everything else has something to beat.",
    font: { ui: `InterVar, ${SANS}`, prose: `InterVar, ${SANS}`, mono: `JetBrainsMono, monospace` },
    type: { tightness: "-0.012em", proseSize: "16px", uiWeight: 500, labelWeight: 600, caps: false },
    shape: { radius: 8, nodeStroke: 1, groupStroke: 1, chipRadius: 4, shadow: "soft", blur: "none", grid: "dot" },
    modes: {
      light: {
        bg: "#FFFFFF", panel: "#FFFFFF", surface: "#FFFFFF", surfaceAlt: "#F4F4F5",
        ink: "#09090B", ink2: "#71717A", ink3: "#A1A1AA",
        line: "#E4E4E7", line2: "#D4D4D8", edge: "#A1A1AA", ghost: "#E4E4E7",
        lens: { flow: "#18181B", cost: "#E8C468", trust: "#2A9D90", failure: "#E76E50", ownership: "#274754" },
      },
      dark: {
        bg: "#09090B", panel: "#09090B", surface: "#18181B", surfaceAlt: "#27272A",
        ink: "#FAFAFA", ink2: "#A1A1AA", ink3: "#71717A",
        line: "#27272A", line2: "#3F3F46", edge: "#52525B", ghost: "#27272A",
        lens: { flow: "#E4E4E7", cost: "#E8C468", trust: "#2A9D90", failure: "#E76E50", ownership: "#7DA3B8" },
      },
    },
  },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

/** Flatten a theme + mode into the token object everything reads from. */
export function resolveTheme(id, mode) {
  const t = themeById(id);
  const m = t.modes[mode] || t.modes.light;
  // the figure may sit on a different surface than the page it's printed on
  return { ...t, mode, c: { ...m, stage: m.stage || m.bg } };
}

/** Push tokens into CSS custom properties so stylesheet rules can use them. */
export function applyTheme(th) {
  const r = document.documentElement.style;
  const c = th.c;
  r.setProperty("--bg", c.bg);
  r.setProperty("--panel", c.panel);
  r.setProperty("--stage", c.stage);
  r.setProperty("--surface", c.surface);
  r.setProperty("--surface-alt", c.surfaceAlt);
  r.setProperty("--ink", c.ink);
  r.setProperty("--ink2", c.ink2);
  r.setProperty("--ink3", c.ink3);
  r.setProperty("--line", c.line);
  r.setProperty("--line2", c.line2);
  r.setProperty("--font-ui", th.font.ui);
  r.setProperty("--font-prose", th.font.prose);
  r.setProperty("--font-mono", th.font.mono);
  r.setProperty("--radius", th.shape.radius + "px");
  r.setProperty("--chip-radius", th.shape.chipRadius + "px");
  r.setProperty("--tight", th.type.tightness);
  r.setProperty("--prose-size", th.type.proseSize);
  r.setProperty(
    "--shadow",
    th.shape.shadow === "soft" ? "0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06)" : "none"
  );
  document.documentElement.dataset.theme = th.id;
  document.documentElement.dataset.mode = th.mode;
}
