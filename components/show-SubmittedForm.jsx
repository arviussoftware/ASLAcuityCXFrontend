"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import DynamicformNavbar from "./DynamicformNavbar";
import FormStructure from './FormStructure';
import "./Styles/FormPreview.css";
import "./Styles/media_query_form_builder.css"
import withAuth from "@/components/withAuth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CryptoJS from 'crypto-js';

const SubmittedForm = ({
  sections,
  formName,
  formDescription,
  header,
  visibilityRules,
  scoringRules,
  scoringMethod,
  basePercentage,
  hideFormScore,
  totalformScore,
  footer,
  evaluator,
  onClose,
  isFullscreen,
  setIsFullscreen,
  onStructureToggle,
}) => {

  const router = useRouter();
  const [isPreviewFull, setIsPreviewFull] = useState(true);
  const [disabledQuestions, setDisabledQuestions] = useState({});
  const [disabledScoreQuestions, setDisabledScoreQuestions] = useState({});
  const [visibleInstructions, setVisibleInstructions] = useState({});
  const [visibleComment, setVisibleComment] = useState({});
  const [hiddenSections, setHiddenSections] = useState({});
  const [disabledSections, setDisabledSections] = useState({});
  const [hiddenSubsections, setHiddenSubsections] = useState({})
  const [disabledSubsections, setDisabledSubsections] = useState({});
  const [visbleMaxScore, setMaxScore] = useState(false);
  const [responses, setResponses] = useState({});
  const [scores, setScores] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState({});

  const contentRef = useRef();
  const toggleDropdown = (qIndex) => {
    setIsDropdownOpen((prev) => ({
      ...prev,
      [qIndex]: !prev[qIndex],
    }));
  };

  const sanitizeHtmlContent = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== "string") {
      return ""; // Return empty string if invalid
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Check if doc.body exists
    if (!doc.body) {
      return ""; // Return empty string if parsing fails
    }

    // Ensure <ol> and <ul> styles are applied
    const olElement = doc.querySelector("ol");
    if (olElement) {
      olElement.style.listStyleType = "decimal"; // Ensure ordered list numbering
    }

    const ulElement = doc.querySelector("ul");
    if (ulElement) {
      ulElement.style.listStyleType = "disc"; // Ensure unordered list bullets
    }

    return doc.body.innerHTML;
  };

  const handleDownloadPDF = async () => {
    const content = contentRef.current;

    if (!content) {
      console.error("Content is not available in the DOM.");
      return;
    }

    // Ensure all styles are captured
    const originalStyle = content.style.cssText;

    // Force visibility and inline styles
    content.style.cssText = `
      overflow: visible !important;
      height: auto !important;
      position: static !important;
      display: block !important;
    `;

    try {
      // Render the full content with proper styling using html2canvas
      const canvas = await html2canvas(content, {
        scale: 2, // High quality rendering
        useCORS: true, // Ensure external styles/images are loaded
        allowTaint: false, // Avoid issues with tainted canvases
      });

      // Reset content styles after rendering
      content.style.cssText = originalStyle;

      // Convert canvas to image data URL
      const imgData = canvas.toDataURL("image/png");

      // Initialize jsPDF
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate scale factor based on page size and image size
      const scaleFactor = pageWidth / imgWidth;
      const scaledHeight = imgHeight * scaleFactor;

      // Add content to PDF, splitting into pages if needed
      let position = 0;
      while (position < scaledHeight) {
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = canvas.width;
        cropCanvas.height = pageHeight / scaleFactor;

        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(canvas, 0, -position / scaleFactor);

        const pageImgData = cropCanvas.toDataURL("image/png");
        pdf.addImage(pageImgData, "PNG", 0, 0, pageWidth, pageHeight);

        position += pageHeight;
        if (position < scaledHeight) {
          pdf.addPage(); // Add new page for the remaining content
        }
      }

      // Save the generated PDF
      pdf.save(`${formName || "form"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);

      // Reset content style on error
      content.style.cssText = originalStyle;
    }
  };


  const handlePrint = () => {
    if (typeof window === "undefined") {
      console.error("Window is not available.");
      return;
    }

    const content = contentRef.current;

    if (!content) {
      console.error("Form content not found!");
      return;
    }

    // Clone the content
    const clonedContent = content.cloneNode(true);

    // Synchronize form element states
    const originalInputs = content.querySelectorAll("input, select, textarea");
    const clonedInputs = clonedContent.querySelectorAll("input, select, textarea");

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

    // ── Inline selected emoji highlight so it survives the print window
    // (CSS variables like hsl(var(--primary)) don't resolve in a blank print window)
    const originalEmojis = content.querySelectorAll(".emoji-label");
    const clonedEmojis   = clonedContent.querySelectorAll(".emoji-label");
    originalEmojis.forEach((origEl, idx) => {
      const clonedEl = clonedEmojis[idx];
      if (!clonedEl) return;
      if (origEl.classList.contains("selected")) {
        clonedEl.style.backgroundColor = "rgba(59, 130, 246, 0.18)";
        clonedEl.style.borderColor     = "transparent";
        clonedEl.style.borderRadius    = "50%";
        clonedEl.style.transform       = "scale(1)";
        clonedEl.style.outline         = "2px solid rgba(59, 130, 246, 0.45)";
        clonedEl.style.outlineOffset   = "1px";
      } else {
        clonedEl.style.backgroundColor = "";
        clonedEl.style.outline         = "";
      }
    });


    // Prepare print styles
    const printStyles = `
      @media print {
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

          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }

          .preview-subsection {
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            overflow: hidden !important;
            margin: 10px 0 !important;
            background: #ffffff !important;
          }

          .preview-subsection h4 {
            font-size: 12px !important;
            font-weight: 600 !important;
            background-color: #f1f5f9 !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding: 6px 12px !important;
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
            padding: 8px 15px !important;
            border-bottom: 1px solid #e2e8f0 !important;
            background-color: #ffffff !important;
            border-radius: 0px !important;
          }

          .preview-subsection .preview-question:last-child {
            border-bottom: none !important;
          }

          .sub-question-header {
            display: flex;
            width: 84vw;
            margin-left: -.7vw;
          }

          .question-header {
            display: flex;
            width: 95vw;
            align-items: center;
            margin-left: -.7vw;
          }
      
          .preview-subsection p {
            font-size: 11px;
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
            padding: 8px 12px;
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
            padding: 6px 12px;
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
             display: inline-flex !important;
             flex-direction: row !important;
             flex-wrap: wrap !important;
             gap: 8px 20px !important;
             align-items: center !important;
             margin-top: 4px !important;
             padding: 2px 0 !important;
             width: 100% !important;
           }

           .preview-option {
             display: inline-flex !important;
             align-items: center !important;
             gap: 6px !important;
             cursor: pointer !important;
           }

           .preview-option label {
             font-size: 12px !important;
             font-weight: 500 !important;
             color: #334155 !important;
             cursor: pointer !important;
           }

           .sub-question-header {
             display: flex !important;
             margin-bottom: 4px !important;
             line-height: 1.3 !important;
           }

           .question-number {
             font-size: 13px !important;
             font-weight: bold;
           }

           .question-text {
             font-size: 13px !important;
             line-height: 1.3 !important;
           }

           .emoji-label {
             display: inline-flex !important;
             align-items: center !important;
             justify-content: center;
             border: 2px solid transparent;
             border-radius: 50% !important;
             width: 32px !important;
             height: 32px !important;
             padding: 2px !important;
             font-size: 24px !important;
             transition: none !important;
             box-sizing: border-box !important;
           }

          .emoji-label.selected, .emoji-label.buzzing {
            border-color: transparent !important;
            background-color: rgba(59, 130, 246, 0.15) !important;
            transform: scale(1) !important;
            box-shadow: none !important;
          }
       
           input[type="radio"], input[type="checkbox"] {
             transform: scale(1.1);
           }
    
           input[type="text"] {
             width: 100%;
             font-size: 12px;
             padding: 4px 6px;
             border: 1px solid #ccc;
             box-sizing: border-box;
           }
    
           textarea {
             width: 100%;
             font-size: 12px;
             min-height: 40px;
             border: 1px solid #ccc;
             padding: 4px 6px;
             box-sizing: border-box;
             min-height: 100%;
           }

          /* Custom dropdown printing options */
          .custom-dropdownn .dropdown-header {
            display: none !important;
          }
          
          .custom-dropdownn .dropdown-options {
            display: inline-flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 8px 20px !important;
            align-items: center !important;
            margin-top: 4px !important;
            padding: 2px 0 !important;
            width: 100% !important;
            position: static !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            max-height: none !important;
            overflow: visible !important;
          }

          .custom-dropdownn .dropdown-option {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            cursor: pointer !important;
            padding: 0 !important;
            background: transparent !important;
          }

          .custom-dropdownn .dropdown-option label {
            font-size: 12px !important;
            font-weight: 500 !important;
            color: #334155 !important;
            cursor: pointer !important;
            margin: 0 !important;
          }

          .custom-dropdownn .dropdown-option input {
            margin-right: 0 !important;
            transform: scale(1.1) !important;
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


  const handleSectionResponseScore = (sIndex, sectionScore) => {
    sections[sIndex].sectionScore = sectionScore;

  }

  const handleSubsectionResponseScore = (sIndex, subIndex, subsectionScore) => {
    sections[sIndex].subsections[subIndex].subsectionScore = subsectionScore;

  }

  const handleQuestionResponseScore = (sIndex, subIndex, qIndex, questionScore) => {
    sections[sIndex].subsections[subIndex].questions[qIndex].questionScore = questionScore;
  }

  const toggleMaxScore = () => {
    setMaxScore(!visbleMaxScore);
  }
  useEffect(() => {
    applyRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [hiddenQuestions, setHiddenQuestions] = useState(() => {
    const initialHiddenState = {};
    sections.forEach((section, sIndex) => {
      section.questions.forEach((question, qIndex) => {
        const questionId = `${sIndex}-${qIndex}`;
        if (question.hidden) {
          initialHiddenState[questionId] = true;
        }
      });
      if (section.subsections) {
        section.subsections.forEach((subsection, subIndex) => {
          subsection.questions.forEach((question, qIndex) => {
            const subQuestionId = `${sIndex}-${subIndex}-${qIndex}`;
            if (question.hidden) {
              initialHiddenState[subQuestionId] = true;
            }
          });
        });
      }
    });
    return initialHiddenState;
  });

  const applyRules = () => {
    const initialHiddenState = {};
    const updatedResponses = {}; // Initialize updatedResponses

    sections.forEach((section, sIndex) => {

      section.questions.forEach((question, qIndex) => {
        const questionId = `${sIndex}-${qIndex}`;
        // Store answer as a string instead of an array
        updatedResponses[questionId] = Array.isArray(question.answer)
          ? question.answer.join(", ") // Convert array to comma-separated string
          : question.answer ?? ""; // If it's not an array, keep it as is

        if (question.hidden) {
          initialHiddenState[questionId] = true;
        }
      });

      if (section.subsections) {
        section.subsections.forEach((subsection, subIndex) => {

          subsection.questions.forEach((question, qIndex) => {
            const subQuestionId = `${sIndex}-${subIndex}-${qIndex}`;
            // Store answer as a string instead of an array
            updatedResponses[subQuestionId] = Array.isArray(question.answer)
              ? question.answer.join(", ") // Convert array to string
              : question.answer ?? ""; // If it's not an array, keep it as is

            applyVisibilityRules(updatedResponses, subQuestionId); // Pass structured responses

            if (question.hidden) {
              initialHiddenState[subQuestionId] = true;
            }
          });
        });
      }
    });

  };

  const applyVisibilityRules = (updatedResponses, currentQuestionId) => {
    try {

      let newDisabledQuestions = { ...disabledQuestions };
      let newHiddenQuestions = { ...hiddenQuestions };
      let newDisabledSubsections = { ...disabledSubsections };
      let newHiddenSubsections = { ...hiddenSubsections };
      let newDisabledSections = { ...disabledSections };
      let newHiddenSections = { ...hiddenSections };
      let newScores = { ...scores };

      const reverseAction = (action) => {
        switch (action?.toLowerCase()) {
          case "disable": return "enable";
          case "enable": return "disable";
          case "show": return "hide";
          case "hide": return "show";
          default: return null;
        }
      };

      const handleThenAction = (targetId, action) => {
        if (!action) return;
        const actionLower = action.toLowerCase();
        const [sectionId, subsectionId, questionId] = targetId.split('-');

        if (questionId !== undefined) {
          if (actionLower === "disable") {
            newDisabledQuestions[targetId] = true;
          } else if (actionLower === "enable") {
            delete newDisabledQuestions[targetId];
          } else if (actionLower === "hide") {
            newHiddenQuestions[targetId] = true;
            newScores[targetId] = null;
            delete newDisabledQuestions[targetId];
          } else if (actionLower === "show") {
            delete newHiddenQuestions[targetId];
          }
        } else if (subsectionId !== undefined) {
          if (actionLower === "disable") {
            newDisabledSubsections[targetId] = true;
          } else if (actionLower === "enable") {
            delete newDisabledSubsections[targetId];
          } else if (actionLower === "hide") {
            newHiddenSubsections[targetId] = true;
            newScores[targetId] = null;
          } else if (actionLower === "show") {
            delete newHiddenSubsections[targetId];
          }
        } else if (sectionId) {
          if (actionLower === "disable") {
            newDisabledSections[sectionId] = true;
          } else if (actionLower === "enable") {
            delete newDisabledSections[sectionId];
          } else if (actionLower === "hide") {
            newHiddenSections[sectionId] = true;
            newScores[targetId] = null;
          } else if (actionLower === "show") {
            delete newHiddenSections[sectionId];
          }
        }
      };

      let updatedActions = new Set();

      visibilityRules.forEach((rule, index) => {

        const { firstOption, comparison, selectedOptionValue, secondOption, thenAction } = rule;
        const isQuestionInvolved = Object.prototype.hasOwnProperty.call(updatedResponses, firstOption);

        if (!isQuestionInvolved) return;

        let responseValue = updatedResponses[firstOption] ?? "N/A";

        if (responseValue === undefined || responseValue === null || responseValue === "") {
          const inverseAction = reverseAction(thenAction);
          if (inverseAction) {
            handleThenAction(secondOption, inverseAction);
          }
        }

        let conditionMet = false;
        switch (comparison) {
          case "equals":
            conditionMet = responseValue === selectedOptionValue;
            break;
          case "not-equals":
            conditionMet = responseValue !== selectedOptionValue;
            break;
          case "is-either":
            if (Array.isArray(selectedOptionValue)) {
              conditionMet = selectedOptionValue.includes(responseValue);
            }
            break;
          default:
            break;
        }

        if (conditionMet) {
          handleThenAction(secondOption, thenAction);
          updatedActions.add(`${secondOption}-${thenAction}`);

          const matchingRules = visibilityRules.filter(r =>
            r.firstOption === firstOption &&
            r.secondOption === secondOption &&
            r.comparison === comparison &&
            r.thenAction !== thenAction
          );

          if (matchingRules.length > 0) {
            matchingRules.forEach(matchingRule => {
              const reversedAction = reverseAction(matchingRule.thenAction);
              handleThenAction(matchingRule.secondOption, reversedAction);
            });
          }
        } else {
          const inverseAction = reverseAction(thenAction);
          if (inverseAction) {
            handleThenAction(secondOption, inverseAction);
          }
        }
      });

      setDisabledQuestions({ ...newDisabledQuestions });
      setHiddenQuestions({ ...newHiddenQuestions });
      setDisabledSubsections({ ...newDisabledSubsections });
      setHiddenSubsections({ ...newHiddenSubsections });
      setDisabledSections({ ...newDisabledSections });
      setHiddenSections({ ...newHiddenSections });
    } catch (error) {
      console.error("Error applying rules:", error);
    }
  };

  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedSubsections, setCollapsedSubsections] = useState({});
  const [collapsedHeader, setCollapsedHeader] = useState(
    header?.isCollapsed || false
  );
  const [collapsedFooter, setCollapsedFooter] = useState(
    footer?.isCollapsed || false
  );

  const toggleSectionCollapse = (sIndex) => {
    setCollapsedSections((prevState) => ({
      ...prevState,
      [sIndex]: !prevState[sIndex],
    }));
  };
  const toggleHeaderCollapse = () => {
    setCollapsedHeader((prevState) => !prevState);
  };

  const toggleFooterCollapse = () => {
    setCollapsedFooter((prevState) => !prevState);
  };

  const toggleSubsectionCollapse = (sIndex, subIndex) => {
    setCollapsedSubsections((prevState) => ({
      ...prevState,
      [`${sIndex}-${subIndex}`]: !prevState[`${sIndex}-${subIndex}`],
    }));
  };
  //Toggle the visibility of instructions for a specific question
  const toggleInstructions = (qIndex) => {
    setVisibleInstructions((prevState) => ({
      ...prevState,
      [qIndex]: !prevState[qIndex],
    }));
  };

  const toggleSectionInstructions = (sIndex) => {
    setVisibleInstructions((prevState) => ({
      ...prevState,
      [sIndex]: !prevState[sIndex],
    }));
  };

  const toggleComment = (qIndex) => {
    setVisibleComment((prevState) => ({
      ...prevState,
      [qIndex]: !prevState[qIndex],
    }));
  };


  const calculateQuesMaxScore = (question) => {
    if (!question) {
      console.error("Error: Question is undefined.");
      return 0; // Default to 0 if question is undefined
    }

    let maxPossibleScore = 0;

    try {
      if (
        question.type === "multipleChoice" ||
        question.type === "fiveRankedList" ||
        question.type === "twoRankedList" ||
        question.type === "drpdwn"
      ) {
        // Ensure scores array is valid and not empty
        if (Array.isArray(question.scores) && question.scores.length > 0) {
          maxPossibleScore = Math.max(...question.scores.map(Number));
        }
      } else if (question.questionOptionType === "checkboxes") {
        if (Array.isArray(question.options) && Array.isArray(question.scores)) {
          question.options.forEach((option, oIndex) => {
            maxPossibleScore += Number(question.scores[oIndex] || 0);
          });
        }
      } else if (question.type === "shortAnswer" || question.type === "paragraph") {
        // Single score value or default to 0
        maxPossibleScore = Number(question.scores?.[0] || 0);
      }
    } catch (error) {
      console.error("Error Calculating Question Max Score:", error);
    }

    return maxPossibleScore;
  };

  const calculateSubSectionMaxScore = (subsection) => {
    let totalPossibleScore = 0;
    let length = 0;
    try {
      subsection.questions.forEach((question, qIndex) => {
        const maxQscore = calculateQuesMaxScore(question);
        totalPossibleScore += maxQscore;
        if (question.scorable) {
          length += 1;
        }
      });
      switch (subsection.scoringMethod) {
        case 'Question Sum':
          break;
        case 'Question Average':
          totalPossibleScore = (totalPossibleScore / length) || 0;
          break;
        case 'Question Percentage':
          if (totalPossibleScore !== 0) {
            totalPossibleScore = subsection.basePercentage;
            break;
          }
          else
            totalPossibleScore = 0;
          break;
        case 'None':
          totalPossibleScore = 0;
          break;
        default:
          break;
      }
      return totalPossibleScore || 0;
    }
    catch (error) {
      console.error("Error calculating Sub Section Max Score : ", error);
      return 0;
    }
  };

  const calculateSectionMaxScore = (section) => {
    let totalPossibleScore = 0;
    let qmaxpossiblescore = 0;
    let length = 0;
    let sublength = 0;

    try {
      section.subsections.forEach((subsection, subIndex) => {
        let hasQuestions = false;
        subsection.questions.forEach((question) => {
          const qMaxscore = calculateQuesMaxScore(question);
          qmaxpossiblescore += qMaxscore;
          if (question.scorable) {
            length += 1;
          }
          hasQuestions = true;
        })
        if (hasQuestions) {
          sublength += 1;
          const ssmaxScore = calculateSubSectionMaxScore(subsection);
          totalPossibleScore += ssmaxScore
        }
      });
      switch (section.scoringMethod) {
        case 'Question Sum':
          totalPossibleScore = qmaxpossiblescore || 0;
          break;
        case 'Question Average':
          totalPossibleScore = (qmaxpossiblescore / length) || 0;
          break;
        case 'Question Percentage':
          if (qmaxpossiblescore !== 0) {
            totalPossibleScore = section.basePercentage;
            break;
          }
          else
            totalPossibleScore = 0;
          break;
        case 'Category Sum':
          totalPossibleScore = totalPossibleScore || 0;
          break;
        case 'Category Average':
          totalPossibleScore = (totalPossibleScore / sublength) || 0;
          break;
        case 'Category Percentage':
          if (qmaxpossiblescore !== 0) {
            totalPossibleScore = section.basePercentage;
            break;
          }
          else
            totalPossibleScore = 0;
          break;
        case 'None':
          totalPossibleScore = 0;
          break;

        default:
          break;
      }
      return (totalPossibleScore);
    }
    catch (error) {
      console.error("Error calculating Section Max Score : ", error);
      return;
    }
  };

  const calculateMaxFormScore = (sections, scoringMethod) => {
    let totalScore = 0;
    let questionMaxPosibleScore = 0;
    let length = 0;
    let sublength = 0;
    let sectionCount = 0;
    let subsectionMaxScore = 0;
    let sectionMaxScore = 0;

    try {
      sections.forEach((section) => {
        let hasSubsections = false;
        let sectionScore = 0; // Store max score per section

        section.subsections.forEach((subSection) => {
          let hasQuestions = false;
          let subMaxScore = 0; // Store max score per subsection

          subSection.questions.forEach((question) => {
            const qMaxscore = calculateQuesMaxScore(question);
            questionMaxPosibleScore += qMaxscore;
            subMaxScore += qMaxscore; // Add question score to subsection

            if (question.scorable) {
              length += 1;
            }
            hasQuestions = true;
          });

          if (hasQuestions) {
            subsectionMaxScore += subMaxScore;
            sectionScore += subMaxScore; // Add subsection score to section
            sublength += 1;
            hasSubsections = true;
          }
        });

        if (hasSubsections) {
          sectionMaxScore += sectionScore;
          sectionCount += 1;
        }
      });

      switch (scoringMethod) {
        case 'Section Sum':
          totalScore = sectionMaxScore || 0;
          break;
        case 'Section Average':
          totalScore = sectionMaxScore / sectionCount || 0;
          break;
        case 'Section Percentage':
          if (questionMaxPosibleScore !== 0) {
            totalScore = basePercentage
            break;
          }
          else
            totalScore = 0
          break;
        case 'Category Sum':
          totalScore = subsectionMaxScore;
          break;
        case 'Category Average':
          totalScore = subsectionMaxScore / sublength || 0;
          break;
        case 'Category Percentage':
          totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0;
          break;
        case 'Question Sum':
          totalScore = questionMaxPosibleScore;
          break;
        case 'Question Average':
          totalScore = questionMaxPosibleScore / length || 0;
          break;
        case 'Question Percentage':
          totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0;
          break;
        case 'None':
        default:
          totalScore = 0;
          break;
      }

      return totalScore;
    } catch (error) {
      console.error("Error calculating Max Form Score:", error);
      return 0;
    }
  };
  const handleCancel = () => {
    router.back();
    // setTimeout(() => {
    //   window.location.reload();
    // }, 100);
  };
  const emojiMap = {
    'Yes': "\u{1F44D}",
    'No': "\u{1F44E}",
    'N/A': "\u{1F6AB}",
  };

  const emojiMap1 = {
    "Excellent": "\u{1F60D}",
    "Good": "\u{1F60A}",
    "Average": "\u{1F610}",
    "Fair": "\u{1F61F}",
    "Poor": "\u{1F621}",
    "N/A": "\u{1F6AB}"
  };

  const starTextMapping = {
    0: "N/A",
    1: "Poor",
    2: "Fair",
    3: "Average",
    4: "Good",
    5: "Excellent",
  };
  const ratingMap = {
    "N/A": 0,
    "Poor": 1,
    "Fair": 2,
    "Average": 3,
    "Good": 4,
    "Excellent": 5,
  };

  return (
    <div ref={contentRef} id="form-preview-content" style={{ marginTop: 0 }}>
      <div className="no-print">
        {/* <FormPreviewerNavbar
          isPreviewFull={isPreviewFull}
          setIsPreviewFull={setIsPreviewFull}
          handleBack={handleCancel}
          togglePreviewMode={""}
          toggleMaxScore={toggleMaxScore}
          handleDownloadAsPDF={handleDownloadPDF}
          handlePrint={handlePrint} /> */}
        <DynamicformNavbar
          isPreviewFull={isPreviewFull}
          setIsPreviewFull={(val) => { setIsPreviewFull(val); onStructureToggle && onStructureToggle(!val); }}
          toggleMaxScore={toggleMaxScore}
          handleDownloadAsPDF={handleDownloadPDF}
          handlePrint={handlePrint}
          onClose={onClose}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
        />
      </div>
      <div className="form-preview-content" style={{ marginTop: "-10px" }}>
        {!isPreviewFull && (
          <div className="form-structure no-print">
            <div className="form-tree-navbar">
              Form Structure
            </div>
            <FormStructure
              sections={sections}
              formName={formName}
              showQuestions={true}
              header={header}
              footer={footer}
            />
          </div>
        )}
        <div className={`form-preview ${isPreviewFull ? "full-preview" : ""}`}
          style={{
            overflowY: "auto",

          }}>
          <div className="form-details" id="form">
            <h3>{formName || "Untitled Form"}</h3>
            <div className="form-score">
              {!hideFormScore && scoringMethod !== "None" && (
                <div className="totalform-score">
                  <h4>
                    {Number(totalformScore).toFixed(2)}
                  </h4>
                </div>
              )}
              {visbleMaxScore && scoringMethod !== "None" &&
                (<div className="Form-Max-Score-container">
                  <h4>Max Score {calculateMaxFormScore(sections, scoringMethod).toFixed(2)}</h4>
                </div>)
              }
            </div>
            <p>
              <div dangerouslySetInnerHTML={{ __html: formDescription }} />
            </p>
          </div>
          <div className="header-section" id="header">
            <h3>
              <div className="header-container-header">
                <span className="header-details">{header?.name || "Details"}</span>
                <div className="header-button-group">
                  {header?.description && (
                    <i
                      className="fa fa-info-circle instruction-button"
                      onClick={() => toggleInstructions(header?.id)}
                    />
                  )}

                  {/* Comment Button */}
                  {header?.enableComment && (
                    <i
                      className="fa fa-comment comment-button"
                      onClick={() => toggleComment(header?.id)}
                    />
                  )}

                  {/* Collapse Button */}
                  <div className="collapse-button">
                    <i
                      onClick={toggleHeaderCollapse}
                      className={
                        collapsedHeader ? "fa fa-plus-circle" : "fa fa-minus-circle"
                      }
                    />
                  </div>
                </div>
              </div>
              {!collapsedHeader && (
                <>
                  {visibleInstructions[header?.id] && header?.description && (
                    <div
                      className="instruction-box"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtmlContent(header?.description),
                      }}
                      style={{
                        textAlign: "inherit", // Alignment maintain kare
                        listStyle: "inherit", // Bullets and numbering maintain kare
                      }}
                    />
                  )}
                </>
              )}
            </h3>
            {!collapsedHeader && visibleComment[header?.id] && (
              <div className="header-instruction-box mt-2 mb-2 p-5 bg-secondary w-full rounded-lg shadow-md transition-transform duration-300 border border-border max-h-full">
                <label className="header-comment-label">
                  <span className="block mt-1 mb-1 text-xs font-medium">
                    {header.HeaderComment || "No comment provided"}
                  </span>
                </label>
              </div>
            )}
            {!collapsedHeader && (
              <div className="evaluator-title">
                <h3>
                  <span className="evaluator-label">Evaluator: </span>
                  <span className="evaluator-name">{evaluator}</span>
                </h3>
                <h3>
                  {header?.customFields?.length > 0
                    ? header.customFields.map((field, index) => (
                      <span key={index} className="custom-field">
                        <strong>{field.customfieldlable}</strong>: {field.value}
                        {index !== header.customFields.length - 1 && " | "}
                      </span>
                    ))
                    : "No Custom Fields"}
                </h3>
              </div>
            )}
          </div>
          <form className="form-container overflow-hidden">
            {sections.map((section, sIndex) => {
              const sectionScore = section.sectionScore;
              const Smaxscore = calculateSectionMaxScore(section);
              const secId = `${sIndex}`;
              const isSectionCollapsed = collapsedSections[sIndex];
              const isSectionHidden = hiddenSections[secId];
              const isSectionDisabled = disabledSections[secId];
              if (isSectionHidden) {
                return null;
              }
              handleSectionResponseScore(sIndex, sectionScore);
              return (

                <div key={sIndex} id={`section-${sIndex}`} className={`preview-section ${isSectionDisabled ? 'disabled' : ''}`}>
                  <input type="hidden" name={`total-score`} value={sectionScore} />
                  <h4>
                    <div className="header-container">
                      <span className="section-details">
                        {section.sectionDetails || ""}
                      </span>
                      <div className="button-group">
                        {section.sectionDescription && (
                          <i
                            className="fa fa-info-circle instruction-button"
                            onClick={() => toggleInstructions(sIndex)}
                          >
                            {visibleInstructions[sIndex]}
                          </i>
                        )}

                        {section.enableComment && (
                          <i
                            className="fa fa-comment comment-button"
                            onClick={() => toggleComment(secId)}
                          >
                            {visibleComment[secId]}
                          </i>
                        )}
                        <div className="collapse-button">
                          <i
                            type="button"
                            onClick={() => toggleSectionCollapse(sIndex)}
                            className={isSectionCollapsed ? "fa fa-plus-circle" : "fa fa-minus-circle"}
                          ></i>
                        </div>

                        <div className="section-score-box">
                          {!section.hideScore && section.scoringMethod !== "None" && (
                            <div className="section-score">
                              <h4>{sectionScore.toFixed(2)}</h4>
                            </div>
                          )}
                          {visbleMaxScore && section.scoringMethod !== "None" &&
                            (<div className="Section-Max-Score-container">
                              <h4>Max Score {Smaxscore.toFixed(2)}</h4>
                            </div>)
                          }
                        </div>
                      </div>
                    </div>
                    {visibleInstructions[sIndex] && section.sectionDescription && (
                      <div className="instruction-box">
                        <div dangerouslySetInnerHTML={{ __html: section.sectionDescription }} />
                      </div>
                    )}
                  </h4>
                  {!isSectionCollapsed && visibleComment[secId] && (
                    <div className="section-instruction-box mt-2 mb-2 p-5 bg-secondary w-full rounded-lg shadow-md transition-transform duration-300 border border-border max-h-full">
                      <label className="section-comment-label">
                        <span className="block mt-1 mb-1 text-xs text-blue-700 font-medium">
                          {section.SectionComment || "No comment provided"}
                        </span>
                      </label>
                    </div>

                  )}

                  {!isSectionCollapsed && section.subsections &&
                    section.subsections.map((subsection, subIndex) => {
                      const subsectionScore = subsection.subsectionScore;
                      const SSmaxScore = calculateSubSectionMaxScore(subsection)
                      const subId = `${sIndex}-${subIndex}`;
                      const isSubsectionCollapsed = collapsedSubsections[`${sIndex}-${subIndex}`];
                      const isSubsectionDisabled = disabledSubsections[subId];
                      const isSubsectionHidden = hiddenSubsections[subId];

                      if (isSubsectionHidden) {
                        return null;
                      }

                      handleSubsectionResponseScore(sIndex, subIndex, subsectionScore);
                      return (
                        <div key={subIndex} id={`subsection-${sIndex}-${subIndex}`} className={`preview-subsection ${isSubsectionDisabled ? "disabled" : "" || isSectionDisabled}`}>

                          <h4>
                            <div className="header-container">
                              <span className="sub-section-details">
                                {subsection.subsectionDetails || ""}
                              </span>
                              <div className="button-group">


                                {subsection.subsectionDescription && (
                                  <i className="fa fa-info-circle instruction-button" onClick={() => toggleSectionInstructions(subId)}>
                                    {visibleInstructions[subId]}
                                  </i>
                                )}

                                {subsection.enableComment && (
                                  <i className="fa fa-comment comment-button" onClick={() => toggleComment(subId)}>
                                    {visibleComment[subId]}
                                  </i>
                                )}
                                <div className="collapse-button">
                                  <i
                                    type="button"
                                    onClick={() => toggleSubsectionCollapse(sIndex, subIndex)}
                                    className={isSubsectionCollapsed ? "fa fa-plus-circle" : "fa fa-minus-circle"}
                                  >
                                  </i>
                                </div>
                                <div className="sub-section-score-box">
                                  {!subsection.hideScore && (
                                    <>
                                      {subsection.scoringMethod === "None" ? (
                                        // Show the score box only if the score is defined and the answer is correct
                                        (scores[`${sIndex}-${subIndex}`] !== undefined && scores[`${sIndex}-${subIndex}`] >= 0) ? (
                                          <div className="subsection-score">
                                            <h4>{scores[`${sIndex}-${subIndex}`].toFixed(2)}</h4>
                                          </div>
                                        ) : null // Hide the score box if the score is undefined or negative
                                      ) : (
                                        // Show subsection score only if it's greater than or equal to 0
                                        subsectionScore >= 0 && ( // Show when the score is >= 0
                                          <div className="subsection-score">
                                            <h4>{subsectionScore.toFixed(2)}</h4>
                                          </div>
                                        )
                                      )}
                                      {visbleMaxScore && subsection.scoringMethod !== "None" && (
                                        <div className="Sub-Max-Score-container">
                                          <h4>Max Score {parseFloat(SSmaxScore).toFixed(2)}</h4>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>

                              </div>
                            </div>
                            {!isSubsectionCollapsed && visibleInstructions[subId] && subsection.subsectionDescription && (
                              <div className="instruction-box">
                                <div dangerouslySetInnerHTML={{ __html: subsection.subsectionDescription }} />
                              </div>
                            )}
                          </h4>
                          {!isSubsectionCollapsed && visibleComment[subId] && (
                            <div className="sub-section-instruction-box mt-2 mb-4 p-2 bg-card rounded-lg shadow-md transition-transform duration-300 border border-border max-h-16">
                              <label className="sub-section-comment-label">
                                <span className="block mt-1 text-xs text-blue-700 font-medium">
                                  {subsection.SubSectionComment || "No comment provided"}
                                </span>
                              </label>
                            </div>

                          )}
                          {!isSubsectionCollapsed &&
                            subsection.questions.map((question, qIndex) => {
                              const questionId = `${sIndex}-${subIndex}-${qIndex}`;

                              const maxQuestionScore = calculateQuesMaxScore(question)
                              let subquestionScore = question.questionScore;
                              const isDisabled = disabledQuestions[questionId];
                              const isScoreQuestionDisabled = disabledScoreQuestions[questionId]
                              if (hiddenQuestions[questionId]) {
                                return null; // Don't render the question if it's hidden
                              }
                              //if (isHidden) return null;

                              handleQuestionResponseScore(sIndex, subIndex, qIndex, subquestionScore);
                              return (
                                <div key={qIndex} className="preview-question" id={`question-${sIndex}-${subIndex}-${qIndex}`}>
                                  <div className="sub-question-header">
                                    <div className="question-header">
                                      <p className="question-number">{qIndex + 1}.</p>
                                      <p className="question-text">
                                        {question.question || ""}
                                        {question.required && (
                                          <span className="required-indicator">*</span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="scorebox">
                                      <div className="question-icons">
                                        {question.SubQuestionInstructions && (
                                          <i
                                            className="fa fa-info-circle instruction-button"
                                            onClick={() => toggleInstructions(questionId)}
                                          >
                                            {visibleInstructions[questionId]}
                                          </i>
                                        )}
                                        {question.enableComment && (
                                          <i
                                            className="fa fa-comment comment-button"
                                            onClick={() => toggleComment(questionId)}
                                          >
                                            {visibleComment[questionId]}
                                          </i>
                                        )}
                                      </div>
                                      {/* Render max score if applicable */}
                                      {question.scorable &&
                                        visbleMaxScore &&
                                        question.questionOptionType !== "checkboxes" &&
                                        question.questionOptionType !== "dropdown" &&
                                        question.type !== "paragraph" &&
                                        question.type !== "shortAnswer" && (
                                          <div className="Question-Max-Score-container">
                                            <h4>Max Score {parseFloat(maxQuestionScore).toFixed(2)}</h4>
                                          </div>
                                        )}
                                      {/* {(responses[questionId] || scores[questionId] !== undefined) && ( */}
                                      <div>
                                        {(
                                          (question.type === "multipleChoice" ||
                                            question.type === "fiveRankedList" ||
                                            question.type === "twoRankedList" ||
                                            question.type === "drpdwn") ||
                                          question.scorable
                                        ) &&
                                          !question.hideScore &&
                                          subquestionScore !== null &&
                                          subquestionScore !== " " &&
                                          question.questionOptionType !== "checkboxes" &&
                                          question.questionOptionType !== "dropdown" &&
                                          question.type !== "paragraph" &&
                                          question.type !== "shortAnswer" && (
                                            <div className="sub-question-score">
                                              <h4>{subquestionScore}</h4>
                                            </div>
                                          )}
                                      </div>
                                      {/* )} */}
                                    </div>
                                  </div>
                                  {visibleInstructions[questionId] && question.SubQuestionInstructions && (
                                    <div className="instruction-box">
                                      <div
                                        dangerouslySetInnerHTML={{
                                          __html: sanitizeHtmlContent(
                                            question.SubQuestionInstructions
                                          ),
                                        }}
                                        style={{
                                          textAlign: "inherit", // Alignment maintain kare
                                          listStyle: "inherit", // Bullets and numbering maintain kare
                                        }}
                                      />
                                    </div>
                                  )}

                                  {question.type === "shortAnswer" && (
                                    <label className="preview-short-answer">
                                      {question.answer && question.answer.length > 0 && question.answer[0] !== ''
                                        ? question.answer
                                        : "No answer provided"}
                                    </label>
                                  )}
                                  {question.type === "paragraph" && (
                                    <label className="preview-label">
                                      {question.answer && question.answer.length > 0 && question.answer[0] !== ''
                                        ? question.answer : "No answer provided"}
                                    </label>
                                  )}

                                  {question.type === "multipleChoice" && (
                                    <div className="preview-options">
                                      {question.options.map((option, oIndex) => (
                                        <div key={oIndex} className="preview-option">
                                          <input
                                            type="radio"
                                            id={`${questionId}-${oIndex}`}
                                            name={questionId}
                                            value={option}
                                            // disabled={true} // Always disable once submitted
                                            disabled={isSectionDisabled || isSubsectionDisabled || isDisabled || isScoreQuestionDisabled}
                                            checked={question.answer.includes(option)}// Select the submitted answer
                                          />
                                          <label htmlFor={`${questionId}-${oIndex}`}>{option}</label>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {question.type === "selectMultipleChoice" && question.questionOptionType === "checkboxes" && (
                                    <div className="preview-options">
                                      {question.options.map((option, oIndex) => (
                                        <div key={oIndex} className="preview-option">
                                          <input
                                            type="checkbox"
                                            id={`${questionId}-${oIndex}`}
                                            name={`${questionId}-${oIndex}`}
                                            value={option}
                                            //disabled={true} // Disable all options
                                            disabled={isSectionDisabled || isSubsectionDisabled || isDisabled || isScoreQuestionDisabled}
                                            checked={question.answer.includes(option)} // Check the submitted answers
                                          />
                                          <label htmlFor={`${questionId}-${oIndex}`}>{option}</label>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {question.type === "selectMultipleChoice" && question.questionOptionType === "dropdown" && (
                                    <div className="custom-dropdownn text-xs">
                                      <div
                                        className="dropdown-header"
                                        style={{
                                          minWidth: `${Math.max(...question.options.map((option) => option.length * 8), 180)}px`,
                                        }}
                                        //onClick={() => toggleDropdown(qIndex)}
                                        onClick={() => {
                                          if (!(isSectionDisabled || isSubsectionDisabled || isDisabled || isScoreQuestionDisabled)) {
                                            toggleDropdown(qIndex);
                                          }
                                        }}
                                      >
                                        {Array.isArray(question.answer) && question.answer.length > 0 ? (
                                          <span className="text-foreground font-medium">{question.answer.join(", ")}</span>
                                        ) : (
                                          <span className="text-xs">Select options</span>
                                        )}
                                        <i className={`arrow ${isDropdownOpen[qIndex] ? "open" : ""}`}></i>
                                      </div>

                                      <div className={`dropdown-options text-xs ${isDropdownOpen[qIndex] ? "show" : ""}`}>
                                        {question.options.map((option, optionIndex) => {
                                          const isSelected = Array.isArray(question.answer) && question.answer.includes(option);
                                          return (
                                            <div
                                              key={optionIndex}
                                              className={`dropdown-option text-xs ${isSelected ? "bg-blue-100 font-medium" : ""}`}
                                            >
                                              <input
                                                type="checkbox"
                                                value={option}
                                                //defaultChecked={isSelected}
                                                checked={question.answer.includes(option)}
                                                disabled={isSectionDisabled || isSubsectionDisabled || isDisabled || isScoreQuestionDisabled}
                                              />
                                              <label>{option}</label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {question.type === "drpdwn" && (
                                    <select
                                      name={`section-${sIndex}-subsection-${subIndex}-question-${qIndex}-${question.type}`}
                                      className="preview-select"
                                      disabled={isSectionDisabled || isSubsectionDisabled || isDisabled}
                                      //value={question.answer || ""} // Set the selected answer here
                                      value={question.answer && question.answer.length > 0 && question.answer[0] !== ''
                                        ? question.answer
                                        : "No answer selected"}
                                    >
                                      <option value="">-- Select an option --</option>
                                      {question.options.map((option, oIndex) => (
                                        <option
                                          key={oIndex}
                                          value={option}
                                          // disabled={question.answer && question.answer !== option || isSectionDisabled || isSubsectionDisabled || isDisabled || isScoreQuestionDisabled}
                                          disabled={isSectionDisabled || isSubsectionDisabled || isDisabled || isScoreQuestionDisabled}
                                        >
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  {question.type === "fiveRankedList" && (
                                    <div className="preview-options">
                                      {question.questionOptionType === "fiveStar" ? (
                                        <div
                                          className="five-star-container"
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            margin: '4px 0',
                                            width: 'fit-content',
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'center',
                                              marginBottom: '0px',
                                              gap: '5px',
                                            }}
                                          >
                                            {question.options.map((option, oIndex) => {
                                              // Get the current value of the star rating for this question
                                              const currentValue = question.answer;

                                              // Check if the current star should be selected
                                              const isSelected =
                                                currentValue === option ||
                                                (currentValue !== "N/A" &&
                                                  currentValue &&
                                                  ratingMap[currentValue] >= (ratingMap[option] || 0));

                                              return (
                                                <span
                                                  key={oIndex}
                                                  className={`star-icon ${isSelected ? "selected" : ""}`}
                                                  style={{
                                                    fontSize: '26px',
                                                    color: isSelected ? '#FFD700' : '#ddd',
                                                    cursor: 'pointer',
                                                    marginRight: '15px',
                                                    transition: 'all 0.3s ease',
                                                    padding: '8px',
                                                    transform: 'scale(1)',
                                                  }}
                                                  onMouseEnter={(e) => (e.target.style.transform = 'scale(1.2)')}
                                                  onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                                                >
                                                  ★
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )
                                        : question.questionOptionType === "slider" ? (
                                          (() => {
                                            const responseValue = responses[`${sIndex}-${subIndex}-${qIndex}`]; // Get response string (like "Good", "Poor", etc.)
                                            const ratingMap = {
                                              "N/A": 0,
                                              "Poor": 1,
                                              "Fair": 2,
                                              "Average": 3,
                                              "Good": 4,
                                              "Excellent": 5,
                                            };

                                            // Ensure we use numeric slider values
                                            const sliderValue = typeof responseValue === "string" ? ratingMap[responseValue] : responseValue ?? 0;

                                            // Map sliderValue back to the rating string for display
                                            const sliderText = ["N/A", "Poor", "Fair", "Average", "Good", "Excellent"][sliderValue];

                                            return (
                                              <div className="slider-container">
                                                <input
                                                  type="range"
                                                  min="0"
                                                  max="5"
                                                  step="1"
                                                  value={sliderValue}  // Dynamically set slider position based on the response

                                                  className="slider"
                                                  style={{ width: '100%', marginBottom: '10px' }}
                                                />
                                                <div className="slider-marks" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                  {["N/A", "Poor", "Fair", "Average", "Good", "Excellent"].map((mark, index) => (
                                                    <span
                                                      key={index}
                                                      className={`slider-mark ${sliderValue === index ? 'active-mark' : ''}`}
                                                      style={{
                                                        fontSize: '12px',
                                                        fontWeight: sliderValue === index ? 'bold' : 'normal',
                                                        color: sliderValue === index ? '#FFD700' : 'hsl(var(--foreground))',
                                                      }}
                                                    >
                                                      {mark}
                                                    </span>
                                                  ))}
                                                </div>
                                                <p className="rating-text" style={{ fontSize: '14px', marginTop: '10px' }}>
                                                  {sliderValue !== undefined && sliderValue !== null
                                                    ? `${sliderText} (${sliderValue} out of 5)`
                                                    : "No rating selected"}
                                                </p>
                                              </div>
                                            );
                                          })()
                                        ) : question.questionOptionType === "emojiStars" ? (
                                          <div
                                            className="emoji-stars-container"
                                            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                                          >
                                            {question.options.map((emoji, oIndex) => {
                                              // Normalize values to check for selection
                                              const isSelected =
                                                (emojiMap1[question.answer] || question.answer) === (emojiMap1[emoji] || emoji);

                                              return (
                                                <div
                                                  key={oIndex}
                                                  className={`emoji-stars-wrapper ${isSelected ? 'selected' : ''}`}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    border: 'none',
                                                    padding: '5px 10px',
                                                    borderRadius: '5px',
                                                    backgroundColor: isSelected ? 'rgba(147, 197, 253, 0.8)' : 'transparent', // Light blue for selected, transparent for unselected
                                                    cursor: isSelected ? 'default' : 'not-allowed', // Disable unselected
                                                    opacity: 1, // Do not dim unselected
                                                  }}
                                                >
                                                  {/* Emoji Display */}
                                                  <span
                                                    style={{
                                                      fontSize: '31px',
                                                      color: isSelected ? '#1e293b' : '#64748b',
                                                      WebkitPrintColorAdjust: 'exact',
                                                      printColorAdjust: 'exact',
                                                    }}
                                                  >
                                                    {emojiMap1[emoji] || emoji}
                                                  </span>

                                                  {/* Stars Display */}
                                                  <div style={{ display: 'flex', gap: '13px' }}>
                                                    {[...Array(5)].map((_, starIndex) => (
                                                      <span
                                                        key={starIndex}
                                                        className="star-icon"
                                                        style={{
                                                          fontSize: '1.5rem',
                                                          color: starIndex + 1 <= question.scores[oIndex] ? '#1e293b' : '#cbd5e1',
                                                          WebkitPrintColorAdjust: 'exact',
                                                          printColorAdjust: 'exact',
                                                        }}
                                                      >
                                                        ★
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )
                                          : (
                                            question.options.map((option, oIndex) => (
                                              <div key={oIndex} className="preview-option">
                                                <input
                                                  type="radio"
                                                  id={`${questionId}-${oIndex}`}
                                                  name={`sub-question-${sIndex}-${subIndex}-${qIndex}`}
                                                  checked={question.answer.includes(option)}
                                                  //disabled={true}
                                                  disabled={isSectionDisabled || isSubsectionDisabled || isDisabled || isScoreQuestionDisabled}
                                                />
                                                {/* <label htmlFor={`${questionId}-${oIndex}`}>{option}</label> */}
                                                <label htmlFor={`${questionId}-${oIndex}`}>
                                                  {question.questionOptionType === "emojiStars" && question.type === "fiveRankedList"
                                                    ?
                                                    (emojiMap1[option] || option) : option}
                                                </label>
                                              </div>
                                            ))
                                          )}
                                    </div>
                                  )}

                                  {question.type === "twoRankedList" && (
                                    <div className="preview-options">
                                      {question.options.map((option, oIndex) => (
                                        <div
                                          key={oIndex}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                          }}
                                          className={`preview-option ${question.questionOptionType === "emoji" ? "emoji-preview" : ""
                                            }`}
                                        >
                                          <input
                                            type="radio"
                                            id={`${questionId}-${oIndex}`}
                                            name={`section-${sIndex}-subsection-${subIndex}-question-${qIndex}-${question.type}-${oIndex}`}
                                            value={option}
                                            disabled={isSectionDisabled || isSubsectionDisabled || isDisabled || isScoreQuestionDisabled}
                                            checked={question.answer.includes(option)} // Determine the selected answer
                                            //disabled={true} // Make it read-only
                                            style={{
                                              display: question.questionOptionType === "emoji" ? "none" : "inline-block", // Hide radio button for emoji
                                            }}
                                          />
                                          <label
                                            htmlFor={`${questionId}-${oIndex}`}
                                            className={`${question.questionOptionType === "emoji" ? "emoji-label" : ""} ${question.answer.includes(option) ? "selected" : "" // Apply selected class for highlight
                                              }`}
                                            style={{
                                              fontSize:
                                                question.questionOptionType === "emoji" ? "31px" : "12px",
                                              transform:
                                                question.questionOptionType === "emoji" && question.answer.includes(option)
                                                  ? "scale(1)" // Keep selected emojis frozen at scale(1)
                                                  : "scale(1)",
                                              transition:
                                                "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s, box-shadow 0.25s, border-color 0.25s",
                                            }}
                                          >
                                            {question.questionOptionType === "emoji" && question.type === "twoRankedList"
                                              ? (emojiMap[option] || option)
                                              : option
                                            }
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {visibleComment[questionId] && (
                                    <div className="question-instruction-box mt-2 mb-2 p-5 bg-secondary w-full rounded-lg shadow-md transition-transform duration-300 border border-border max-h-full">
                                      <label className="question-comment-label">
                                        <span className="block mt-1 mb-1 text-xs font-medium">
                                          {question.QuestionComment || "No comment provided"}
                                        </span>
                                      </label>
                                    </div>

                                  )}
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}

                </div>
              );
            })}
            <div className="footer-section" id="footer">
              <h3>
                <div className="footer-container-footer">
                  <span className="footer-details">{footer?.name || "Summary"}</span>
                  <div className="button-group">
                    {footer?.description && (
                      <i
                        className="fa fa-info-circle instruction-button"
                        onClick={() => toggleInstructions(footer)}
                      >
                        {visibleInstructions[footer]}
                      </i>
                    )}
                    {footer?.enableComment && (
                      <i
                        className="fa fa-comment comment-button"
                        onClick={() => toggleComment(footer)}
                      >
                        {visibleComment[footer]}
                      </i>
                    )}
                    <div className="collapse-button">
                      <i
                        onClick={toggleFooterCollapse}
                        className={
                          collapsedFooter ? "fa fa-plus-circle" : "fa fa-minus-circle"
                        }
                      />
                    </div>
                  </div>
                </div>
                {!collapsedFooter && (
                  <>
                    {visibleInstructions[footer] && footer?.description && (
                      <div
                        className="instruction-box"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtmlContent(footer?.description),
                        }}
                        style={{
                          textAlign: "inherit", // Alignment maintain kare
                          listStyle: "inherit", // Bullets and numbering maintain kare
                        }}
                      />
                    )}
                  </>
                )}
              </h3>
              {!collapsedFooter && visibleComment[footer] && (
                <div className="footer-instruction-box mt-2 mb-4 p-2 bg-card rounded-lg shadow-md transition-transform duration-300 border border-border max-h-16">
                  <label className="footer-comment-label">
                    <span className="block mt-1 text-xs text-blue-700 font-medium">
                      {footer.FooterComment || "No comment provided"}
                    </span>
                  </label>
                </div>

              )}
            </div>
          </form>

        </div>
      </div>
    </div >
  );
};

export default withAuth(SubmittedForm);

