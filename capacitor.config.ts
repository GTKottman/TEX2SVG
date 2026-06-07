import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.latextosvg.app",
  appName: "LaTeX to SVG",
  webDir: "dist-app",
  android: {
    allowMixedContent: false,
  },
};

export default config;
