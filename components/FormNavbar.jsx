"use client";
import React from "react";
import {
  FileText, CheckCircle, Eye,
  PlusCircle, ArrowLeft, LayoutList, ChevronDown,
} from "lucide-react";
import "./Styles/Navbar.css";
import withAuth from "@/components/withAuth";
import { useRouter, useSearchParams } from "next/navigation";

const FormNavbar = ({
  onPreviewClick,
  onAddSectionClick,
  onSaveDraft,
  onSubmit,
  onHeader,
  onFooter,
  onToggleSidebar,
  formId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo =
    searchParams.get("returnTo") ||
    sessionStorage.getItem("formsReturnTo") ||
    "/dashboard/forms";

  const handleCancel = () => router.push(returnTo);

  const handlePreview = () => {
    onPreviewClick && onPreviewClick();
  };

  return (
    <header className="fnav-builder-header no-print">
      <nav className="fnav-builder-nav">
        {/* Logo / title */}
        <a href={returnTo} className="fnav-builder-logo">
          Form Builder
        </a>

        {/* Action buttons */}
        <div className="fnav-builder-actions">
          {/* Add Category pill — left of Structure */}
          <button type="button" className="fnav-builder-btn fnav-structure-btn" title="Add Category"
            draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", "ADD_CATEGORY")} onClick={onAddSectionClick}>
            <PlusCircle size={14} />
            <span className="fnav-structure-label">Add Category</span>
          </button>

          {/* Toggle Form Structure sidebar */}
          <button type="button" className="fnav-builder-btn fnav-structure-btn" title="Toggle Form Structure"
            onClick={onToggleSidebar}>
            <LayoutList size={14} />
            <span className="fnav-structure-label">Structure</span>
            <ChevronDown size={12} />
          </button>

          <button type="button" className="fnav-builder-btn" title="Footer"
            draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", "ADD_FOOTER")} onClick={onFooter}>
            <span style={{ fontSize: "22px", fontWeight: "600", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px" }}>F</span>
          </button>

          <button type="button" className="fnav-builder-btn" title="Header"
            draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", "ADD_HEADER")} onClick={onHeader}>
            <span style={{ fontSize: "22px", fontWeight: "600", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px" }}>H</span>
          </button>

          <button type="button" className="fnav-builder-btn" title="Save as Draft" onClick={onSaveDraft}>
            <FileText size={22} />
          </button>

          <button type="button" className="fnav-builder-btn" title="Submit" onClick={onSubmit}>
            <CheckCircle size={22} />
          </button>

          <button type="button" className="fnav-builder-btn" title="Preview" onClick={handlePreview}>
            <Eye size={22} />
          </button>

          <button type="button" className="fnav-builder-btn" title="Go back" onClick={handleCancel}>
            <ArrowLeft size={22} />
          </button>
        </div>
      </nav>
    </header>
  );
};

export default withAuth(FormNavbar);
