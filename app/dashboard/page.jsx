"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CryptoJS from "crypto-js";

export default function DashboardPage() {
  const router = useRouter();

  //   const redirectUserByRole = () => {
  //     try {
  //       const encryptedUser = sessionStorage.getItem("user");
  //       if (!encryptedUser) {
  //         router.replace("/");
  //         return;
  //       }
  //       const bytes = CryptoJS.AES.decrypt(encryptedUser, "");
  //       const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  //       const user = JSON.parse(decryptedData);
  //       const role = user?.userRoles?.[0]?.roleId;

  //       if (!role) {
  //         console.warn("Role not found in user data");
  //         router.replace("/404");
  //         return;
  //       }
  //       if (Array.isArray(roles) &&
  //         roles.includes(Number(role))) {
  //         router.replace("/dashboard/QMagent");
  //       } else {
  //         router.replace("/dashboard/dashboard1");
  //       }
  //     } catch (err) {
  //       console.error("Decryption or redirecr error:", err);
  //       router.replace("/404");
  //     }
  //   };
  //   loadRoles();
  //   redirectUserByRole();
  // }, [router]);
  useEffect(() => {
    try {
      const encryptedUser = sessionStorage.getItem("user");
      if (!encryptedUser) {
        router.replace("/");
        return;
      }
      router.replace("/dashboard/users");
    } catch (err) {
      console.error("Redirect error:", err);
      router.replace("/404");
    }
  }, []);
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
    </div>
  )
}