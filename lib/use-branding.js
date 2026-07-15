"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BRANDING, parseBrandingText, sanitizeBranding } from "@/lib/branding";

// ── Full theme definitions ─────────────────────────────────────────
const THEMES = {
  default: {
    light: {
      "--background":            "0 0% 100%",
      "--foreground":            "222 47% 11%",
      "--card":                  "0 0% 100%",
      "--card-foreground":       "222 47% 11%",
      "--popover":               "0 0% 100%",
      "--popover-foreground":    "222 47% 11%",
      "--primary":               "204 72% 40%",    /* #20b2aa teal */
      "--primary-foreground":    "0 0% 100%",
      "--secondary":             "213 40% 93%",
      "--secondary-foreground":  "222 47% 11%",
      "--muted":                 "210 30% 95%",
      "--muted-foreground":      "215 16% 47%",
      "--accent":                "180 72% 38%",
      "--accent-foreground":     "0 0% 100%",
      "--destructive":           "0 84.2% 60.2%",
      "--destructive-foreground":"0 0% 98%",
      "--border":                "213 30% 88%",
      "--input":                 "213 30% 88%",
      "--ring":                  "204 72% 40%",
    },
    dark: {
      "--background":            "222 47% 4%",
      "--foreground":            "210 40% 98%",
      "--card":                  "222 47% 6%",
      "--card-foreground":       "210 40% 98%",
      "--popover":               "222 47% 4%",
      "--popover-foreground":    "210 40% 98%",
      "--primary":               "180 64% 44%",
      "--primary-foreground":    "222 47% 4%",
      "--secondary":             "222 30% 14%",
      "--secondary-foreground":  "210 40% 98%",
      "--muted":                 "222 30% 14%",
      "--muted-foreground":      "215 20% 65%",
      "--accent":                "180 64% 44%",
      "--accent-foreground":     "222 47% 4%",
      "--destructive":           "0 62.8% 30.6%",
      "--destructive-foreground":"0 0% 98%",
      "--border":                "222 30% 18%",
      "--input":                 "222 30% 18%",
      "--ring":                  "180 64% 44%",
    },
  },

  blue: {
    light: {
      "--background":            "0 0% 100%",
      "--foreground":            "222.2 84% 4.9%",
      "--card":                  "0 0% 100%",
      "--card-foreground":       "222.2 84% 4.9%",
      "--popover":               "0 0% 100%",
      "--popover-foreground":    "222.2 84% 4.9%",
      "--primary":               "217 91% 60%",
      "--primary-foreground":    "0 0% 100%",
      "--secondary":             "214 95% 93%",
      "--secondary-foreground":  "217 91% 30%",
      "--muted":                 "214 95% 93%",
      "--muted-foreground":      "215.4 16.3% 46.9%",
      "--accent":                "214 95% 93%",
      "--accent-foreground":     "217 91% 30%",
      "--destructive":           "0 84.2% 60.2%",
      "--destructive-foreground":"210 40% 98%",
      "--border":                "214 31.8% 88%",
      "--input":                 "214 31.8% 88%",
      "--ring":                  "217 91% 60%",
    },
    dark: {
      "--background":            "222 47% 8%",
      "--foreground":            "210 40% 98%",
      "--card":                  "222 47% 10%",
      "--card-foreground":       "210 40% 98%",
      "--popover":               "222 47% 8%",
      "--popover-foreground":    "210 40% 98%",
      "--primary":               "217 91% 60%",
      "--primary-foreground":    "222.2 47.4% 11.2%",
      "--secondary":             "217 32% 17%",
      "--secondary-foreground":  "210 40% 98%",
      "--muted":                 "217 32% 17%",
      "--muted-foreground":      "215 20% 65%",
      "--accent":                "217 32% 17%",
      "--accent-foreground":     "210 40% 98%",
      "--destructive":           "0 62.8% 30.6%",
      "--destructive-foreground":"210 40% 98%",
      "--border":                "217 32% 17%",
      "--input":                 "217 32% 17%",
      "--ring":                  "217 91% 60%",
    },
  },

  orange: {
    light: {
      "--background":            "0 0% 100%",
      "--foreground":            "20 14.3% 4.1%",
      "--card":                  "0 0% 100%",
      "--card-foreground":       "20 14.3% 4.1%",
      "--popover":               "0 0% 100%",
      "--popover-foreground":    "20 14.3% 4.1%",
      "--primary":               "24.6 95% 53.1%",
      "--primary-foreground":    "60 9.1% 97.8%",
      "--secondary":             "60 4.8% 95.9%",
      "--secondary-foreground":  "24 9.8% 10%",
      "--muted":                 "60 4.8% 95.9%",
      "--muted-foreground":      "25 5.3% 44.7%",
      "--accent":                "60 4.8% 95.9%",
      "--accent-foreground":     "24 9.8% 10%",
      "--destructive":           "0 84.2% 60.2%",
      "--destructive-foreground":"210 40% 98%",
      "--border":                "20 5.9% 90%",
      "--input":                 "20 5.9% 90%",
      "--ring":                  "24.6 95% 53.1%",
    },
    dark: {
      "--background":            "20 14.3% 4.1%",
      "--foreground":            "60 9.1% 97.8%",
      "--card":                  "20 14.3% 4.1%",
      "--card-foreground":       "60 9.1% 97.8%",
      "--popover":               "20 14.3% 4.1%",
      "--popover-foreground":    "60 9.1% 97.8%",
      "--primary":               "20.5 90.2% 48.2%",
      "--primary-foreground":    "60 9.1% 97.8%",
      "--secondary":             "12 6.5% 15.1%",
      "--secondary-foreground":  "60 9.1% 97.8%",
      "--muted":                 "12 6.5% 15.1%",
      "--muted-foreground":      "24 5.4% 63.9%",
      "--accent":                "12 6.5% 15.1%",
      "--accent-foreground":     "60 9.1% 97.8%",
      "--destructive":           "0 72.2% 50.6%",
      "--destructive-foreground":"60 9.1% 97.8%",
      "--border":                "12 6.5% 15.1%",
      "--input":                 "12 6.5% 15.1%",
      "--ring":                  "20.5 90.2% 48.2%",
    },
  },

  red: {
    light: {
      "--background":            "0 0% 100%",
      "--foreground":            "0 0% 3.9%",
      "--card":                  "0 0% 100%",
      "--card-foreground":       "0 0% 3.9%",
      "--popover":               "0 0% 100%",
      "--popover-foreground":    "0 0% 3.9%",
      "--primary":               "0 84.2% 60.2%",
      "--primary-foreground":    "0 0% 98%",
      "--secondary":             "0 0% 96.1%",
      "--secondary-foreground":  "0 0% 9%",
      "--muted":                 "0 0% 96.1%",
      "--muted-foreground":      "0 0% 45.1%",
      "--accent":                "0 0% 96.1%",
      "--accent-foreground":     "0 0% 9%",
      "--destructive":           "0 84.2% 60.2%",
      "--destructive-foreground":"0 0% 98%",
      "--border":                "0 0% 89.8%",
      "--input":                 "0 0% 89.8%",
      "--ring":                  "0 84.2% 60.2%",
    },
    dark: {
      "--background":            "0 0% 3.9%",
      "--foreground":            "0 0% 98%",
      "--card":                  "0 0% 3.9%",
      "--card-foreground":       "0 0% 98%",
      "--popover":               "0 0% 3.9%",
      "--popover-foreground":    "0 0% 98%",
      "--primary":               "0 84.2% 60.2%",
      "--primary-foreground":    "0 0% 98%",
      "--secondary":             "0 0% 14.9%",
      "--secondary-foreground":  "0 0% 98%",
      "--muted":                 "0 0% 14.9%",
      "--muted-foreground":      "0 0% 63.9%",
      "--accent":                "0 0% 14.9%",
      "--accent-foreground":     "0 0% 98%",
      "--destructive":           "0 62.8% 30.6%",
      "--destructive-foreground":"0 0% 98%",
      "--border":                "0 0% 14.9%",
      "--input":                 "0 0% 14.9%",
      "--ring":                  "0 84.2% 60.2%",
    },
  },

  yellow: {
    light: { "--background": "48 100% 98%", "--foreground": "30 15% 10%", "--card": "0 0% 100%", "--card-foreground": "30 15% 10%", "--popover": "0 0% 100%", "--popover-foreground": "30 15% 10%", "--primary": "45 93% 47%", "--primary-foreground": "0 0% 10%", "--secondary": "47 100% 92%", "--secondary-foreground": "35 45% 18%", "--muted": "47 100% 92%", "--muted-foreground": "35 16% 40%", "--accent": "47 100% 92%", "--accent-foreground": "35 45% 18%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%", "--border": "45 45% 85%", "--input": "45 45% 85%", "--ring": "45 93% 47%" },
    dark: { "--background": "30 12% 9%", "--foreground": "45 90% 95%", "--card": "30 12% 11%", "--card-foreground": "45 90% 95%", "--popover": "30 12% 9%", "--popover-foreground": "45 90% 95%", "--primary": "45 93% 57%", "--primary-foreground": "30 15% 10%", "--secondary": "32 20% 18%", "--secondary-foreground": "45 90% 95%", "--muted": "32 20% 18%", "--muted-foreground": "40 20% 70%", "--accent": "32 20% 18%", "--accent-foreground": "45 90% 95%", "--destructive": "0 63% 31%", "--destructive-foreground": "0 0% 98%", "--border": "32 20% 18%", "--input": "32 20% 18%", "--ring": "45 93% 57%" },
  },

  green: {
    light: { "--background": "120 33% 98%", "--foreground": "145 35% 10%", "--card": "0 0% 100%", "--card-foreground": "145 35% 10%", "--popover": "0 0% 100%", "--popover-foreground": "145 35% 10%", "--primary": "142 71% 45%", "--primary-foreground": "0 0% 100%", "--secondary": "138 56% 92%", "--secondary-foreground": "145 45% 20%", "--muted": "138 56% 92%", "--muted-foreground": "145 16% 40%", "--accent": "138 56% 92%", "--accent-foreground": "145 45% 20%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%", "--border": "142 30% 84%", "--input": "142 30% 84%", "--ring": "142 71% 45%" },
    dark: { "--background": "145 25% 9%", "--foreground": "140 30% 95%", "--card": "145 25% 11%", "--card-foreground": "140 30% 95%", "--popover": "145 25% 9%", "--popover-foreground": "140 30% 95%", "--primary": "142 71% 50%", "--primary-foreground": "145 25% 9%", "--secondary": "145 20% 18%", "--secondary-foreground": "140 30% 95%", "--muted": "145 20% 18%", "--muted-foreground": "145 15% 68%", "--accent": "145 20% 18%", "--accent-foreground": "140 30% 95%", "--destructive": "0 63% 31%", "--destructive-foreground": "0 0% 98%", "--border": "145 20% 18%", "--input": "145 20% 18%", "--ring": "142 71% 50%" },
  },

  teal: {
    light: { "--background": "180 30% 98%", "--foreground": "190 40% 10%", "--card": "0 0% 100%", "--card-foreground": "190 40% 10%", "--popover": "0 0% 100%", "--popover-foreground": "190 40% 10%", "--primary": "174 84% 40%", "--primary-foreground": "0 0% 100%", "--secondary": "180 45% 92%", "--secondary-foreground": "185 45% 18%", "--muted": "180 45% 92%", "--muted-foreground": "190 15% 42%", "--accent": "180 45% 92%", "--accent-foreground": "185 45% 18%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%", "--border": "182 30% 84%", "--input": "182 30% 84%", "--ring": "174 84% 40%" },
    dark: { "--background": "188 30% 9%", "--foreground": "185 30% 95%", "--card": "188 30% 11%", "--card-foreground": "185 30% 95%", "--popover": "188 30% 9%", "--popover-foreground": "185 30% 95%", "--primary": "174 84% 45%", "--primary-foreground": "188 30% 9%", "--secondary": "188 20% 18%", "--secondary-foreground": "185 30% 95%", "--muted": "188 20% 18%", "--muted-foreground": "185 16% 68%", "--accent": "188 20% 18%", "--accent-foreground": "185 30% 95%", "--destructive": "0 63% 31%", "--destructive-foreground": "0 0% 98%", "--border": "188 20% 18%", "--input": "188 20% 18%", "--ring": "174 84% 45%" },
  },

  cyan: {
    light: { "--background": "195 100% 98%", "--foreground": "200 40% 10%", "--card": "0 0% 100%", "--card-foreground": "200 40% 10%", "--popover": "0 0% 100%", "--popover-foreground": "200 40% 10%", "--primary": "190 95% 42%", "--primary-foreground": "0 0% 100%", "--secondary": "195 85% 92%", "--secondary-foreground": "200 45% 18%", "--muted": "195 85% 92%", "--muted-foreground": "200 16% 42%", "--accent": "195 85% 92%", "--accent-foreground": "200 45% 18%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%", "--border": "195 45% 84%", "--input": "195 45% 84%", "--ring": "190 95% 42%" },
    dark: { "--background": "202 34% 9%", "--foreground": "195 35% 95%", "--card": "202 34% 11%", "--card-foreground": "195 35% 95%", "--popover": "202 34% 9%", "--popover-foreground": "195 35% 95%", "--primary": "190 95% 46%", "--primary-foreground": "202 34% 9%", "--secondary": "202 22% 18%", "--secondary-foreground": "195 35% 95%", "--muted": "202 22% 18%", "--muted-foreground": "195 16% 68%", "--accent": "202 22% 18%", "--accent-foreground": "195 35% 95%", "--destructive": "0 63% 31%", "--destructive-foreground": "0 0% 98%", "--border": "202 22% 18%", "--input": "202 22% 18%", "--ring": "190 95% 46%" },
  },

  indigo: {
    light: { "--background": "235 70% 98%", "--foreground": "236 30% 12%", "--card": "0 0% 100%", "--card-foreground": "236 30% 12%", "--popover": "0 0% 100%", "--popover-foreground": "236 30% 12%", "--primary": "239 84% 64%", "--primary-foreground": "0 0% 100%", "--secondary": "238 68% 94%", "--secondary-foreground": "236 40% 20%", "--muted": "238 68% 94%", "--muted-foreground": "236 16% 42%", "--accent": "238 68% 94%", "--accent-foreground": "236 40% 20%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%", "--border": "238 35% 86%", "--input": "238 35% 86%", "--ring": "239 84% 64%" },
    dark: { "--background": "238 30% 10%", "--foreground": "236 35% 95%", "--card": "238 30% 12%", "--card-foreground": "236 35% 95%", "--popover": "238 30% 10%", "--popover-foreground": "236 35% 95%", "--primary": "239 84% 70%", "--primary-foreground": "238 30% 10%", "--secondary": "238 20% 19%", "--secondary-foreground": "236 35% 95%", "--muted": "238 20% 19%", "--muted-foreground": "236 16% 68%", "--accent": "238 20% 19%", "--accent-foreground": "236 35% 95%", "--destructive": "0 63% 31%", "--destructive-foreground": "0 0% 98%", "--border": "238 20% 19%", "--input": "238 20% 19%", "--ring": "239 84% 70%" },
  },

  violet: {
    light: { "--background": "265 100% 98%", "--foreground": "270 28% 12%", "--card": "0 0% 100%", "--card-foreground": "270 28% 12%", "--popover": "0 0% 100%", "--popover-foreground": "270 28% 12%", "--primary": "270 91% 65%", "--primary-foreground": "0 0% 100%", "--secondary": "268 80% 94%", "--secondary-foreground": "270 42% 20%", "--muted": "268 80% 94%", "--muted-foreground": "270 15% 44%", "--accent": "268 80% 94%", "--accent-foreground": "270 42% 20%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%", "--border": "268 36% 86%", "--input": "268 36% 86%", "--ring": "270 91% 65%" },
    dark: { "--background": "270 30% 10%", "--foreground": "270 35% 95%", "--card": "270 30% 12%", "--card-foreground": "270 35% 95%", "--popover": "270 30% 10%", "--popover-foreground": "270 35% 95%", "--primary": "270 91% 70%", "--primary-foreground": "270 30% 10%", "--secondary": "270 20% 19%", "--secondary-foreground": "270 35% 95%", "--muted": "270 20% 19%", "--muted-foreground": "270 16% 68%", "--accent": "270 20% 19%", "--accent-foreground": "270 35% 95%", "--destructive": "0 63% 31%", "--destructive-foreground": "0 0% 98%", "--border": "270 20% 19%", "--input": "270 20% 19%", "--ring": "270 91% 70%" },
  },

  pink: {
    light: { "--background": "330 100% 98%", "--foreground": "330 28% 12%", "--card": "0 0% 100%", "--card-foreground": "330 28% 12%", "--popover": "0 0% 100%", "--popover-foreground": "330 28% 12%", "--primary": "330 85% 60%", "--primary-foreground": "0 0% 100%", "--secondary": "330 70% 94%", "--secondary-foreground": "330 42% 20%", "--muted": "330 70% 94%", "--muted-foreground": "330 15% 44%", "--accent": "330 70% 94%", "--accent-foreground": "330 42% 20%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%", "--border": "330 36% 86%", "--input": "330 36% 86%", "--ring": "330 85% 60%" },
    dark: { "--background": "330 30% 10%", "--foreground": "330 35% 95%", "--card": "330 30% 12%", "--card-foreground": "330 35% 95%", "--popover": "330 30% 10%", "--popover-foreground": "330 35% 95%", "--primary": "330 85% 66%", "--primary-foreground": "330 30% 10%", "--secondary": "330 20% 19%", "--secondary-foreground": "330 35% 95%", "--muted": "330 20% 19%", "--muted-foreground": "330 16% 68%", "--accent": "330 20% 19%", "--accent-foreground": "330 35% 95%", "--destructive": "0 63% 31%", "--destructive-foreground": "0 0% 98%", "--border": "330 20% 19%", "--input": "330 20% 19%", "--ring": "330 85% 66%" },
  },
};

