#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { stdin, stdout, stderr, exit } from "node:process";
import { Command } from "commander";
import { convertTeXToSvgString, normalizeTeX, resolveDisplay } from "./convert.js";

const BATCH_SEP = "@@";

/** `@@` separates TeX from the output path (commas and `@` in math stay unambiguous). */
function parseBatchLine(line: string): { tex: string; outPath: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const idx = trimmed.indexOf(BATCH_SEP);
  if (idx === -1) {
    throw new Error(`Batch line has no ${BATCH_SEP} (use TeX${BATCH_SEP}outputName): ${trimmed}`);
  }
  const tex = trimmed.slice(0, idx).trim();
  const outPath = trimmed.slice(idx + BATCH_SEP.length).trim();
  if (!tex || !outPath) {
    throw new Error(`Invalid batch line (empty TeX or output name): ${trimmed}`);
  }
  return { tex, outPath };
}

function ensureSvgFilename(path: string): string {
  if (path.toLowerCase().endsWith(".svg")) {
    return path;
  }
  return `${path}.svg`;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stdin.on("data", (c) => chunks.push(c as Buffer));
    stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stdin.on("error", reject);
  });
}

async function readInput(
  file: string | undefined,
  positional: string | undefined
): Promise<string> {
  if (file) {
    return (await readFile(file, "utf8")).replace(/^\uFEFF/, "");
  }
  if (positional !== undefined) {
    return positional;
  }
  if (stdin.isTTY) {
    throw new Error("Provide a TeX string, or --input, or pipe TeX on stdin.");
  }
  return (await readStdin()).replace(/^\uFEFF/, "");
}

const program = new Command();
program
  .name("latextosvg")
  .description("Convert a LaTeX math string to a standalone vector SVG (MathJax 3).")
  .option(
    "-i, --input <file>",
    "read math from a UTF-8 file (one expression; $, $$, etc. are optional)"
  )
  .option(
    "-b, --batch <file>",
    "UTF-8 manifest: each non-empty line is TeX@@outputName (# comments; .svg added if missing)"
  )
  .option("-o, --output <file>", "write SVG to this file (default: print to stdout)")
  .option("-d, --display", "use display (block) math, like \\[ ... \\]")
  .helpOption("-h, --help", "show help")
  .addHelpText(
    "after",
    `
Examples:
  npx latextosvg "x^2" -o out.svg
  npx latextosvg "x^2" out.svg
  npx latextosvg --display "\\\\int_0^1 x\\\\,dx" -o int.svg
  npx latextosvg -i math.tex -o out.svg
  npx latextosvg --batch manifest.txt
  "\\\\frac{a}{b}" | npx latextosvg -o f.svg
`
  )
  .argument("[tex]", "TeX; omit with -i or stdin. With -i, omit this; the next arg is the outfile only")
  .argument(
    "[outfile]",
    "write SVG here (or use -o, which wins). With -i, only this positional is allowed (the output path)"
  )
  .parse();

const o = program.opts<{
  input?: string;
  batch?: string;
  output?: string;
  display?: boolean;
}>();
const [arg0, arg1, ...rest] = program.args;

if (rest.length > 0) {
  stderr.write(`Too many arguments. Use at most [tex] [outfile], or with -i use [outfile] only. Extra: ${rest.join(" ")}\n`, "utf8");
  exit(1);
}

if (!o.input && !o.batch && arg0 === undefined && stdin.isTTY) {
  program.outputHelp();
  exit(1);
}

if (o.input && arg0 !== undefined && arg1 !== undefined) {
  stderr.write("With --input, use at most one argument: the output file (or use -o).\n", "utf8");
  exit(1);
}

if (o.batch && o.input) {
  stderr.write("Use either --batch or --input, not both.\n", "utf8");
  exit(1);
}

if (o.batch && (o.output !== undefined || arg0 !== undefined || arg1 !== undefined)) {
  stderr.write(
    "With --batch, output paths come from each line only; omit --output and positional arguments.\n",
    "utf8"
  );
  exit(1);
}

async function run(): Promise<void> {
  if (o.batch) {
    const body = (await readFile(o.batch, "utf8")).replace(/^\uFEFF/, "");
    const lines = body.split(/\r?\n/);
    let n = 0;
    for (const line of lines) {
      const parsed = parseBatchLine(line);
      if (!parsed) {
        continue;
      }
      const outFile = ensureSvgFilename(parsed.outPath);
      const norm = normalizeTeX(parsed.tex);
      const display = resolveDisplay(norm, o.display);
      const t = norm.tex;
      if (!t) {
        throw new Error(`Empty TeX after removing delimiters (output would be ${outFile}).`);
      }
      const svg = convertTeXToSvgString(t, { display });
      await writeFile(outFile, svg, "utf8");
      n += 1;
      stderr.write(`${outFile}\n`, "utf8");
    }
    if (n === 0) {
      throw new Error("Batch file produced no SVGs (empty or only comments/blank lines).");
    }
    return;
  }

  let raw: string;
  let outFile: string | undefined;

  if (o.input) {
    raw = (await readFile(o.input, "utf8")).replace(/^\uFEFF/, "");
    outFile = o.output ?? arg0;
  } else {
    raw = await readInput(undefined, arg0);
    outFile = o.output ?? arg1;
  }

  if (!raw.trim()) {
    throw new Error("Empty input.");
  }
  const n = normalizeTeX(raw);
  const display = resolveDisplay(n, o.display);
  const t = n.tex;
  if (!t) {
    throw new Error("Empty TeX after removing delimiters.");
  }
  const svg = convertTeXToSvgString(t, { display });
  if (outFile) {
    await writeFile(outFile, svg, "utf8");
  } else {
    stdout.write(svg, "utf8");
  }
}

void run().catch((err: unknown) => {
  const m = err instanceof Error ? err.message : String(err);
  stderr.write(`${m}\n`, "utf8");
  exit(1);
});
