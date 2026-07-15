"use client";
import CryptoJS from 'crypto-js';
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import withAuth from "@/components/withAuth";
import SubmittedForm from "@/components/show-SubmittedForm";

const SubmittedFormPage = () => {
    const router = useRouter();
    const [form, setForm] = useState(null);

    useEffect(() => {
        // Prevent clearing sessionStorage on initial render
        const sessionStoredText = sessionStorage.getItem("submittedFormData");
        if (sessionStoredText) {
            const bytes = CryptoJS.AES.decrypt(sessionStoredText, '');
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            setForm(JSON.parse(decryptedData));
        } else {
            console.error("No form data found.");
            router.push("/dashboard");
        }
    }, [router]);
    if (!form) return <p>Loading...</p>; // Handle loading state

    return (
        <SubmittedForm
            assignedFormid={form.assignedFormId}
            formId={form.formId}
            interactionId={form.id}
            sections={form.ansFormJson?.sections || []}
            formName={form.formName}
            formDescription={form.formDescription}
            sectionDetails={form.ansFormJson?.sections?.map(section => section.sectionDetails) || []}
            sectionDescription={form.ansFormJson?.sections?.map(section => section.sectionDescription) || []}
            visibilityRules={form.ansFormJson?.visibilityRules || []}
            scoringRules={form.ansFormJson?.scoringRules || []}
            scoringMethod={form.ansFormJson?.scoringMethod || ""}
            QuestionInstructions={false}
            hideFormScore={form.ansFormJson?.hideFormScore || false}
            basePercentage={form.ansFormJson?.basePercentage || 0}
            baselineScore={form.baselineScore || 0}
            totalformScore={form.ansFormJson?.totalScore || 0}
            timestamp={form.timestamp || ""}
            header={form.ansFormJson?.header || ""}
            footer={form.ansFormJson?.footer || ""}
        />
    );
};

export default withAuth(SubmittedFormPage);