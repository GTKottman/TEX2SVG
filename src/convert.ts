import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import type { DOMAdaptor } from "mathjax-full/js/core/DOMAdaptor.js";

export type ConvertOptions = {
  display: boolean;
};

type MjState = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adaptor: DOMAdaptor<any, any, any>;
};

let mj: MjState | null = null;

function getMathJax(): MjState {
  if (mj) return mj;
  const adaptor = liteAdaptor() as MjState["adaptor"];
  RegisterHTMLHandler(adaptor);
  const tex = new TeX({ packages: AllPackages });
  const svg = new SVG({ fontCache: "local" });
  const doc = mathjax.document("<html><head></head><body></body></html>", {
    InputJax: tex,
    OutputJax: svg,
  });
  mj = { doc, adaptor };
  return mj;
}

/**
 * Strips common math delimiters so the inner TeX is passed to MathJax.
 * Display-style wrappers ($$, `\\[...\\]`) imply display when no CLI flag overrides.
 */
export function normalizeTeX(source: string): { tex: string; display: boolean } {
  const s = source.trim();
  if (s.startsWith("$$") && s.endsWith("$$") && s.length >= 4) {
    return {
      tex: s.slice(2, -2).trim(),
      display: true,
    };
  }
  if (s.startsWith("\\[") && s.endsWith("\\]") && s.length >= 4) {
    return {
      tex: s.slice(2, -2).trim(),
      display: true,
    };
  }
  if (s.startsWith("\\(") && s.endsWith("\\)") && s.length >= 4) {
    return {
      tex: s.slice(2, -2).trim(),
      display: false,
    };
  }
  if (s.startsWith("$") && s.endsWith("$") && s.length >= 2) {
    return {
      tex: s.slice(1, -1).trim(),
      display: false,
    };
  }
  return {
    tex: s,
    display: false,
  };
}

/**
 * `--display` on the CLI forces block math. Otherwise delimiters in the source decide.
 */
export function resolveDisplay(
  normalized: { display: boolean },
  cliWantsDisplay: boolean | undefined
): boolean {
  if (cliWantsDisplay) return true;
  return normalized.display;
}

/**
 * Renders TeX to a standalone root `<svg>` XML string.
 */
export function convertTeXToSvgString(tex: string, options: ConvertOptions): string {
  const { doc, adaptor } = getMathJax();
  const out = doc.convert(tex, { display: options.display, format: "TeX" });
  const svg = findFirstSvgNode(out, adaptor) ?? out;
  return adaptor.serializeXML(svg);
}

function findFirstSvgNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adaptor: DOMAdaptor<any, any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (node == null) return null;
  const k = String(adaptor.kind(node)).toLowerCase();
  if (k === "svg") {
    return node;
  }
  for (const c of adaptor.childNodes(node) ?? []) {
    const s = findFirstSvgNode(c, adaptor);
    if (s) return s;
  }
  return null;
}
