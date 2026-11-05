import { SITE_URL } from "@/api/client";
import { escapeHtml } from "@/lib/format";

/**
 * Small helpers for rebuilding the website's jsPDF documents (money receipt, certificate) as one SVG drawing
 * inside an HTML page. The drawing uses the same millimetre coordinates as the jsPDF code, so every line,
 * box and text sits where the website puts it; the page is then turned into a PDF by shareHtmlAsPdf().
 */

/** One typographic point in millimetres (jsPDF font sizes are points, its coordinates millimetres) */
export const PT_TO_MM = 0.352778;

/** Rounds a coordinate for compact SVG output */
export function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** A site asset ("/mainlogo.png") as the absolute URL the PDF renderer can load */
export function siteAsset(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Times-Roman advance widths (per 1000 units of font size) for the characters names and sentences use */
const TIMES_WIDTHS: Record<string, number> = {
  " ": 250, ",": 250, ".": 250, ":": 278, ";": 278, "(": 333, ")": 333, "-": 333, "'": 180, '"': 408, "/": 278, "&": 778,
  a: 444, b: 500, c: 444, d: 500, e: 444, f: 333, g: 500, h: 500, i: 278, j: 278, k: 500, l: 278, m: 778, n: 500, o: 500, p: 500, q: 500, r: 333, s: 389, t: 278, u: 500, v: 500, w: 722, x: 500, y: 500, z: 444,
  A: 722, B: 667, C: 667, D: 722, E: 611, F: 556, G: 722, H: 722, I: 333, J: 389, K: 722, L: 611, M: 889, N: 722, O: 722, P: 556, Q: 722, R: 667, S: 556, T: 611, U: 722, V: 722, W: 944, X: 722, Y: 722, Z: 611,
};

/** The phone's serif face is a little wider than the Times the website's PDF uses */
const DEVICE_SERIF_FACTOR = 1.1;

/**
 * Roughly how wide a serif text will print, in millimetres. Used to wrap paragraphs and to keep long
 * names inside their box; it errs on the wide side so nothing runs over a border.
 */
export function serifTextWidth(text: string, sizePt: number, bold = false): number {
  let units = 0;
  for (const ch of text) {
    const known = TIMES_WIDTHS[ch];
    if (known !== undefined) units += known;
    else if (ch >= "0" && ch <= "9") units += 500;
    // Bengali / Arabic and other non-Latin letters are wider than Latin ones
    else units += ch.charCodeAt(0) > 127 ? 620 : 500;
  }
  return (units / 1000) * sizePt * PT_TO_MM * (bold ? 1.05 : 1) * DEVICE_SERIF_FACTOR;
}

/** Splits a sentence into lines no wider than `maxWidth` millimetres (jsPDF's splitTextToSize) */
export function wrapSerifText(text: string, maxWidth: number, sizePt: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && serifTextWidth(candidate, sizePt) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

interface SvgTextOptions {
  /** Font size in points, as in the jsPDF code */
  size: number;
  font?: "times" | "helvetica";
  bold?: boolean;
  italic?: boolean;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  /** Squeeze the text into this many millimetres when it would be longer (long names) */
  maxWidth?: number;
  /** Centre the text vertically on y instead of sitting on the baseline */
  middle?: boolean;
  transform?: string;
  opacity?: number;
}

const FONT_FAMILY = {
  times: "'Times New Roman', Times, 'Noto Serif', serif",
  helvetica: "Helvetica, Arial, 'Noto Sans', sans-serif",
} as const;

/** One line of text at jsPDF coordinates (x, y in millimetres; y is the baseline) */
export function svgText(x: number, y: number, text: string, options: SvgTextOptions): string {
  const { size, font = "times", bold, italic, anchor = "start", fill = "#000", maxWidth, middle, transform, opacity } = options;
  const attrs = [
    `x="${n(x)}"`,
    `y="${n(y)}"`,
    `font-family="${FONT_FAMILY[font]}"`,
    `font-size="${n(size * PT_TO_MM)}"`,
    `text-anchor="${anchor}"`,
    `fill="${fill}"`,
    'xml:space="preserve"',
  ];
  if (bold) attrs.push('font-weight="bold"');
  if (italic) attrs.push('font-style="italic"');
  if (middle) attrs.push('dominant-baseline="central"');
  if (transform) attrs.push(`transform="${transform}"`);
  if (opacity !== undefined) attrs.push(`opacity="${opacity}"`);
  if (maxWidth && serifTextWidth(text, size, bold) > maxWidth) attrs.push(`textLength="${n(maxWidth)}"`, 'lengthAdjust="spacingAndGlyphs"');
  return `<text ${attrs.join(" ")}>${escapeHtml(text)}</text>`;
}

export function svgLine(x1: number, y1: number, x2: number, y2: number, stroke: string, width: number): string {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${width}"/>`;
}

export function svgCircle(cx: number, cy: number, r: number, style: { stroke?: string; width?: number; fill?: string }): string {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${style.fill ?? "none"}"${style.stroke ? ` stroke="${style.stroke}" stroke-width="${style.width ?? 0.3}"` : ""}/>`;
}

export function svgRect(x: number, y: number, w: number, h: number, style: { stroke?: string; width?: number; fill?: string; radius?: number }): string {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${style.radius ? ` rx="${style.radius}" ry="${style.radius}"` : ""} fill="${style.fill ?? "none"}"${style.stroke ? ` stroke="${style.stroke}" stroke-width="${style.width ?? 0.3}"` : ""}/>`;
}

interface PageImage {
  /** Site path, e.g. "/mainlogo.png" */
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}

interface PageOptions {
  title: string;
  /** Size of the drawing in millimetres (the jsPDF page size) */
  width: number;
  height: number;
  /** How much of the PDF page's width the drawing takes, in percent */
  widthPercent: number;
  /** Space above the drawing, in percent of the page width */
  topPercent?: number;
  images?: PageImage[];
  /** The SVG elements of the drawing */
  body: string;
}

/**
 * Wraps a drawing in a one-page HTML document. Images are ordinary <img> elements laid over the drawing
 * by percentage, so the page scales to whatever paper size the PDF is made at.
 */
export function buildPdfPage({ title, width, height, widthPercent, topPercent = 0, images = [], body }: PageOptions): string {
  const imgs = images
    .map((image) => {
      const style = [
        `left:${n((image.x / width) * 100)}%`,
        `top:${n((image.y / height) * 100)}%`,
        `width:${n((image.width / width) * 100)}%`,
        `height:${n((image.height / height) * 100)}%`,
        image.opacity !== undefined ? `opacity:${image.opacity}` : "",
      ]
        .filter(Boolean)
        .join(";");
      return `<img src="${escapeHtml(siteAsset(image.path))}" alt="" style="${style}" onerror="this.style.display='none'"/>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { position: relative; width: ${widthPercent}%; margin: ${topPercent}% auto 0; page-break-inside: avoid; }
  .sheet svg { display: block; width: 100%; height: auto; }
  .sheet img { position: absolute; display: block; }
</style>
</head>
<body>
<div class="sheet">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>
${imgs}
</div>
</body>
</html>`;
}
