"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import FormBuilder from "@/components/FormBuilder";
import withAuth from "@/components/withAuth";
import CryptoJS from "crypto-js";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

const Builder = () => {  // Remove async here
  const [hasAccess, setHasAccess] = useState(null);
  const router = useRouter();
  useEffect(() => {

    const fetchPrivilege = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let userRole = null;

        if (encryptedUserData) {
          try {
            const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            const user = JSON.parse(decryptedData);
            userRole = user?.userId || null;
          } catch (error) {
            console.error("Error decrypting user data:", error);
          }
        }

        const response = await fetch("/api/moduleswithPrivileges", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userRole,
            moduleId: 5, 
            orgIds: getSelectedOrgIdsHeader(),
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok) {
          const privileges = data.PrivilegeList || [];
          const hasViewPermission = privileges.some(
            (privilege) => privilege.PrivilegeId === 10
          );

          if (hasViewPermission) {
            setHasAccess(true);
          } else {
            setHasAccess(false);
            router.replace("/not-found");
          }
        } else {
          setHasAccess(false);
          router.replace("/not-found");
        }
      } catch (error) {
        console.warn("Error fetching privileges:", error);
        setHasAccess(false);
        router.replace("/not-found");
      }
    };
    fetchPrivilege();
  }, [router]);

  if (hasAccess === null) {
    return <div>Loading...</div>;
  }
  if (hasAccess === false) {
    return null;
  }

  return (
    <div className="flex  w-full">
      <FormBuilder />
    </div>
  );
};

export default withAuth(Builder);

