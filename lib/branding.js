export const DEFAULT_BRANDING = {
  appName: "AcuityCX",
  appTagline: "Excellence in Process",
  logoUrl: "",
  primaryColor: "#1A3A6E",
 secondaryColor: "#20b2aa",
  themeMode: "light",
  themePreset: "default",
  fontFamily: "Inter",
};

export const ALLOWED_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Poppins",
  "Nunito",
  "Montserrat",
  "Source Sans Pro",
  "Raleway",
  "Ubuntu",
];

const ALLOWED_MODES = new Set(["light", "dark"]);
const ALLOWED_PRESETS = new Set([
  "default",
  "blue",
  "orange",
  "red",
  "yellow",
  "green",
  "teal",
  "cyan",
  "indigo",
  "violet",
  "pink",
]);

function normalizeThemeMode(mode) {
  const safeMode = (mode || "").toLowerCase();
  return ALLOWED_MODES.has(safeMode) ? safeMode : DEFAULT_BRANDING.themeMode;
}

function normalizeThemePreset(preset) {
  const safePreset = (preset || "").toLowerCase();
  return ALLOWED_PRESETS.has(safePreset)
    ? safePreset
    : DEFAULT_BRANDING.themePreset;
}

function resolveTheme(map) {
  const legacyMode = normalizeThemeMode(map.THEME_MODE);
  const legacyPreset = normalizeThemePreset(map.THEME_PRESET);
  const singleTheme = (map.THEME || "").toLowerCase().trim();

  if (!singleTheme) {
    return { themeMode: legacyMode, themePreset: legacyPreset };
  }

  if (ALLOWED_MODES.has(singleTheme)) {
    return { themeMode: singleTheme, themePreset: "default" };
  }

  if (ALLOWED_PRESETS.has(singleTheme)) {
    return { themeMode: legacyMode, themePreset: singleTheme };
  }

  return { themeMode: legacyMode, themePreset: legacyPreset };
}

export function parseBrandingText(text = "") {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const map = {};
  for (const row of rows) {
    const idx = row.indexOf("=");
    if (idx <= 0) continue;
    const key = row.slice(0, idx).trim();
    const value = row.slice(idx + 1).trim();
    map[key] = value;
  }

  const { themeMode, themePreset } = resolveTheme(map);

  return {
    appName: map.APP_NAME || DEFAULT_BRANDING.appName,
    appTagline: map.APP_TAGLINE || DEFAULT_BRANDING.appTagline,
    logoUrl: map.LOGO_URL || DEFAULT_BRANDING.logoUrl,
    primaryColor: map.PRIMARY_COLOR || DEFAULT_BRANDING.primaryColor,
    secondaryColor: map.SECONDARY_COLOR || DEFAULT_BRANDING.secondaryColor,
    fontFamily: map.FONT_FAMILY || DEFAULT_BRANDING.fontFamily,
    themeMode,
    themePreset,
  };
}

export function getBranding() {
  return { ...DEFAULT_BRANDING };
}

export function sanitizeBranding(overrides = {}) {
  const next = {
    ...DEFAULT_BRANDING,
    ...overrides,
  };

  return {
    ...next,
    themeMode: normalizeThemeMode(next.themeMode),
    themePreset: normalizeThemePreset(next.themePreset),
  };
}
