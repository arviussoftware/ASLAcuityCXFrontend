export const handlePrint = (contentRef) => {
  if (typeof window === "undefined") {
    console.error("Window is not available.");
    return;
  }

  if (!contentRef || !contentRef.current) {
    console.error("Form content not found");
    return;
  }
  const content = contentRef.current;

  // Clone the content
  const clonedContent = content.cloneNode(true);

  // Synchronize form element states
  const originalInputs = content.querySelectorAll("input, select, textarea");
  const clonedInputs = clonedContent.querySelectorAll(
    "input, select, textarea"
  );

  originalInputs.forEach((originalInput, index) => {
    const clonedInput = clonedInputs[index];
    if (!clonedInput) return;

    if (originalInput.type === "radio" || originalInput.type === "checkbox") {
      clonedInput.checked = originalInput.checked;
      if (clonedInput.checked) {
        clonedInput.setAttribute("checked", "checked");
      } else {
        clonedInput.removeAttribute("checked");
      }
    }

    if (originalInput.tagName === "SELECT") {
      Array.from(clonedInput.options).forEach((option) => {
        option.selected = option.value === originalInput.value;
        if (option.selected) {
          option.setAttribute("selected", "selected");
        } else {
          option.removeAttribute("selected");
        }
      });
    }

    if (originalInput.tagName === "TEXTAREA" || originalInput.type === "text") {
      clonedInput.value = originalInput.value;
      clonedInput.textContent = originalInput.value; // Ensure textarea content is included
      clonedInput.setAttribute("value", originalInput.value); // Reflect in HTML
    }
  });

  // ── Inline selected emoji highlight so it survives in the print window
  // (CSS variables like hsl(var(--primary)) don't resolve in a blank print window)
  const originalEmojis = content.querySelectorAll(".emoji-label");
  const clonedEmojis  = clonedContent.querySelectorAll(".emoji-label");
  originalEmojis.forEach((origEl, idx) => {
    const clonedEl = clonedEmojis[idx];
    if (!clonedEl) return;
    if (origEl.classList.contains("selected")) {
      // Force inline background so the print window sees it without CSS vars
      clonedEl.style.backgroundColor = "rgba(59, 130, 246, 0.18)";
      clonedEl.style.borderColor     = "transparent";
      clonedEl.style.borderRadius    = "50%";
      clonedEl.style.transform       = "scale(1)";
      clonedEl.style.outline         = "2px solid rgba(59, 130, 246, 0.45)";
      clonedEl.style.outlineOffset   = "1px";
    } else {
      // Non-selected: reset any residual inline styles
      clonedEl.style.backgroundColor = "";
      clonedEl.style.outline         = "";
    }
  });

  // ── Fix inline CSS variables for stars and emojis 
  // (The print window fails to resolve inline CSS variables like var(--primary) even with :root)
  const allStarsAndEmojis = clonedContent.querySelectorAll(".star-icon, span");
  allStarsAndEmojis.forEach((el) => {
    if (el.style.color && el.style.color.includes("var(--primary)")) {
      el.style.color = "#1e293b"; 
    }
    if (el.style.color && el.style.color.includes("var(--border)")) {
      el.style.color = "#cbd5e1"; 
    }
    if (el.style.color && el.style.color.includes("var(--foreground)")) {
      el.style.color = "#64748b";
    }
  });

  // Prepare print styles
  const printStyles = `
    @media print {
      :root {
        --primary: 222 47% 11%; /* Very dark slate / almost black for stars */
        --border: 214 32% 85%;  /* Light grey for unfilled stars */
        --foreground: 222 47% 11%;
        --secondary: 214 32% 91%;
        --card: 0 0% 100%;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: black;
        background: white;
      }

      .emoji-stars-wrapper.selected {
        background-color: #93c5fd !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .preview-option label.emoji-label {
        font-size: 31px !important;
      }

      .no-print {
        display: none !important;
      }

      .form-structure {
        display: none !important;
      }

      .form-preview-content {
        display: block !important;
        width: 100% !important;
      }

      .form-preview {
        width: 100% !important;
        max-width: 100% !important;
        flex: none !important;
      }

      .preview-section {
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .print-container{
        border: 5px solid black;
        padding: 20px;
        box-sizing: border-box;
      }
      .form-details {
         text-align: center;
          justify-content: center;
          margin-bottom: 20px;
          background-color: #d6eaff;
          padding: 5px;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          box-shadow: 1px 1px 1px 1px #d6eaff;
      }
        .form-details h3 {
          font-size: 18px;
          margin-bottom: 10px;
          margin-top: 8px;
          color: hsl(var(--foreground));
        }

        .form-details p {
          max-width: 70vw;
          margin: 0 auto;
          text-align: center;
          font-size: 14px;
          color: hsl(var(--foreground));
          }

        .form-score{
          display: flex;
          align-items: center;
          justify-content: right;
          width: 100%; 
          padding-right: .5vw;
          position: relative;
          bottom: 3vh;
        }

        .totalform-score {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
          position: relative;
          top: 0;           
          right: 0;
          background-color: white;  
        }

        .totalform-score h4 {
          padding: 0px;
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
        }

        .Form-Max-Score-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
          position: relative;
          top: 0;
          right: 0;
          width: auto;
          background-color: white;
        }
        
        .Form-Max-Score-container h2 {
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
        }

        .form-details p {
          max-width: 70vw;
          margin: 0 auto;
          text-align: center;
          font-size: 14px;
          color: hsl(var(--foreground));
        }

        .preview-section h3 {
            padding: 4px 8px;
            margin-top: 15px;
            border-radius: 10px;
            background: #b7daff;
            font-size: 14px;
            margin-bottom: 10px;
            color: hsl(var(--foreground));
        }
          
        .header-section, 
        .footer-section {
          display: flex;
          justify-content: space-between; /* left & right items space out */
          align-items: center;
          width: 100%;
          padding: 10px 15px;
          border: 1px solid var(--brand-primary);        /* light border */
          border-radius: 6px;            /* smooth rounded corners */
          background-color: #f9f9f9;     /* light grey background */
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* subtle shadow */
          font-size: 14px;
          color: #333;
        }

          
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .preview-subsection {
          border: 1px solid #cbd5e1 !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          margin: 15px 0 !important;
          background: #ffffff !important;
        }

        .preview-subsection h4 {
          font-size: 13px !important;
          font-weight: 600 !important;
          background-color: #f1f5f9 !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding: 10px 15px !important;
          margin: 0 !important;
          color: #1e293b !important;
        }
              
        .sub-question-score {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 6px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
        }
        .sub-question-score h4, .Question-Max-Score-container h2 {
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
          white-space: nowrap;
        }

        .preview-subsection .preview-question {
          padding: 15px 20px !important;
          border-bottom: 1px solid #cbd5e1 !important;
          background-color: #ffffff !important;
          border-radius: 0px !important;
        }

        .preview-subsection .preview-question:last-child {
          border-bottom: none !important;
        }

        .preview-options {
          display: inline-flex !important;
          flex-direction: row !important;
          flex-wrap: wrap !important;
          gap: 12px 24px !important;
          align-items: center !important;
          margin-top: 12px !important;
          padding: 4px 0 !important;
          width: 100% !important;
        }

        .preview-option {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          cursor: pointer !important;
        }

        .preview-option label {
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #1e293b !important;
          cursor: pointer !important;
        }

        .sub-question-header {
          display: flex !important;
          width: 84vw !important;
          margin-left: -.7vw !important;
          margin-bottom: 12px !important;
          line-height: 1.5 !important;
        }

        .question-number {
          font-size: 15px !important;
          font-weight: bold;
        }

        .question-text {
          font-size: 16px !important;
          line-height: 1.5 !important;
        }

        .emoji-label {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center;
          border: 2px solid transparent;
          border-radius: 50% !important;
          width: 38px !important;
          height: 38px !important;
          padding: 4px !important;
          font-size: 31px !important;
          transition: none !important;
          box-sizing: border-box !important;
        }

        .emoji-label.selected, .emoji-label.buzzing {
          border-color: transparent !important;
          background-color: rgba(59, 130, 246, 0.15) !important;
          transform: scale(1) !important;
          box-shadow: none !important;
        }

        .question-header {
          display: flex;
          width: 95vw;
          align-items: center;
          margin-left: -.7vw;
        }
    
        .preview-subsection p {
          font-size: 12px;
          color: hsl(var(--foreground));
        }

        .section-score-box {
            display: flex;
            align-items: center;
            justify-content: right;
            width: 100%;
            padding-right: 0vw;
        }

        .subsection-score {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
          position: relative;
          top: 0;
          right: 0;
          background-color: white;
      }
        .subsection-score h4 {
          padding: 0px;
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
        }

        .Sub-Max-Score-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 0 5px;
          position: relative;
          top: 0;
          right: 0;
          width: auto;
          white-space: nowrap;
          background-color: white;
        }

        .Sub-Max-Score-container h2 {
          font-size: 10px;
          color: hsl(var(--primary));
          margin: 0;
          background: transparent;
          white-space: nowrap;
        }

       
        .scorebox {
          display: flex;
          align-items: center;
          justify-content: right;
          width: 20vw;
          padding-right: 0vw;
        }
    
        .preview-options {
            margin-top: 5px;  
        }
    
        input[type="radio"], input[type="checkbox"] {
          transform: scale(1.2);
        }
  
        input[type="text"], textarea {
          width: 100%;
          font-size: 14px;
          min-height: 50px;
          border: 1px solid #ccc;
          padding: 5px;
          box-sizing: border-box;
        }
  
        textarea {
          min-height: 100%;
        }

      }
    `;

  const styleTag = document.createElement("style");
  styleTag.innerHTML = printStyles;
  document.head.appendChild(styleTag);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Failed to open a new print window.");
    return;
  }

  // Write content to the print window
  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Printable Form</title>
        <style>
          /* Force background color printing on all elements */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        </style>
        <style>${printStyles}</style>
      </head>
      <body>${clonedContent.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();

  // Trigger print and cleanup
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
    styleTag.remove();
  };
};
