import "./style.css";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { convertTeXToSvgString, normalizeTeX, resolveDisplay } from "../../src/convert";

const EXAMPLES: { tex: string; label: string }[] = [
  { tex: String.raw`\frac{a}{b}`, label: "Fraction" },
  { tex: String.raw`\int_0^1 x\,dx`, label: "Integral" },
  { tex: String.raw`\sum_{i=1}^{n} i`, label: "Summation" },
  { tex: String.raw`\sqrt[n]{x}`, label: "Root" },
  { tex: String.raw`\sin^2 x + \cos^2 x = 1`, label: "Pythagorean identity" },
  { tex: String.raw`(a+b)^2 = a^2 + 2ab + b^2`, label: "Binomial square" },
  { tex: String.raw`\begin{pmatrix} a & b \\ c & d \end{pmatrix}`, label: "Matrix" },
];

const texInput = document.getElementById("tex-input") as HTMLTextAreaElement;
const displayMode = document.getElementById("display-mode") as HTMLInputElement;
const preview = document.getElementById("preview") as HTMLDivElement;
const errorEl = document.getElementById("error") as HTMLParagraphElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;
const examplesList = document.getElementById("examples") as HTMLUListElement;

let currentSvg = "";
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function setActionsEnabled(enabled: boolean): void {
  copyBtn.disabled = !enabled;
  saveBtn.disabled = !enabled;
}

function showError(message: string): void {
  errorEl.hidden = false;
  errorEl.textContent = message;
  preview.innerHTML =
    '<p class="preview-placeholder preview-placeholder--error">Could not render this expression.</p>';
  currentSvg = "";
  setActionsEnabled(false);
}

function clearError(): void {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function renderPreview(): void {
  const raw = texInput.value.trim();
  if (!raw) {
    clearError();
    preview.innerHTML =
      '<p class="preview-placeholder">Enter LaTeX above to see the SVG preview.</p>';
    currentSvg = "";
    setActionsEnabled(false);
    return;
  }

  try {
    const normalized = normalizeTeX(raw);
    const display = resolveDisplay(normalized, displayMode.checked || undefined);
    const tex = normalized.tex;
    if (!tex) {
      showError("Empty TeX after removing delimiters.");
      return;
    }
    const svg = convertTeXToSvgString(tex, { display });
    currentSvg = svg;
    clearError();
    preview.innerHTML = svg;
    setActionsEnabled(true);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showError(message);
  }
}

function scheduleRender(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(renderPreview, 200);
}

async function copySvg(): Promise<void> {
  if (!currentSvg) return;
  try {
    await navigator.clipboard.writeText(currentSvg);
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy SVG";
    }, 1500);
  } catch {
    showError("Could not copy to clipboard.");
  }
}

function defaultFilename(): string {
  const slug = texInput.value
    .trim()
    .slice(0, 24)
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug ? `${slug}.svg` : "math.svg";
}

async function saveSvg(): Promise<void> {
  if (!currentSvg) return;
  const filename = defaultFilename();

  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: filename,
        data: currentSvg,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      saveBtn.textContent = "Saved!";
      setTimeout(() => {
        saveBtn.textContent = "Save SVG";
      }, 1500);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showError(`Save failed: ${message}`);
      return;
    }
  }

  const blob = new Blob([currentSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function shareSvg(): Promise<void> {
  if (!currentSvg || !Capacitor.isNativePlatform()) return;
  try {
    await Share.share({
      title: "LaTeX SVG",
      text: currentSvg,
      dialogTitle: "Share SVG",
    });
  } catch {
    // User cancelled share; ignore.
  }
}

function populateExamples(): void {
  for (const example of EXAMPLES) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-btn";
    button.innerHTML = `<span class="example-label">${example.label}</span><code>${escapeHtml(example.tex)}</code>`;
    button.addEventListener("click", () => {
      texInput.value = example.tex;
      scheduleRender();
    });
    item.appendChild(button);
    examplesList.appendChild(item);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

texInput.addEventListener("input", scheduleRender);
displayMode.addEventListener("change", renderPreview);
copyBtn.addEventListener("click", () => void copySvg());
saveBtn.addEventListener("click", () => void saveSvg());
saveBtn.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  void shareSvg();
});
clearBtn.addEventListener("click", () => {
  texInput.value = "";
  displayMode.checked = false;
  renderPreview();
});

populateExamples();
renderPreview();
