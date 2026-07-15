"use client"; // This is a client-side component

import { useEffect, useCallback } from "react";
import CryptoJS from "crypto-js";
import { useRouter } from "next/navigation";

const useIdleTimeout = (onTimeout, timeout) => {
  useEffect(() => {
    let timeoutId;
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(onTimeout, timeout);
    };

    window.addEventListener("mousemove", resetTimeout);
    window.addEventListener("keydown", resetTimeout);
    window.addEventListener("click", resetTimeout);
    window.addEventListener("scroll", resetTimeout);

    // Initialize timeout on mount
    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", resetTimeout);
      window.removeEventListener("keydown", resetTimeout);
      window.removeEventListener("click", resetTimeout);
      window.removeEventListener("scroll", resetTimeout);
    };
  }, [onTimeout, timeout]);
};

const ClientLayout = ({ children }) => {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      const encryptedUserData = sessionStorage.getItem("user");

      let userId = null;
      let userName = null;

      if (encryptedUserData) {
        const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
        const user = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        userId = user?.userId;
        userName = user?.userFullName;
      }

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("visibilityRules");
      sessionStorage.removeItem("selectedModuleId");
      sessionStorage.removeItem("scoringRules");
      sessionStorage.removeItem("scoringRules");
      sessionStorage.removeItem("disabledOptions");
      sessionStorage.removeItem("selectedTimezone");
      // ForceClear sessionStorage
      sessionStorage.removeItem("tempDashboardData");
      // Clear client-side cookies (non-HttpOnly cookies)
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure";

      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          loggedInUserId: userId,
          userName: userName,
          logoutReason: "timeout", // ⭐ important
        },
      });

      if (response.ok) {
        router.push("/");
      } else {
        console.error("Failed to log out on the server. Please try again.");
      }
    } catch (err) {
      console.error("Error during logout:", err);
    }
  }, [router]);

  // Use storage event to catch changes in other tabs/windows
  // useEffect(() => {
  //   const handleStorageChange = (event) => {
  //     if(
  //       ["token", "user", "visibilityRules", "selectedModuleId", "scoringRules", "disabledOptions", "tempDashboardData"].includes(
  //         event.key
  //     )
  //     ){
  //       handleLogout();
  //     }
  //   };

  //   window.addEventListener("storage", handleStorageChange);
  //   return () =>
  //     window.removeEventListener("storage", handleStorageChange);
  // }, [handleLogout]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (
        [
          "token",
          "user",
          "visibilityRules",
          "selectedModuleId",
          "scoringRules",
          "disabledOptions",
          "tempDashboardData",
          "selectedTimezone",
        ].includes(event.key)
      ) {
        handleLogout();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleLogout]);

  // Use idle timeout hook (20 minutes)
  useIdleTimeout(handleLogout, 1200000);

  return <div>{children}</div>;
};

export default ClientLayout;
