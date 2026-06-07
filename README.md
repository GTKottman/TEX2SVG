Turn TeX or LaTeX-style math into standalone SVG files with Node and MathJax. No local TeX install.

## Android app

This repo includes a Capacitor Android app (`LaTeX to SVG`) that uses the same MathJax conversion logic as the CLI.

### Download the APK

Grab the prebuilt debug APK from the repo:

[releases/latex-to-svg.apk](releases/latex-to-svg.apk)

On GitHub, open that file and tap **Download** (or use the **Raw** button).

### Build the APK yourself

Requirements: Node.js 18+, Java 17+, Android SDK (with `platform-tools`, `platforms;android-34`, and `build-tools;34.0.0`).

```bash
npm install
npm run android:apk
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

### Install on your phone

1. Copy `latex-to-svg.apk` to your Android device (USB, cloud drive, email, etc.).
2. Open the file on your phone and allow installation from unknown sources if prompted.
3. Launch **LaTeX to SVG**, type a math expression, preview the SVG, then tap **Save SVG** to store it in Documents.

The app works fully offline after install.

## CLI

```bash
npm install && npm run build
npx latextosvg "x^2" -o out.svg
npx latextosvg --help
```
