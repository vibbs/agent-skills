/**
 * Node kind is encoded by SHAPE, not colour.
 *
 * This is the change that removes the rainbow: with six kinds each owning a
 * hue, plus five lens accents, a reader is asked to hold ten meanings at once.
 * Shapes carry kind for free and leave every drop of colour to the lens.
 */

export const KIND_SHAPES = [
  ["source", "Data source"],
  ["process", "Processing"],
  ["store", "Storage / registry"],
  ["human", "Human in the loop"],
  ["gate", "Decision gate"],
];

function rounded(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  if (rr <= 0.5) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  return (
    `M ${x + rr} ${y} H ${x + w - rr} A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr} ` +
    `V ${y + h - rr} A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} ` +
    `H ${x + rr} A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr} ` +
    `V ${y + rr} A ${rr} ${rr} 0 0 1 ${x + rr} ${y} Z`
  );
}

/**
 * @returns {{ d: string, extras: Array }} outline path plus any interior marks
 */
export function nodeShape(kind, rect, radius) {
  const { x, y, w, h } = rect;
  const extras = [];

  switch (kind) {
    // a source is a document: one corner folded away
    case "source": {
      const c = Math.min(13, w / 5, h / 3);
      const r = Math.min(radius, 6);
      const d =
        `M ${x + c} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} ` +
        `V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} ` +
        `H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} ` +
        `V ${y + c} Z`;
      extras.push({ type: "path", d: `M ${x} ${y + c} L ${x + c} ${y + c} L ${x + c} ${y}`, opacity: 0.55 });
      return { d, extras };
    }

    // a store keeps a spine: the classic database rule down its left side
    case "store": {
      extras.push({ type: "line", x1: x + 9, y1: y + 7, x2: x + 9, y2: y + h - 7, opacity: 0.5 });
      extras.push({ type: "line", x1: x + 12.5, y1: y + 7, x2: x + 12.5, y2: y + h - 7, opacity: 0.28 });
      return { d: rounded(x, y, w, h, radius), extras };
    }

    // a human step is marked by a figure, and by a broken bottom edge
    case "human": {
      extras.push({ type: "circle", cx: x + 13, cy: y + 13, r: 3.4, fill: true, opacity: 0.75 });
      extras.push({
        type: "path",
        d: `M ${x + 8.2} ${y + 20.5} a 4.8 4.8 0 0 1 9.6 0`,
        opacity: 0.75,
      });
      return { d: rounded(x, y, w, h, radius), extras, dashed: true };
    }

    // a gate is chamfered on every corner — it reads as a decision
    case "gate": {
      const c = Math.min(11, w / 6, h / 3);
      const d =
        `M ${x + c} ${y} L ${x + w - c} ${y} L ${x + w} ${y + c} ` +
        `L ${x + w} ${y + h - c} L ${x + w - c} ${y + h} L ${x + c} ${y + h} ` +
        `L ${x} ${y + h - c} L ${x} ${y + c} Z`;
      return { d, extras };
    }

    case "group":
      return { d: rounded(x, y, w, h, Math.max(radius, 0)), extras };

    default:
      return { d: rounded(x, y, w, h, radius), extras };
  }
}

/** Small legend swatch of the same shape, drawn into a 26×16 box. */
export function legendShape(kind, radius) {
  return nodeShape(kind, { x: 1, y: 1, w: 24, h: 14 }, Math.min(radius, 3));
}
