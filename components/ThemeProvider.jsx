// components/ThemeProvider.jsx
"use client";

import { useEffect } from "react";
import { useBranding } from "@/lib/use-branding";

export default function ThemeProvider({ children }) {
  // useBranding already applyTheme call karta hai internally
  // Bas ek baar root pe mount karo — poori app cover ho jayegi
  useBranding();

  return <>{children}</>;
}