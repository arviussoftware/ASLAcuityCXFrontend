"use client";
import { useState, useEffect } from "react";
import FormPreviewer from "@/components/FormPreviewer";
import withAuth from "@/components/withAuth"; // Import the withAuth HOC
import NotFound from "@/components/NotFound";
import CryptoJS from 'crypto-js';
import { notFound, useSearchParams } from "next/navigation";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";

const FormPreview = ({ params }) => {
  const { id } = params;
  const [form, setForm] = useState(null);
  const [notfound, setNotFound] = useState(false);
  const [privileges, setPrivileges] = useState([]);
  const [privilegesLoaded, setPrivilegesLoaded] = useState(false);
  const searchParams = useSearchParams();

  const hasPrivilege = (privId) =>
    privileges.some((p) => p.PrivilegeId === privId);

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        // ✅ Clear interactionDateRange after user validation
        sessionStorage.removeItem("interactionDateRange");
        sessionStorage.removeItem("selectedCallStatus");
        let userId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, '');
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          userId = user?.userId || null;
        }

        const response = await fetch(`/api/privileges`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
            loggedInUserId: userId,
            moduleId: 5, 
            orgId: sessionStorage.getItem("selectedOrgId") || "", // Users module
            orgIds: getSelectedOrgIdsHeader(),
          },
        });

        if (!response.ok) throw new Error("Failed to fetch privileges");
        const data = await response.json();

        setPrivileges(data.privileges || []);
        setPrivilegesLoaded(true);
      } catch (err) {
        console.warn("Error fetching privileges:", err);
        setPrivilegesLoaded(true); // Still mark as loaded to avoid indefinite loading
      }
    };

    fetchPrivileges();
  }, []);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,

          },
        });
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await response.json();
        if (response.ok) {
          const formData = data.forms[0];
          if (formData) {
            const parsedFormJson = JSON.parse(formData.formJson);

            setForm({
              ...formData,
              formJson: parsedFormJson
            });
          }
        } else {
          console.error("Error fetching form:", data.message);
        }
      } catch (error) {
        console.error("Error fetching form:", error);
      }
    };

    fetchForm();
  }, [id]);

  useEffect(() => {
    const auditPreview = async () => {
      try {
        const encryptedUserData = sessionStorage.getItem("user");
        let currentUserId = null;

        if (encryptedUserData) {
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
          const user = JSON.parse(decryptedData);
          currentUserId = user?.userId || null;
        }

        if (!currentUserId) return;

        await fetch(`/api/forms/preview-audit/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          body: JSON.stringify({ currentUserId }),
        });
      } catch (error) {
        console.error("Error auditing form preview:", error);
      }
    };

    auditPreview();
  }, [id]);

  if (notfound) {
    const returnTo = searchParams.get("returnTo") || "/dashboard/forms";
    return (
      <NotFound
        message="This page does not exist."
        redirectUrl={returnTo}
        redirectText="Go Back"
      />
    );
  }
  if (!privilegesLoaded) {
    return <p className="text-xs text-muted-foreground">Loading...</p>;
  }

  if (privilegesLoaded && !hasPrivilege(1)) {
    return notFound(); // Renders Next.js 404 page
  }

  if (!form) return <div>Loading...</div>;

  return (
    <div className="form-preview-page-wrapper">
      <FormPreviewer
        sections={form.formJson.sections}
        formName={form.formName}
        formDescription={form.formDescription}
        sectionDetails={form.formJson.sections.map((section) => section.sectionDetails)}
        sectionDescription={form.formJson.sections.map((section) => section.sectionDescription)}
        visibilityRules={form.formJson.visibilityRules}
        scoringRules={form.formJson.scoringRules}
        scoringMethod={form.formJson.scoringMethod}
        QuestionInstructions={false}
        hideFormScore={form.formJson.hideFormScore}
        basePercentage={form.formJson.basePercentage}
        baselineScore={form.baselineScore}
        header={form.formJson.header}
        footer={form.formJson.footer}
      />
    </div>
  );
};

export default withAuth(FormPreview);
