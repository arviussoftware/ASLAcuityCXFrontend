import React, { useState } from "react";
import "./Styles/FormPreviewerNavbar.css";
import withAuth from "@/components/withAuth";

const FormPreviewerNavbar = ({
  handleBack,
  togglePreviewMode,
  toggleMaxScore,
  handlePrint,
  isPreviewFull,
  setIsPreviewFull,
}) => {
  const handleGoBack = () => {
    // If preview mode is active, toggle it off
    if (togglePreviewMode) {
      togglePreviewMode();
    } else if (handleBack) {
      // Otherwise, call the normal back handler
      handleBack();
    }
  };

  return (
    <header className="previewer-header">
      <nav className="previewer-navbar">
        <div className="previewer-title fa-solid">FORM PREVIEWER</div>

        <div className="previewer-navbuttons">
          <div className="tooltip-wrapper-nav">
            <i
              className="fa fa-arrow-left goback-image"
              onClick={handleGoBack} // Use the custom handler
            ></i>
            <span className="tooltip-text-nav">Go-back</span>
          </div>
          <div className="tooltip-wrapper-nav">
            <i
              className="fa fa-calculator calculate-button"
              onClick={() => toggleMaxScore()}
            ></i>
            <span className="tooltip-text-nav">Calculate Max Score</span>
          </div>
          {/* Print Button */}
          <div className="tooltip-wapper-nav">
            <i className="fa fa-print print-button" onClick={handlePrint}></i>
            <span className="tooltip-text-nav">Print</span>
          </div>

          {/* <button className="toggle-btn" onClick={() => setIsPreviewFull(!isPreviewFull)}>
            {isPreviewFull ? "<" : ">"}
          </button> */}

          <div className="tooltip-wrapper-nav">
            <i
              className="fa fa-project-diagram  tree-structure"
              onClick={() => setIsPreviewFull(!isPreviewFull)}
            ></i>
            <span className="tooltip-text-nav">Form Structure</span>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default withAuth(FormPreviewerNavbar);
