"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import MobileNotSupported from "@/components/mobile-not-supported";

export default function ScreenSizeGuard({ children }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Track last non-mobile page
    try {
      if (!pathname.includes("mobile-not-supported")) {
        sessionStorage.setItem("lastNonMobilePage", pathname);
      }
    } catch (err) {
      console.warn("[ScreenSizeGuard] sessionStorage access failed:", err);
    }

    const checkScreen = () => {
      const width = window.innerWidth;

      if (width < 565) {
        setIsMobile(true);
        setAllowed(false);
      } else {
        setIsMobile(false);
        setAllowed(true);
      }
    };

    // Initial check
    checkScreen();

    // Watch resize
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, [pathname]);

  if (isMobile) {
    // Render the component directly instead of redirecting
    return <MobileNotSupported />;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
