"use client";
import { useState, useEffect, useRef } from "react";
import SaveDuplicateForm from "@/components/duplicateForm";
import withAuth from "@/components/withAuth";
import { handleDuplicateForm } from "@/components/formFunctions";
import NotFound from "@/components/NotFound";
import CryptoJS from "crypto-js";
import { useRouter, useSearchParams } from "next/navigation";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";


const DuplicateFormPage = ({ params }) => {
  const { id } = params;
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [hasAccess, setHasAccess] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchPrivilege();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          orgId: sessionStorage.getItem("selectedOrgId") || "",
          orgIds: getSelectedOrgIdsHeader(),
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok) {
        const privileges = data.PrivilegeList || [];
        const hasViewPermission = privileges.some(
          (privilege) => privilege.PrivilegeId === 16
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
      console.error("Error fetching privileges:", error);
      setHasAccess(false);
      router.replace("/not-found");
    }
  };

  const formNameRef = useRef(null); // Ref for form name input

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          },
          cache: "no-store",
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
            const formWithJson = {
              ...formData,
              formJson: parsedFormJson,
            };
            const duplicatedForm = handleDuplicateForm(formWithJson);
            setForm(duplicatedForm);

            // Focus on the duplicated form name after setting state
            setTimeout(() => {
              if (formNameRef.current) {
                formNameRef.current.focus();
              }
            }, 100);
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

  if (notFound) {
    const returnTo = searchParams.get("returnTo") || "/dashboard/forms";
    return (
      <NotFound
        message="The form you are trying to duplicate does not exist."
        redirectUrl={returnTo}
        redirectText="Go Back"
      />
    );
  }
  if (hasAccess === null) {
    return <div>Loading...</div>;
  }
  if (hasAccess === false) {
    return null;
  }

  if (!form) return <div>Loading...</div>;

  const disabledOptionsConverted = {
    first: new Set(form.formJson.disabledOptions.first),
    second: new Set(form.formJson.disabledOptions.second),
  };
  return (
    <>
      <SaveDuplicateForm
        sections={form.formJson.sections}
        formName={form.formName}
        formNameRef={formNameRef}
        formDescription={form.formDescription}
        sectionDetails={form.formJson.sections.map((section) => section.sectionDetails)}
        sectionDescription={form.formJson.sections.map((section) => section.sectionDescription)}
        visibilityRules={form.formJson.visibilityRules}
        scoringRules={form.formJson.scoringRules}
        scoringMethod={form.formJson.scoringMethod}
        disabledOptions={disabledOptionsConverted}
        formId={form.formId}
        QuestionInstructions={false}
        hideFormScore={form.formJson.hideFormScore}
        basePercentage={form.formJson.basePercentage}
        baselineScore={form.baselineScore}
        header={form.formJson.header}
        footer={form.formJson.footer}
        interactiontype={form.interactiontype}
      />
    </>
  );
};

export default withAuth(DuplicateFormPage);
