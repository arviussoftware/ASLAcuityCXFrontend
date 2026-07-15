"use client";

import React from "react";
import { useRouter } from "next/navigation";

function CreateFormBtn() {
  const router = useRouter();

  const handleClick = () => {
    const returnTo = sessionStorage.getItem("formsReturnTo");
    const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    router.push(`/dashboard/forms/builder${qs}`);
  };

  return (
    <button className="fmg-btn fmg-btn-primary" onClick={handleClick}>
      <span style={{ fontSize: 18, lineHeight: 1, marginRight: 2 }}>+</span>
      Create New Form
    </button>
  );
}

export default CreateFormBtn;