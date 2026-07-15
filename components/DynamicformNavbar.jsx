import React from "react";
import { Printer, Maximize2, Minimize2, Calculator, LayoutList, X, ChevronDown } from "lucide-react";
import "./Styles/FormPreviewerNavbar.css";

const DynamicformNavbar = ({
  toggleMaxScore,
  handlePrint,
  isPreviewFull,
  setIsPreviewFull,
  onClose,
  isFullscreen,
  setIsFullscreen,
}) => {
  return (
    <div className="fnav-bar no-print">
      <span className="fnav-title">Form Preview</span>
      <div className="fnav-actions">
        {/* Fullscreen toggle — FIRST, expands form to full page width */}
        {setIsFullscreen && (
          <button
            type="button"
            className="fnav-btn"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        )}

        {/* Form Structure sidebar toggle */}
        <button
          type="button"
          className="fnav-btn fnav-structure-btn"
          title="Toggle Form Structure"
          onClick={() => setIsPreviewFull(!isPreviewFull)}
        >
          <LayoutList size={14} />
          <ChevronDown size={12} />
        </button>

        {/* Print */}
        <button type="button" className="fnav-btn" title="Print" onClick={handlePrint}>
          <Printer size={17} />
        </button>

        {/* Calculate Max Score */}
        <button type="button" className="fnav-btn" title="Calculate Max Score" onClick={toggleMaxScore}>
          <Calculator size={17} />
        </button>

        {/* Close */}
        {onClose && (
          <button type="button" className="fnav-btn fnav-close-btn" title="Close" onClick={onClose}>
            <X size={17} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DynamicformNavbar;
