// app/layout.js
import ClientLayout from "@/components/ClientLayout";
import ThemeProvider from "@/components/ThemeProvider";
import Providers from "./providers";
import { Inter } from "next/font/google";
import { headers } from "next/headers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});


export const metadata = {
  title: "AcuityCX",
  description:
    "Connect out-of-the-box, customizable, AI-driven conversation intelligence from every interaction to drive automated QA and agent improvement workflows, whilst keeping customer experience at the heart of your contact center.",
};

// Inline script: runs before first paint — applies saved color + font from localStorage
const getBrandingScript = (nonce) => `
(function() {
  try {
    var rawCached = localStorage.getItem('acuitycx_cached_branding');
    var cached = rawCached ? JSON.parse(rawCached) : {};
    var rawOverrides = localStorage.getItem('brandingOverrides');
    var overrides = rawOverrides ? JSON.parse(rawOverrides) : {};
    
    var b = {};
    for (var k in cached) { b[k] = cached[k]; }
    for (var k in overrides) { b[k] = overrides[k]; }

    var brandPrimary    = b.primaryColor   || "#1A3A6E";
    var brandSecondary  = b.secondaryColor || "#20b2aa";
    var font            = b.fontFamily     || 'Inter';
    var mode            = (b.themeMode     || 'light').toLowerCase();

    // Toggle dark class immediately
    document.documentElement.classList.toggle('dark', mode === 'dark');

    // Load Google Font dynamically
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(font).replace(/%20/g, '+') + ':wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);

    // Helpers
    var adjustBrightness = function(hex, percent) {
      try {
        if (!hex || !hex.startsWith("#")) return hex;
        var num = parseInt(hex.slice(1), 16);
        var amt = Math.round(2.55 * percent);
        var R = (num >> 16) + amt;
        var G = ((num >> 8) & 0x00ff) + amt;
        var B = (num & 0x0000ff) + amt;
        R = Math.max(0, Math.min(255, R));
        G = Math.max(0, Math.min(255, G));
        B = Math.max(0, Math.min(255, B));
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
      } catch(e) { return hex; }
    };

    var hexToRgb = function(hex) {
      try {
        if (!hex || !hex.startsWith("#")) return "32, 178, 170";
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return r + ", " + g + ", " + b;
      } catch(e) { return "32, 178, 170"; }
    };

    var hexToHsl = function(hex) {
      try {
        var r = parseInt(hex.slice(1,3),16)/255;
        var g = parseInt(hex.slice(3,5),16)/255;
        var b = parseInt(hex.slice(5,7),16)/255;
        var max = Math.max(r,g,b), min = Math.min(r,g,b);
        var h, s, l = (max+min)/2;
        if (max === min) { h = s = 0; }
        else {
          var d = max - min;
          s = l > 0.5 ? d/(2-max-min) : d/(max+min);
          switch(max) {
            case r: h = ((g-b)/d + (g<b?6:0))/6; break;
            case g: h = ((b-r)/d + 2)/6; break;
            default: h = ((r-g)/d + 4)/6;
          }
        }
        return Math.round(h*360) + " " + Math.round(s*100) + "% " + Math.round(l*100) + "%";
      } catch(e) { return "204 72% 40%"; }
    };

    // Calculate dynamic values
    var primaryHsl = brandPrimary.startsWith("#") ? hexToHsl(brandPrimary) : "204 72% 40%";
    var secondaryRgb = hexToRgb(brandSecondary);
    var navyHover = adjustBrightness(brandPrimary, 10);
    var navyDeep  = adjustBrightness(brandPrimary, -15);
    var bodyFrom  = adjustBrightness(brandPrimary, 5);
    var bodyMid   = adjustBrightness(brandPrimary, -10);
    var bodyTo    = adjustBrightness(brandPrimary, -25);

    var tokens = {
      "--brand-primary":          brandPrimary,
      "--brand-secondary":        brandSecondary,
      "--brand-navy-hover":       navyHover,
      "--brand-navy-deep":        navyDeep,
      "--brand-teal-ring":        "rgba(" + secondaryRgb + ", 0.12)",
      "--brand-body-from":        bodyFrom,
      "--brand-body-mid":         bodyMid,
      "--brand-body-to":          bodyTo,
      "--brand-footer-bg":        navyDeep,
      "--brand-font":             font + ", sans-serif",
      "--primary":                primaryHsl,
      "--ring":                   primaryHsl
    };

    var css = "";
    for (var k in tokens) {
      css += k + ": " + tokens[k] + "; ";
    }

    var style = document.createElement('style');
    style.id = 'theme-vars-ssr';
    if ('${nonce}') style.setAttribute('nonce', '${nonce}');
    style.textContent = ':root:root { ' + css + ' } .dark:root { ' + css + ' }';
    document.head.appendChild(style);
  } catch(e) {}
})();
`;

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: getBrandingScript(nonce) }} />
      </head>
      <body>
        <ThemeProvider>
        <Providers><ClientLayout>{children}</ClientLayout></Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}