function injectBrandTokens(branding) {
  const root = document.documentElement;

  // Core brand colors (always from AcuityCX config)
  const brandPrimary    = branding.primaryColor   || "#1A3A6E";
  const brandSecondary  = branding.secondaryColor || "#20b2aa";

  // Helper to adjust hex color brightness (lighten or darken)
  const adjustBrightness = (hex, percent) => {
    try {
      if (!hex || !hex.startsWith("#")) return hex;
      let num = parseInt(hex.slice(1), 16);
      let amt = Math.round(2.55 * percent);
      let R = (num >> 16) + amt;
      let G = ((num >> 8) & 0x00ff) + amt;
      let B = (num & 0x0000ff) + amt;
      R = Math.max(0, Math.min(255, R));
      G = Math.max(0, Math.min(255, G));
      B = Math.max(0, Math.min(255, B));
      return (
        "#" +
        (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
      );
    } catch {
      return hex;
    }
  };

  // Helper to convert hex to RGB values
  const hexToRgb = (hex) => {
    try {
      if (!hex || !hex.startsWith("#")) return "32, 178, 170";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    } catch {
      return "32, 178, 170";
    }
  };

  const secondaryRgb = hexToRgb(brandSecondary);

  // Derive hover, deep, and body gradient shades dynamically from the primary color
  const navyHover = adjustBrightness(brandPrimary, 10);   // slightly lighter for hover
  const navyDeep  = adjustBrightness(brandPrimary, -15);  // slightly darker for deep areas/buttons
  const bodyFrom  = adjustBrightness(brandPrimary, 5);    // login background top-left gradient
  const bodyMid   = adjustBrightness(brandPrimary, -10);   // login background middle gradient
  const bodyTo    = adjustBrightness(brandPrimary, -25);   // login background bottom-right gradient

  const tokens = {
    "--brand-primary":          brandPrimary,
    "--brand-secondary":        brandSecondary,
    "--brand-navy-hover":       navyHover,
    "--brand-navy-deep":        navyDeep,
    "--brand-teal-ring":        `rgba(${secondaryRgb}, 0.12)`,
    "--brand-body-from":        bodyFrom,
    "--brand-body-mid":         bodyMid,
    "--brand-body-to":          bodyTo,
    "--brand-card-bg":          "rgba(255, 255, 255, 0.97)",
    "--brand-input-border":     "#d1d9e6",
    "--brand-input-bg":         "#fafbfc",
    "--brand-input-text":       "#1a2744",
    "--brand-placeholder":      "#a0aec0",
    "--brand-label":            "#374151",
    "--brand-tab-bg":           "#f0f4f8",
    "--brand-tab-active-text":  brandPrimary,
    "--brand-tab-inactive-text":"#6b7a90",
    "--brand-error-bg":         "#fff0f0",
    "--brand-error-border":     "#ffcdd2",
    "--brand-error-text":       "#c62828",
    "--brand-sso-bg":           "#f0f9ff",
    "--brand-sso-border":       "#b8e4ef",
    "--brand-sso-text":         "#2d6a8a",
    "--brand-sso-heading":      "#1a5276",
    "--brand-footer-bg":        navyDeep,
    "--brand-footer-border":    "rgba(255, 255, 255, 0.07)",
    "--brand-footer-link":      "#8a9ab8",
    "--brand-footer-link-hover":brandSecondary,
    "--brand-footer-sep":       "#3a4a65",
    "--brand-footer-copy":      "#5a6b88",
    "--brand-dot-teal-1":       `rgba(${secondaryRgb}, 0.15)`,
    "--brand-dot-teal-2":       `rgba(${secondaryRgb}, 0.12)`,
  };

  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

// ── Theme CSS injector ────────────────────────────────────────────
function applyTheme(branding) {
  const preset    = (branding.themePreset || "default").toLowerCase();
  const mode      = (branding.themeMode   || "light").toLowerCase();
  const themeSet  = THEMES[preset]  || THEMES.default;
  const variables = themeSet[mode]  || themeSet.light;

  // 1. dark class on <html>
  document.documentElement.classList.toggle("dark", mode === "dark");

  // 2. Hex → HSL converter (for --primary / --ring)
  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h = ((g-b)/d + (g<b?6:0))/6; break;
        case g: h = ((b-r)/d + 2)/6; break;
        default: h = ((r-g)/d + 4)/6;
      }
    }
    return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
  };

  // 3. Use teal (#20b2aa) as the primary interactive color by default
  //    — overridden by user's primaryColor only if it differs from navy default
  const primaryHex = branding.primaryColor || "#20b2aa";
  const primaryHsl = primaryHex.startsWith("#") && primaryHex.length >= 7
    ? hexToHsl(primaryHex)
    : variables["--primary"];

  // 4. Build CSS overrides
  const overrides  = { ...variables, "--primary": primaryHsl, "--ring": primaryHsl };
  const cssVars    = Object.entries(overrides).map(([k,v]) => `  ${k}: ${v};`).join("\n");

  const brandVars = `
  --brand-primary: ${branding.primaryColor || "#0D2244"};
  --brand-secondary: ${branding.secondaryColor || "#20b2aa"};
  --brand-font: ${branding.fontFamily || "Inter"}, sans-serif;
`;

  // 5. Load Google Font
  const fontName   = branding.fontFamily || "Inter";
  const fontLinkId = "brand-font-link";
  let fontLink = document.getElementById(fontLinkId);
  if (!fontLink) {
    fontLink = document.createElement("link");
    fontLink.id  = fontLinkId;
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
  }
  fontLink.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap`;

  const css = `:root {\n${cssVars}\n${brandVars}\n}\n.dark {\n${cssVars}\n${brandVars}\n}`;

  // 6. Inject / update <style id="theme-vars">
  let styleEl = document.getElementById("theme-vars");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "theme-vars";
    document.head.appendChild(styleEl);
  } else {
    document.head.appendChild(styleEl); // move to end to ensure override
  }
  styleEl.textContent = css;

  // 7. Inject all AcuityCX brand tokens as inline CSS vars on :root
  injectBrandTokens(branding);

  // 8. Page title
  if (branding.appName) document.title = branding.appName;
}

// ── Hook ──────────────────────────────────────────────────────────
export function useBranding() {
  const [branding, setBranding] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("acuitycx_cached_branding");
        if (cached) {
          const base = JSON.parse(cached);
          let overrides = {};
          try {
            const raw = localStorage.getItem("brandingOverrides");
            if (raw) overrides = JSON.parse(raw);
          } catch {}
          return { ...base, ...overrides };
        }
      } catch (e) {}
    }
    return DEFAULT_BRANDING;
  });

  useEffect(() => {
    let mounted = true;

    const loadBranding = async () => {
      let baseBranding = DEFAULT_BRANDING;
      try {
        const res = await fetch("/white-label.txt", { cache: "no-store" });
        if (res.ok) {
          const txt = await res.text();
          baseBranding = parseBrandingText(txt);
          try {
            localStorage.setItem("acuitycx_cached_branding", JSON.stringify(baseBranding));
          } catch {}
        }
      } catch {
        // keep defaults if file missing
      }

      let overrides = {};
      try {
        const raw = localStorage.getItem("brandingOverrides");
        if (raw) {
          const parsed = JSON.parse(raw);
          overrides = {
            themeMode:      parsed.themeMode,
            themePreset:    parsed.themePreset,
            primaryColor:   parsed.primaryColor,
            secondaryColor: parsed.secondaryColor,
            fontFamily:     parsed.fontFamily,
          };
        }
      } catch {
        overrides = {};
      }

      if (mounted) {
        setBranding(sanitizeBranding({ ...baseBranding, ...overrides }));
      }
    };

    loadBranding();

    const handler = () => loadBranding();
    window.addEventListener("branding:update", handler);
    window.addEventListener("storage", handler);

    return () => {
      mounted = false;
      window.removeEventListener("branding:update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    applyTheme(branding);
  }, [branding]);

  return branding;
}
