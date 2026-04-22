# latex-math-to-svg

Command-line tool that converts **TeX or LaTeX-style math** to a **standalone vector SVG** using [MathJax 3](https://www.mathjax.org/) (no local TeX install).

## Requirements

- [Node.js](https://nodejs.org/) 18 or later

## Install

```bash
cd "path/to/Latex to vector"
npm install
npm run build
```

## Usage

```text
latextosvg [options] [tex] [outfile]
```

- **`[tex]`** — math source. You can use plain TeX, or wrap with `$...$`, `$$...$$`, `\\(...\\)`, or `\\[...\\]`.
- **`-i, --input <file>`** — read the expression from a UTF-8 file (one expression per run). With this flag, the only optional positional is the **output file** (or use **`-o`**).
- **`-o, --output <file>`** — write SVG to a file. If omitted, the SVG is printed to **stdout** (good for piping), unless you pass a second positional (see below).
- **`-d, --display`** — force **display (block) math** (like `\\[...\\]`). If you do not use this flag, `$$` and `\\[...\\]` in the input still select display math.

**Two-argument form** (no **`-o`**): `latextosvg "…math…" out.svg` writes to `out.svg` and does not print the SVG to the console.

If you omit both `[tex]` and `--input`, provide input on **stdin** (for example a pipe from another program).

## Fractions vs. slash

In TeX, **`1/a` is not a fraction** with a horizontal bar. It is normal text with a slash operator, like in plain algebra on one line.

For a **stacked fraction** (numerator over denominator), use `\frac`:

- Wrong for a vertical fraction: `a(1/a)=1`
- Right: `a\left(\frac{1}{a}\right)=1`

Inside inline math, `\frac` is drawn smaller. For a **full-size** fraction in the middle of a line, use `\dfrac{1}{a}` (needs the AMS package, which this tool loads).

For a bit of space before a parenthetical condition, you can use `\,` (thin space), for example `=1\,(a\neq 0)`.

## Examples (PowerShell)

```powershell
node dist/cli.js "x^2" -o out.svg
node dist/cli.js "x^2" out.svg
node dist/cli.js --display "\int_0^1 x\,dx" -o int.svg
node dist/cli.js -i math.txt -o out.svg
node dist/cli.js -i math.txt out.svg
"$\frac{a}{b}$" | node dist/cli.js -o fraction.svg
```

## Examples (bash)

```bash
node dist/cli.js 'x^2' -o out.svg
node dist/cli.js 'x^2' out.svg
node dist/cli.js --display '\int_0^1 x\,dx' -o int.svg
echo 'x^2' | node dist/cli.js
```

## Global `latextosvg` (optional)

```bash
npm link
```

Then you can run `latextosvg` from your PATH (after `npm run build`).

## Limitations

- This is **MathJax math**, not a full TeX or LaTeX engine. It does not run full documents (`\\documentclass`, arbitrary packages, TikZ, and so on).
- Unsupported or invalid TeX is often shown as a MathJax **error box** inside the SVG, not as a process failure with a non-zero exit code.
- The SVG uses **fonts embedded as paths** where MathJax’s SVG output does, so the file is self-contained in typical cases.

## License

MIT. MathJax is licensed under Apache-2.0; see the [mathjax-full](https://www.npmjs.com/package/mathjax-full) package.
