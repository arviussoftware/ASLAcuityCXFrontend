"use client";
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import CryptoJS from "crypto-js";
import SubSection from "./SubSection";
import FormPreviewer from "./FormPreviewer";
import "./Styles/form_builder_2.css";
import "./Styles/media_query_form_builder.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import FormRule from "./FormRule";
import { TbCategoryPlus } from "react-icons/tb";
import { Trash2, Copy } from "lucide-react";
// import RichTextEditor from "./TextEditor";
import withAuth from "@/components/withAuth"; // Import the withAuth HOC
import FormLayout from "./FormLayout";
import dynamic from "next/dynamic";
import { getSelectedOrgIdsHeader } from "@/lib/client-org";
import InteractionTypeDDL from "./InteractionTypeDDL";
import {
  handleAddSection,
  handleAddQuestion,
  handleAddSubsection,
  handleSectionDescriptionChange,
  handleSectionDetailsChange,
  handleDeleteSubsection,
  handleDeleteSection,
  handleSubSectionDescriptionChange,
  handleSubSectionDetailsChange,
  handleSubQuestionInstructionChange,
  handleAddSubQuestion,
  handleDeleteSubQuestion,
  handleSubQuestionChange,
  handleAddSubOption,
  handleSubAnswerChange,
  handleSubRequiredChange,
  handleSubDuplicateQuestion,
  handleSubOptionChange,
  handleSubScoreChange,
  handleSubScoreableChange,
  handleQuestionChange,
  handleTypeChange,
  handleParagraphChange,
  handleOptionChange,
  handleAddOption,
  handleDeleteOption,
  handleCheckboxChange,
  handleScoreChange,
  handleDuplicateQuestion,
  handleHiddenquestionChange,
  handleDeleteQuestion,
  handleScoreableChange,
  handleRequiredChange,
  handleQuestionInstructionChange,
  handleRadioChange,
  handleSubTypeChange,
  handleSubRadioChange,
  handleHideQuestionScore,
  handleEnableSectionComment,
  handleHideSectionScoreChange,
  handleEnableQuestionComment,
  handleDefaultSelectionChange,
  handleSubDefaultSelectionChange,
  handleEnableSubSectionComment,
  handleHiddenSubquestionChange,
  handleEnableSubQuestionComment,
  handleHideSubQuestionScore,
  handleHideSubSectionScoreChange,
  handleDeleteSubOption,
  SubsectionScoringMethodChange,
  sectionScoringMethodChange,
  setSectionBasePercentage,
  setSubSectionBasePercentage,
  setSectionBaselineScore,
  setSubSectionBaselineScore,
  handleDuplicateSubsection,
  handleDuplicateSection,
} from "./formFunctions";
import FormNavbar from "./FormNavbar";
import FormSidebar from "./FormSidebar";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

// Renders children into document.body to escape any stacking context
const ModalPortal = ({ children }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return ReactDOM.createPortal(children, document.body);
};

const decryptData = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error("Error decrypting data:", error);
    return null;
  }
};

const FormBuilder = ({ formIndex, onDelete }) => {
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  // const [header, setHeader] = useState("");
  const [header, setHeader] = useState({
    name: "Details",
    description: "",
    customFields: [],
    enableComment: false,
    isCollapsed: false,
  });
  const [footer, setFooter] = useState({
    name: "Summary",
    description: "",
    enableComment: false,
    isCollapsed: false,
  });

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFooterModalVisible, setIsFooterModalVisible] = useState(false);
  const [sections, setSections] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [message, setMessage] = useState("");
  const [ruleMode, setRuleMode] = useState(false);
  const [hideFormScore, setHideFormScore] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedSubsections, setCollapsedSubsections] = useState({});
  const [collapsedQuestion, setCollapsedQuestion] = useState({});
  const [visibilityRules, setVisibilityRules] = useState([]);
  const [scoringRules, setScoringRules] = useState([]);

  const router = useRouter();
  //added scoring methods
  const [basePercentage, setBasePercentage] = useState(100);
  const [scoringMethod, setScoringMethod] = useState("None");
  const [baselineScore, setBaselineScore] = useState(0);
  const [focusData, setFocusData] = useState({
    sectionIndex: null,
    subsectionIndex: null,
    questionIndex: null,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState([]);
  const [renamedFields, setRenamedFields] = useState({});
  const [selectedInteractionTypes, setSelectedInteractionTypes] = useState([]);

  const toggleOption = (id) => {
    setSelectedInteractionTypes(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  const categoryNameRefs = useRef([]);

  // Toggle collapse state for sections
  const toggleSectionCollapse = (sIndex) => {
    setCollapsedSections((prevState) => ({
      ...prevState,
      [sIndex]: !prevState[sIndex],
    }));
  };

  // Toggle collapse state for subsections
  const toggleSubsectionCollapse = (sIndex, subIndex) => {
    setCollapsedSubsections((prevState) => ({
      ...prevState,
      [`${sIndex}-${subIndex}`]: !prevState[`${sIndex}-${subIndex}`],
    }));
  };

  const toggleQuestionCollapse = (sIndex, questionKey) => {
    setCollapsedQuestion((prevState) => ({
      ...prevState,
      [`${sIndex}-${questionKey}`]: !prevState[`${sIndex}-${questionKey}`],
    }));
  };
  // useEffect(() => {
  //   const storedVisibilityRules =
  //     JSON.parse(sessionStorage.getItem("visibilityRules")) || [];
  //   const storedScoringRules =
  //     JSON.parse(sessionStorage.getItem("scoringRules")) || [];
  //   // Update the state with the retrieved rules
  //   setVisibilityRules(storedVisibilityRules);
  //   setScoringRules(storedScoringRules);
  // }, [previewMode]);

  useEffect(() => {
    try {
      const encryptedVisibilityRules =
        sessionStorage.getItem("visibilityRules");
      const encryptedScoringRules = sessionStorage.getItem("scoringRules");

      const storedVisibilityRules = encryptedVisibilityRules
        ? decryptData(encryptedVisibilityRules)
        : [];
      const storedScoringRules = encryptedScoringRules
        ? decryptData(encryptedScoringRules)
        : [];

      setVisibilityRules(storedVisibilityRules || []);
      setScoringRules(storedScoringRules || []);
    } catch (error) {
      console.error("Error loading rules from sessionStorage:", error);
      setVisibilityRules([]); // Reset to default
      setScoringRules([]); // Reset to default
    }
  }, [previewMode]);

  const togglePreviewMode = () => {
    const sanitizedFormName = DOMPurify.sanitize(formName).trim();

    if (!sanitizedFormName || sanitizedFormName === "") {
      alert("Form Name is required and cannot be empty!");
      return;
    }
    if (
      sanitizeDraftSections(sections) &&
      sanitizeDraftSubSections(sections, focusElement)
    ) {
      setPreviewMode(!previewMode);
    }
  };

  const toggleRuleMode = () => {
    setRuleMode(!ruleMode);
  };

  const handleCancelRevert = (revertedSections) => {
    const updatedSections = JSON.parse(JSON.stringify(revertedSections));
    setSections(updatedSections);

    // Also update the preview if in preview mode
    if (previewMode) {
      setPreviewMode(false);
      setTimeout(() => setPreviewMode(true), 100);
    }
  };

  function focusPassingScoreField() {
    const passingScoreField = document.getElementById("form");
    if (passingScoreField) {
      passingScoreField.focus();
      passingScoreField.scrollIntoView({ behavior: "smooth" });
    }
  }
  const handleSubmit = async (event) => {
    event.preventDefault();

    const sanitizedFormName = DOMPurify.sanitize(formName);
    const sanitizedFormDescription = DOMPurify.sanitize(formDescription);
    if (!sanitizedFormName || sanitizedFormName.trim() === "") {
      alert("Form Name is required.");
      return;
    }

    // if (!baselineScore && scoringMethod !== "None") {
    //   alert("Passing score is required.");
    //   focusPassingScoreField();
    //   return;
    // }

    if (!sanitizeSections(sections) || !sanitizeSubSections(sections)) {
      return;
    }
    setLoading(true);

    const encryptedVisibilityRules = sessionStorage.getItem("visibilityRules");
    const storedVisibilityRules = encryptedVisibilityRules
      ? decryptData(encryptedVisibilityRules)
      : [];

    const encryptedScoringRules = sessionStorage.getItem("scoringRules");
    const storedScoringRules = encryptedScoringRules
      ? decryptData(encryptedScoringRules)
      : [];

    const encryptedDisabledOptions = sessionStorage.getItem("disabledOptions");
    const storedDisabledOptions = encryptedDisabledOptions
      ? decryptData(encryptedDisabledOptions)
      : { first: [], second: [] };

    const formattedDisabledOptions = {
      first: Array.isArray(storedDisabledOptions.first)
        ? storedDisabledOptions.first
        : [],
      second: Array.isArray(storedDisabledOptions.second)
        ? storedDisabledOptions.second
        : [],
    };
    // ✅ Visibility Rule Validation
    const visibilityRulesArray = Array.isArray(storedVisibilityRules)
      ? storedVisibilityRules
      : [];

    if (visibilityRulesArray.length !== 0) {
      let visibilityAlertMessage = "";
      let isVisibilityValid = true;

      visibilityRulesArray.forEach((rule) => {
        if (!rule) return;

        const hasFirstOption =
          rule.firstOption && rule.firstOption.trim() !== "";
        const hasComparison = rule.comparison && rule.comparison.trim() !== "";
        const hasSecondOption =
          rule.secondOption && rule.secondOption.trim() !== "";
        const hasThenAction = rule.thenAction && rule.thenAction.trim() !== "";

        const hasCheckedOptions =
          Array.isArray(rule.checkedOptions) &&
          rule.checkedOptions.some(
            (opt) => opt !== null && opt !== undefined && opt.trim() !== ""
          );

        // 🟥 Case 1: Empty or explicitly invalid rule
        if (rule.emptyRule || rule.invalid) {
          if (!visibilityAlertMessage)
            visibilityAlertMessage =
              "Please select at least one valid condition in the visibility rule before saving.";
          isVisibilityValid = false;
          return;
        }

        // 🟨 Case 2: Missing required fields
        if (
          !hasFirstOption ||
          !hasComparison ||
          !hasSecondOption ||
          !hasThenAction ||
          !hasCheckedOptions
        ) {
          if (!visibilityAlertMessage)
            visibilityAlertMessage =
              "Please complete all required fields in the visibility rule before saving.";
          isVisibilityValid = false;
          return;
        }
      });

      if (!isVisibilityValid) {
        alert(visibilityAlertMessage);
        setLoading(false);
        return false;
      }
    }

    // ✅ Scoring Rule Validation
    const scoringRulesArray = Array.isArray(storedScoringRules)
      ? storedScoringRules
      : [];

    if (scoringRulesArray.length !== 0) {
      let scoringAlertMessage = "";
      let isScoringValid = true;

      scoringRulesArray.forEach((rule) => {
        if (!rule) return;

        const hasFirstOption =
          rule.firstOption && rule.firstOption.trim() !== "";
        const hasComparison = rule.comparison && rule.comparison.trim() !== "";
        const hasThenAction = rule.thenAction && rule.thenAction.trim() !== "";

        const hasCheckedOptions =
          Array.isArray(rule.checkedOptions) &&
          rule.checkedOptions.some(
            (opt) => opt !== null && opt !== undefined && opt.trim() !== ""
          );

        const hasSecondOption =
          rule.secondOption && rule.secondOption.trim() !== "";

        // 🟥 Case 1: Empty or explicitly invalid rule
        if (rule.emptyRule || rule.invalid) {
          if (!scoringAlertMessage)
            scoringAlertMessage =
              "Please select at least one valid condition in the scoring rule before saving.";
          isScoringValid = false;
          return;
        }

        // 🟨 Case 2: Missing any required field
        if (
          !hasFirstOption ||
          !hasComparison ||
          !hasThenAction ||
          !hasCheckedOptions
        ) {
          if (!scoringAlertMessage)
            scoringAlertMessage =
              "Please complete all required fields in the scoring rule before saving.";
          isScoringValid = false;
          return;
        }
      });

      if (!isScoringValid) {
        alert(scoringAlertMessage);
        setLoading(false);
        return false;
      }
    }
    try {
      // const currentUserId = sessionStorage.getItem("user")
      //   ? JSON.parse(sessionStorage.getItem("user")).userId
      //   : null;
      const encryptedUserData = sessionStorage.getItem("user");

      let currentUserId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          currentUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }
      // const filteredCustomFields = header.customFields?.filter((field) =>
      //   selectedFields.includes(field.name)
      // ) || [];

      const filteredCustomFields =
        header.customFields
          ?.filter((field) => selectedFields.includes(field.name))
          .map((field) => ({
            name: field.name, // Store original name
            customfieldlable: renamedFields[field.name] || field.name,
          })) || [];

      const response = await fetch("/api/forms/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          formName: sanitizedFormName,
          formDescription: sanitizedFormDescription,
          sections,
          hideFormScore,
          basePercentage,
          scoringMethod,
          baselineScore,
          selectedInteractionTypes,
          visibilityRules: storedVisibilityRules, // Use values from local storage directly
          scoringRules: storedScoringRules,
          disabledOptions: formattedDisabledOptions,
          Status: 1,
          currentUserId,
          auditAction: "FORM_CREATED",
          header: {
            ...header,
            customFields: filteredCustomFields,
          },
          footer,
        }),
      });
      // const result = await response.json();

      if (response.ok) {
        alert("Form saved successfully!");
        setTimeout(() => {
          router.back();
        }, 1000);
      }
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "Error saving form: Form with the same name already exists. Please create another form"
          );
        } else {
          throw new Error(
            "Failed to save the form users. Please try again later."
          );
        }
      }
    } catch (error) {
      alert(`${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async (event) => {
    event.preventDefault();

    const sanitizedFormName = DOMPurify.sanitize(formName);
    const sanitizedFormDescription = DOMPurify.sanitize(formDescription);

    if (!sanitizedFormName || sanitizedFormName.trim() === "") {
      alert("Form Name is required.");
      return;
    }
    // if (
    //   !sanitizeDraftSections(sections) ||
    //   !sanitizeDraftSubSections(sections)
    // ) {
    //   return;
    // }
    setLoading(true);
    const encryptedVisibilityRules = sessionStorage.getItem("visibilityRules");
    const storedVisibilityRules = encryptedVisibilityRules
      ? decryptData(encryptedVisibilityRules)
      : [];

    const encryptedScoringRules = sessionStorage.getItem("scoringRules");
    const storedScoringRules = encryptedScoringRules
      ? decryptData(encryptedScoringRules)
      : [];

    const encryptedDisabledOptions = sessionStorage.getItem("disabledOptions");
    const storedDisabledOptions = encryptedDisabledOptions
      ? decryptData(encryptedDisabledOptions)
      : { first: [], second: [] };

    //  Ensure disabledOptions is sent as an array, not a Set
    const formattedDisabledOptions = {
      first: Array.isArray(storedDisabledOptions.first)
        ? storedDisabledOptions.first
        : [],
      second: Array.isArray(storedDisabledOptions.second)
        ? storedDisabledOptions.second
        : [],
    };
    // ✅ Visibility Rule Validation
    const visibilityRulesArray = Array.isArray(storedVisibilityRules)
      ? storedVisibilityRules
      : [];

    if (visibilityRulesArray.length !== 0) {
      let visibilityAlertMessage = "";
      let isVisibilityValid = true;

      visibilityRulesArray.forEach((rule) => {
        if (!rule) return;

        const hasFirstOption =
          rule.firstOption && rule.firstOption.trim() !== "";
        const hasComparison = rule.comparison && rule.comparison.trim() !== "";
        const hasSecondOption =
          rule.secondOption && rule.secondOption.trim() !== "";
        const hasThenAction = rule.thenAction && rule.thenAction.trim() !== "";

        const hasCheckedOptions =
          Array.isArray(rule.checkedOptions) &&
          rule.checkedOptions.some(
            (opt) => opt !== null && opt !== undefined && opt.trim() !== ""
          );

        // 🟥 Case 1: Empty or explicitly invalid rule
        if (rule.emptyRule || rule.invalid) {
          if (!visibilityAlertMessage)
            visibilityAlertMessage =
              "Please select at least one valid condition in the visibility rule before saving.";
          isVisibilityValid = false;
          return;
        }

        // 🟨 Case 2: Missing required fields
        if (
          !hasFirstOption ||
          !hasComparison ||
          !hasSecondOption ||
          !hasThenAction ||
          !hasCheckedOptions
        ) {
          if (!visibilityAlertMessage)
            visibilityAlertMessage =
              "Please complete all required fields in the visibility rule before saving.";
          isVisibilityValid = false;
          return;
        }
      });

      if (!isVisibilityValid) {
        alert(visibilityAlertMessage);
        setLoading(false);
        return false;
      }
    }

    // ✅ Scoring Rule Validation
    const scoringRulesArray = Array.isArray(storedScoringRules)
      ? storedScoringRules
      : [];

    if (scoringRulesArray.length !== 0) {
      let scoringAlertMessage = "";
      let isScoringValid = true;

      scoringRulesArray.forEach((rule) => {
        if (!rule) return;

        const hasFirstOption =
          rule.firstOption && rule.firstOption.trim() !== "";
        const hasComparison = rule.comparison && rule.comparison.trim() !== "";
        const hasThenAction = rule.thenAction && rule.thenAction.trim() !== "";

        const hasCheckedOptions =
          Array.isArray(rule.checkedOptions) &&
          rule.checkedOptions.some(
            (opt) => opt !== null && opt !== undefined && opt.trim() !== ""
          );

        const hasSecondOption =
          rule.secondOption && rule.secondOption.trim() !== "";

        // 🟥 Case 1: Empty or explicitly invalid rule
        if (rule.emptyRule || rule.invalid) {
          if (!scoringAlertMessage)
            scoringAlertMessage =
              "Please select at least one valid condition in the scoring rule before saving.";
          isScoringValid = false;
          return;
        }

        // 🟨 Case 2: Missing any required field
        if (
          !hasFirstOption ||
          !hasComparison ||
          !hasThenAction ||
          !hasCheckedOptions
        ) {
          if (!scoringAlertMessage)
            scoringAlertMessage =
              "Please complete all required fields in the scoring rule before saving.";
          isScoringValid = false;
          return;
        }
      });

      if (!isScoringValid) {
        alert(scoringAlertMessage);
        setLoading(false);
        return false;
      }
    }
    try {
      const encryptedUserData = sessionStorage.getItem("user");

      let currentUserId = null;
      if (encryptedUserData) {
        try {
          // Decrypt the data
          const bytes = CryptoJS.AES.decrypt(encryptedUserData, "");
          const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

          // Parse JSON
          const user = JSON.parse(decryptedData);
          currentUserId = user?.userId || null;
        } catch (error) {
          console.error("Error decrypting user data:", error);
        }
      }

      const filteredCustomFields =
        header.customFields
          ?.filter((field) => selectedFields.includes(field.name))
          .map((field) => ({
            name: field.name, // Store original name
            customfieldlable: renamedFields[field.name] || field.name, // Store renamed name, default to original if not renamed
          })) || [];

      const response = await fetch("/api/forms/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
          orgIds: getSelectedOrgIdsHeader(),
        },
        body: JSON.stringify({
          formName: sanitizedFormName,
          formDescription: sanitizedFormDescription,
          sections,
          hideFormScore,
          basePercentage,
          scoringMethod,
          baselineScore,
          selectedInteractionTypes,
          visibilityRules: storedVisibilityRules,
          scoringRules: storedScoringRules,
          disabledOptions: formattedDisabledOptions,
          Status: 0,
          currentUserId,
          auditAction: "FORM_DRAFT_CREATED",
          header: {
            ...header,
            customFields: filteredCustomFields,
          },
          footer,
        }),
      });
      if (response.ok) {
        alert("Draft saved successfully!");
        setTimeout(() => {
          router.back();
        }, 1000);
      }
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "Error saving draft: Form with the same name already exists. Please create another form."
          );
        } else {
          throw new Error("Failed to save the draft. Please try again later.");
        }
      }
    } catch (error) {
      console.error("Error updating form:", `${error}`);
      setMessage("Failed to save form.");
      alert(`${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sanitizeSections = (sections) => {
    // Check if any sections exist
    if (sections.length === 0) {
      alert("At least one category is required!");
      return false;
    }

    // Sanitize each section's details
    for (const section of sections) {
      section.sectionDetails = DOMPurify.sanitize(
        section.sectionDetails
      ).trim();
      section.sectionDescription = DOMPurify.sanitize(
        section.sectionDescription
      ).trim();

      // Handle missing or invalid fields
      if (!section.sectionDetails) {
        alert("Category name cannot be empty!");
        return false;
      }
    }
    return true;
  };

  const focusElement = (sectionIndex, subsectionIndex, questionIndex) => {
    setFocusData({ sectionIndex, subsectionIndex, questionIndex });
  };

  function focusScoringMethodField() {
    const scoringField = document.getElementById("form"); // Replace with the actual ID of your scoring method field
    if (scoringField) {
      scoringField.focus();
      scoringField.scrollIntoView({ behavior: "smooth" });
    } else {
      console.warn("Scoring method field not found.");
    }
  }

  const sanitizeSubSections = (sections) => {
    // Sanitize subsections
    for (const section of sections) {
      if (section.subsections.length === 0) {
        alert(
          `Category "${section.sectionDetails}" must have at least one subcategory!`
        );
        return false;
      }

      for (const subSection of section.subsections) {
        subSection.subsectionDetails = DOMPurify.sanitize(
          subSection.subsectionDetails
        ).trim();
        subSection.subsectionDescription = DOMPurify.sanitize(
          subSection.subsectionDescription
        ).trim();

        if (!subSection.subsectionDetails) {
          alert("Subcategory name cannot be empty!");
          return false;
        }

        if (!subSection.questions || subSection.questions.length < 1) {
          alert("At least one question is required for each Subcategory!");
          return false;
        }
        for (
          let sectionIndex = 0;
          sectionIndex < sections.length;
          sectionIndex++
        ) {
          const section = sections[sectionIndex];

          for (
            let subsectionIndex = 0;
            subsectionIndex < section.subsections.length;
            subsectionIndex++
          ) {
            const subSection = section.subsections[subsectionIndex];

            for (
              let questionIndex = 0;
              questionIndex < subSection.questions.length;
              questionIndex++
            ) {
              const question = subSection.questions[questionIndex];

              if (
                (question.type === "fiveRankedList" ||
                  question.type === "twoRankedList" ||
                  question.type === "selectMultipleChoice") &&
                (question.questionOptionType === null ||
                  question.questionOptionType === "")
              ) {
                alert(
                  `Please select question option type for question: "${question.question}".`
                );
                focusElement(sectionIndex, subsectionIndex, questionIndex); // Trigger focus

                return false;
              }
              if (!question.question) {
                alert(
                  "One of the questions is blank! Please fill in the question."
                );

                focusElement(sectionIndex, subsectionIndex, questionIndex);
                return false;
              }
            }
          }
        }
        for (const question of subSection.questions) {
          question.question = DOMPurify.sanitize(question.question).trim();
          question.SubQuestionInstructions = DOMPurify.sanitize(
            question.SubQuestionInstructions
          ).trim();

          if (
            question.scorable &&
            (!scoringMethod ||
              scoringMethod.trim() === "" ||
              scoringMethod === "None")
          ) {
            alert("Please select Form's scoring method.");
            focusScoringMethodField();
            return false;
          }
        }
      }
    }
    return true;
  };

  const sanitizeDraftSections = (sections) => {
    // Check if any sections exist
    if (sections.length === 0) {
      alert("At least one category is required!");
      return false;
    }

    // Sanitize and validate each section's details
    for (const section of sections) {
      section.sectionDetails = DOMPurify.sanitize(
        section.sectionDetails
      ).trim();
      section.sectionDescription = DOMPurify.sanitize(
        section.sectionDescription
      ).trim();

      if (!section.sectionDetails) {
        alert("Category name cannot be empty!");
        return false;
      }
    }

    return true;
  };

  const sanitizeDraftSubSections = (sections) => {
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];

      if (!section.subsections || section.subsections.length === 0) {
        alert(
          `Category "${DOMPurify.sanitize(
            section.sectionDetails
          )}" must have at least one subcategory!`
        );
        return false;
      }

      // Sanitize section details
      section.sectionDetails = DOMPurify.sanitize(
        section.sectionDetails
      ).trim();
      section.sectionDescription = DOMPurify.sanitize(
        section.sectionDescription
      ).trim();

      for (
        let subsectionIndex = 0;
        subsectionIndex < section.subsections.length;
        subsectionIndex++
      ) {
        const subSection = section.subsections[subsectionIndex];

        subSection.subsectionDetails = DOMPurify.sanitize(
          subSection.subsectionDetails
        ).trim();
        subSection.subsectionDescription = DOMPurify.sanitize(
          subSection.subsectionDescription
        ).trim();

        if (!subSection.subsectionDetails) {
          alert("Subcategory name cannot be empty!");
          return false;
        }

        for (
          let questionIndex = 0;
          questionIndex < subSection.questions.length;
          questionIndex++
        ) {
          const question = subSection.questions[questionIndex];

          question.question = DOMPurify.sanitize(question.question).trim();
          question.SubQuestionInstructions = DOMPurify.sanitize(
            question.SubQuestionInstructions
          ).trim();

          if (!question.question) {
            alert(
              "One of the questions is blank! Please fill in the question."
            );

            // Ensure focus is applied correctly
            setTimeout(() => {
              focusElement(sectionIndex, subsectionIndex, questionIndex);
            }, 0);

            return false;
          }
        }
      }
    }
    return true;
  };

  async function fetchCustomfieldsDDL() {
    try {
      const response = await fetch("/api/forms/Customfieldsddl", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setHeader((prevHeader) => {
          const updatedHeader = {
            ...prevHeader,
            customFields: data.customFieldList,
          };

          return updatedHeader;
        });
      } else {
        console.error("Failed to fetch Custom Fields:", data.message);
      }
    } catch (error) {
      console.error("Error fetching Custom Fields:", error);
    }
  }
  async function fetchInteractionTypeDDL() {
    try {
      const response = await fetch("/api/forms/interactiontypeDDL", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
        },
      });

      const data = await response.json();



      if (response.ok) {
        setHeader((prevHeader) => ({
          ...prevHeader,
          interactionType: data.data || [],
        }));
      } else {
        console.error("Failed to fetch Interaction Type:", data.message);
      }
    } catch (error) {
      console.error("Error fetching Interaction Type:", error);
    }
  }

  useEffect(() => {
    fetchInteractionTypeDDL();
    fetchCustomfieldsDDL();
  }, []);

  // Toggle checkbox selection
  const handleCheckboxChange = (name) => {
    setSelectedFields((prevSelected) => {
      const updatedSelected = prevSelected.includes(name)
        ? prevSelected.filter((fieldName) => fieldName !== name)
        : [...prevSelected, name];

      return updatedSelected;
    });
  };
  const handleRename = (fieldName, newName) => {
    setRenamedFields((prev) => ({
      ...prev,
      [fieldName]: newName,
    }));
  };
  const handleAddSectionWrapper = () => {
    handleAddSection(setSections);
  };

  // ================= DRAG & DROP: ADD CATEGORY =================
  const handleDragOver = (e) => {
    e.preventDefault(); // MUST for drop
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const action = e.dataTransfer.getData("text/plain");
    if (!action) return;

    // ADD CATEGORY
    if (action === "ADD_CATEGORY") {
      handleAddSectionWrapper();
      return;
    }

    // ADD HEADER
    if (action === "ADD_HEADER") {
      addHeader();
      return;
    }

    // ADD FOOTER
    if (action === "ADD_FOOTER") {
      addFooter();
      return;
    }

    // ADD SUB CATEGORY
    if (action.startsWith("ADD_SUB_CATEGORY")) {
      const [, sIndex] = action.split(":");

      // ✅ SAME AS CLICK
      handleAddSubsection(sections, setSections, Number(sIndex));
      return;
    }

    // DUPLICATE CATEGORY
    if (action.startsWith("DUPLICATE_CATEGORY")) {
      const [, sIndex] = action.split(":");

      handleDuplicateSectionWrapper(sections, Number(sIndex));
      return;
    }
  };

  // ============================================================

  const sectionDropProps = {
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: (e) => {
      e.stopPropagation();
      handleDrop(e);
    },
  };

  const handleDuplicateSectionWrapper = (sections, sectionIndex) => {
    handleDuplicateSection(
      sections,
      setSections,
      sectionIndex,
      categoryNameRefs
    );
  };

  const handleDeleteSubsectionWrapper = (sectionIndex, subsectionIndex) => {
    handleDeleteSubsection(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex
    );
  };

  const handleDuplicateSubsectionWrapper = (sectionIndex, subsectionIndex) => {
    handleDuplicateSubsection(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex
    );
  };

  const handleEnableSubSectionCommentWrapper = (
    sectionIndex,
    subsectionIndex
  ) => {
    handleEnableSubSectionComment(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex
    );
  };

  const handleSubSectionDescriptionChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    event
  ) => {
    handleSubSectionDescriptionChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      event
    );
  };

  const handleHiddenSubquestionChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex
  ) => {
    handleHiddenSubquestionChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex
    );
  };

  const handleEnableSubQuestionCommentWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex
  ) => {
    handleEnableSubQuestionComment(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex
    );
  };

  const handleHideSubQuestionScoreWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex
  ) => {
    handleHideSubQuestionScore(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex
    );
  };

  const handleSubSectionDetailsChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    event
  ) => {
    handleSubSectionDetailsChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      event
    );
  };

  const handleSubQuestionInstructionChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionKey,
    event
  ) => {
    handleSubQuestionInstructionChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionKey,
      event
    );
  };

  const handleAddSubQuestionWrapper = (sectionIndex, subsectionIndex) => {
    handleAddSubQuestion(sections, setSections, sectionIndex, subsectionIndex);
  };

  const handleAddAfterSubQuestionWrapper = (
    sectionIndex,
    subsectionIndex,
    insertAfterIndex = -1
  ) => {
    handleAddSubQuestion(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      insertAfterIndex
    );
  };

  const handleHideSubSectionScoreChangeWrapper = (
    sectionIndex,
    subsectionIndex
  ) => {
    handleHideSubSectionScoreChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex
    );
  };

  const handleDeleteSubQuestionWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex
  ) => {
    handleDeleteSubQuestion(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex
    );
  };

  const handleSubQuestionChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex,
    event
  ) => {
    handleSubQuestionChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex,
      event
    );
  };

  const handleAddSubOptionWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex
  ) => {
    handleAddSubOption(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex
    );
  };

  const handleSubAnswerChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex,
    event
  ) => {
    handleSubAnswerChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex,
      event
    );
  };

  const handleSubRequiredChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex
  ) => {
    handleSubRequiredChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex
    );
  };

  const handleSubDuplicateQuestionWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex
  ) => {
    handleSubDuplicateQuestion(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex
    );
  };

  const handleSubOptionChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionKey,
    oIndex,
    event
  ) => {
    handleSubOptionChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionKey,
      oIndex,
      event
    );
  };

  const handleSubScoreChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex,
    optionIndex,
    event
  ) => {
    handleSubScoreChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex,
      optionIndex,
      event
    );
  };

  const handleSubScoreableChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex
  ) => {
    handleSubScoreableChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex
    );
  };

  const handleSubRadioChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex,
    event
  ) => {
    handleSubRadioChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex,
      event
    );
  };

  const handleSubTypeChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex,
    event,
    twoRankListOptions
  ) => {
    handleSubTypeChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex,
      event,
      twoRankListOptions
    );
  };

  const handleSubDefaultSelectionChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex,
    event
  ) => {
    handleSubDefaultSelectionChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex,
      event
    );
  };

  const handleDeleteSubOptionWrapper = (
    sectionIndex,
    subsectionIndex,
    questionIndex,
    optionIndex
  ) => {
    handleDeleteSubOption(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      questionIndex,
      optionIndex
    );
  };

  const SubsectionScoringMethodChangeWrapper = (
    sectionIndex,
    subsectionIndex,
    event
  ) => {
    SubsectionScoringMethodChange(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      event
    );
  };

  const setSubsectionBasePercentageWrapper = (
    sectionIndex,
    subsectionIndex,
    event
  ) => {
    setSubSectionBasePercentage(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      event
    );
  };

  const setSubsectionBaselineScoreWrapper = (
    sectionIndex,
    subsectionIndex,
    event
  ) => {
    setSubSectionBaselineScore(
      sections,
      setSections,
      sectionIndex,
      subsectionIndex,
      event
    );
  };

  const addHeader = () => {
    setIsModalVisible(true);
  };

  const addFooter = () => {
    setIsFooterModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const closeFooterModal = () => {
    setIsFooterModalVisible(false);
  };
  const filteredCustomFields =
    header.customFields
      ?.filter((field) => selectedFields.includes(field.name))
      .map((field) => ({
        name: field.name, // Store original name
        customfieldlable: renamedFields[field.name] || field.name, // Store renamed name, default to original if not renamed
      })) || [];

  return (
    <div className="app-container">
      {previewMode ? (
        <FormPreviewer
          sections={sections}
          formName={formName}
          header={{ ...header, customFields: filteredCustomFields }}
          formDescription={formDescription}
          sectionDetails={sections.map((q) => q.sectionDetails)}
          sectionDescription={sections.map((q) => q.sectionDescription)}
          togglePreviewMode={togglePreviewMode}
          visibilityRules={visibilityRules}
          scoringRules={scoringRules}
          QuestionInstructions={sections.map((q) => q.QuestionInstructions)}
          hideFormScore={hideFormScore}
          scoringMethod={scoringMethod}
          basePercentage={basePercentage}
          baselineScore={baselineScore}
          footer={footer}
          selectedInteractionTypes={selectedInteractionTypes}
        />
      ) : (
        <>
          <FormNavbar
            onPreviewClick={togglePreviewMode}
            onAddSectionClick={handleAddSectionWrapper}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit}
            onHeader={addHeader}
            onFooter={addFooter}
            onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          />

          <div className="page-container">
            <div className="form-builder">
              {ruleMode ? (
                <FormRule
                  sections={sections}
                  setSections={setSections}
                  formName={formName}
                  toggleRuleMode={toggleRuleMode}
                  formId={""}
                />
              ) : (
                <>
                  <form onSubmit={handleSubmit}>
                    <div className="fcontainer">
                      <div className="fsection" id="form">
                        <input
                          type="text"
                          placeholder={`Form Name `}
                          value={formName}
                          onChange={(event) => setFormName(event.target.value)}
                          maxLength={50}
                        />
                        <textarea
                          placeholder="Form Description"
                          value={formDescription}
                          maxLength={250}
                          // onChange={(event) =>
                          //   setFormDescription(event.target.value)
                          // }
                          onChange={(event) => {
                            const sanitizedValue = DOMPurify.sanitize(
                              event.target.value
                            );
                            setFormDescription(sanitizedValue);
                          }}
                        />
                        <div className="container-wrapper">
                          <div className="visibility-controls-form">
                            <label className="toggle-switch">
                              <span className="toggle-label">
                                &nbsp; Hide Total Score
                              </span>
                              <input
                                type="checkbox"
                                checked={hideFormScore}
                                onChange={() => setHideFormScore(!hideFormScore)}
                              // style={{ display: "none" }}
                              />
                            </label>
                          </div>

                          <div className="calculation-container">
                            <div className="form-group">
                              <label>Scoring Method </label>
                              <select
                                id="scoring-method-dropdown"
                                value={scoringMethod}
                                onChange={(e) => setScoringMethod(e.target.value)}
                              >
                                <option value="Section Sum">Category Sum</option>
                                <option value="Section Average">
                                  Category Average
                                </option>
                                <option value="Section Percentage">
                                  Category Percentage
                                </option>
                                <option value="Category Sum">
                                  Sub Category Sum
                                </option>
                                <option value="Category Average">
                                  Sub Category Average
                                </option>
                                <option value="Category Percentage">
                                  Sub Category Percentage
                                </option>
                                <option value="Question Sum">Question Sum</option>
                                <option value="Question Average">
                                  Question Average
                                </option>
                                <option value="Question Percentage">
                                  Question Percentage
                                </option>
                                <option value="None">None</option>
                              </select>
                              {(scoringMethod === "Section Percentage" ||
                                scoringMethod === "Category Percentage" ||
                                scoringMethod === "Question Percentage") && (
                                  <div className="form-group">
                                    <label>Base Percentage </label>
                                    <input
                                      className="form-group"
                                      type="number"
                                      value={basePercentage}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const validValue = value.match(
                                          /^\d{0,5}(\.\d{0,2})?$/
                                        )
                                          ? value
                                          : basePercentage;
                                        setBasePercentage(validValue);
                                      }}
                                    />
                                  </div>
                                )}
                              <div className="form-group">
                                <label>Passing Score:</label>
                                <input
                                  className="form-group"
                                  value={baselineScore}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const validValue = value.match(
                                      /^\d{0,3}(\.\d{0,2})?$/
                                    )
                                      ? value
                                      : baselineScore;
                                    setBaselineScore(validValue);
                                  }}
                                />
                              </div>
                              <div className="form-group">
                                <label>Interaction Type:</label>
                                <InteractionTypeDDL
                                  options={header?.interactionType || []}
                                  selectedValues={selectedInteractionTypes}
                                  onChange={setSelectedInteractionTypes}
                                  placeholder="Select Interaction Type"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="header-container" id="header">
                    </div>
                    {isModalVisible && (
                      <ModalPortal>
                        <div className="modal-backdrop">
                          <div className="modal-content-box">
                            <button
                              className="close-modal-button"
                              onClick={closeModal}
                            >
                              &times;
                            </button>

                            <div className="modal-element-header-inputs max-h-[500px] overflow-y-auto">
                              {/* Header Name Input */}
                              <div className="modal-element-input-group">
                                <label
                                  htmlFor="header-name"
                                  className="modal-element-input-label"
                                >
                                  Header Name
                                </label>
                                <input
                                  type="text"
                                  id="header-name"
                                  placeholder="Header Name"
                                  value={header.name || ""}
                                  onChange={(e) =>
                                    setHeader({ ...header, name: e.target.value })
                                  }
                                  maxLength={50}
                                  className="modal-element-input-field"
                                />
                              </div>

                              {/* Header Description Input */}
                              <div className="modal-element-input-group">
                                <label
                                  htmlFor="header-description"
                                  className="modal-element-input-label"
                                >
                                  Header Instructions
                                </label>
                                <textarea
                                  id="header-description"
                                  placeholder="Header Instructions"
                                  value={header.description}
                                  maxLength={250}
                                  rows={3}
                                  onChange={(e) =>
                                    setHeader({
                                      ...header,
                                      description: e.target.value,
                                    })
                                  }
                                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                                />
                              </div>
                              {/* Selected Fields with Rename Option */}
                              {selectedFields.length > 0 && (
                                <div className="mt-1 p-1 border rounded-md bg-muted">
                                  <label
                                    htmlFor="Selected Fields"
                                    className="modal-element-input-label"
                                  >
                                    Selected Fields
                                  </label>
                                  <div className="flex flex-col gap-0.5">
                                    {" "}
                                    {/* Tighter spacing */}
                                    {selectedFields.map((field) => (
                                      <div
                                        key={field}
                                        className="flex items-center gap-1"
                                      >
                                        {" "}
                                        {/* Reduced gap */}
                                        <label className="text-xs font-medium whitespace-nowrap">
                                          {field}:
                                        </label>
                                        <input
                                          type="text"
                                          value={renamedFields[field] || ""}
                                          onChange={(e) =>
                                            handleRename(field, e.target.value)
                                          }
                                          className="px-1 py-0 border rounded text-xs w-20 h-5" // Smaller width & height
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="relative w-80">
                                <label
                                  htmlFor="custom-dropdown"
                                  className="modal-element-input-label"
                                >
                                  Custom Fields
                                </label>

                                {/* Dropdown Toggle */}
                                <div
                                  className="w-full px-3 py-2 border rounded-md shadow-sm text-sm cursor-pointer bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                                  onClick={() => setIsOpen(!isOpen)}
                                >
                                  {selectedFields.length > 0
                                    ? selectedFields
                                      .map(
                                        (field) => renamedFields[field] || field
                                      )
                                      .join(", ")
                                    : "Select Custom Field"}
                                </div>

                                {/* Dropdown List */}
                                {isOpen && (
                                  <div className="mt-1 w-full bg-card border rounded-md shadow-lg z-10">
                                    <ul className="max-h-40 overflow-y-auto p-2">
                                      {header.customFields.map((field, index) => (
                                        <li
                                          key={index}
                                          className="flex items-center px-2 py-1 hover:bg-muted"
                                        >
                                          <input
                                            type="checkbox"
                                            id={field.name}
                                            checked={selectedFields.includes(
                                              field.name
                                            )}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              handleCheckboxChange(field.name);
                                            }}
                                            className="mr-2 cursor-pointer"
                                          />
                                          <label
                                            htmlFor={field.name}
                                            className="text-sm cursor-pointer"
                                          >
                                            {field.name}
                                          </label>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Header Toggle Controls */}
                              <div className="modal-element-toggle-controls">
                                <div className="modal-element-toggle-header">View</div>
                                <div className="modal-element-toggle-row">
                                  <input
                                    type="checkbox"
                                    id="header-collapse"
                                    checked={header.isCollapsed}
                                    onChange={() => setHeader({ ...header, isCollapsed: !header.isCollapsed })}
                                    className="modal-element-checkbox-input"
                                  />
                                  <label htmlFor="header-collapse" className="modal-element-toggle-label">
                                    Collapse Header
                                  </label>
                                </div>
                                <div className="modal-element-toggle-row">
                                  <input
                                    type="checkbox"
                                    id="header-comment"
                                    checked={header.enableComment}
                                    onChange={() => setHeader({ ...header, enableComment: !header.enableComment })}
                                    className="modal-element-checkbox-input"
                                  />
                                  <label htmlFor="header-comment" className="modal-element-toggle-label">
                                    Display Header Comment
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ModalPortal>
                    )}
                    <div
                      className="sections-drop-zone"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      {sections.map((section, sIndex) => {
                        const isSectionCollapsed = collapsedSections[sIndex];
                        return (
                          <div
                            key={sIndex}
                            className="section-container"
                            id={`section-${sIndex}`}
                            {...sectionDropProps}
                          >
                            <div className="section-header">
                              <h2 className="w-[700px] truncate overflow-hidden whitespace-nowrap">
                                {section.sectionDetails || "Category Details"}
                              </h2>
                              <div className="collapse-section-icons">
                                <i
                                  type="button"
                                  onClick={() => toggleSectionCollapse(sIndex)}
                                  className={
                                    isSectionCollapsed
                                      ? "fa fa-plus-circle"
                                      : "fa fa-minus-circle"
                                  }
                                />
                              </div>
                            </div>
                            {!isSectionCollapsed && (
                              <div
                                className="section-containers"
                                {...sectionDropProps}
                              >
                                <div className="section-contents">
                                  <input
                                    ref={(el) =>
                                      (categoryNameRefs.current[sIndex] = el)
                                    }
                                    key={section.id}
                                    autoFocus
                                    type="text"
                                    placeholder="Category Name"
                                    maxLength={50}
                                    value={section.sectionDetails}
                                    onChange={(event) =>
                                      handleSectionDetailsChange(
                                        sIndex,
                                        event,
                                        setSections
                                      )
                                    }
                                  />
                                  <textarea
                                    placeholder="Category Instructions"
                                    value={section.sectionDescription}
                                    maxLength={250}
                                    rows={3}
                                    onChange={(e) =>
                                      handleSectionDescriptionChange(
                                        sIndex,
                                        e.target.value,
                                        setSections
                                      )
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                                  />

                                  <div className="div-container-calculator-wrapper">
                                    <div className="visibility-controls">
                                      <label className="toggle-switch">
                                        <span className="toggle-label">
                                          &nbsp; Hide Score
                                        </span>
                                        <input
                                          type="checkbox"
                                          autoFocus
                                          checked={section.hideScore}
                                          onChange={() =>
                                            handleHideSectionScoreChange(
                                              sections,
                                              setSections,
                                              sIndex
                                            )
                                          }
                                        // style={{ display: "none" }}
                                        />
                                        {/* <span className="toggle-slider"></span> */}
                                      </label>
                                      <label className="toggle-switch">
                                        <span className="toggle-label">
                                          &nbsp; Comment
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={section.enableComment}
                                          onChange={() =>
                                            handleEnableSectionComment(
                                              sections,
                                              setSections,
                                              sIndex
                                            )
                                          }
                                        // style={{ display: "none" }}
                                        />
                                        {/* <span className="toggle-slider"></span> */}
                                      </label>
                                      <label className="toggle-switch">
                                        <span className="toggle-label">
                                          &nbsp; Scoring Method
                                        </span>
                                      </label>
                                      <div className="calculation-container">
                                        <div className="form-group">
                                          <select
                                            value={section.scoringMethod}
                                            onChange={(event) => {
                                              sectionScoringMethodChange(
                                                sections,
                                                setSections,
                                                sIndex,
                                                event
                                              );
                                            }}
                                            className="scoring-method-dropdown"
                                          >
                                            <option value="None">None</option>
                                            <option value="Category Sum">
                                              Sub Category Sum
                                            </option>
                                            <option value="Category Average">
                                              Sub Category Average
                                            </option>
                                            <option value="Category Percentage">
                                              Sub Category Percentage
                                            </option>
                                            <option value="Question Sum">
                                              Question Sum
                                            </option>
                                            <option value="Question Average">
                                              Question Average
                                            </option>
                                            <option value="Question Percentage">
                                              Question Percentage
                                            </option>
                                          </select>
                                          {(section.scoringMethod ===
                                            "Category Percentage" ||
                                            section.scoringMethod ===
                                            "Question Percentage") && (
                                              <div className="form-group">
                                                <label class="base-precent-label">
                                                  Base Percentage{" "}
                                                </label>
                                                <input
                                                  className="form-group"
                                                  value={section.basePercentage}
                                                  onChange={(e) => {
                                                    const value = e.target.value;

                                                    // Regex to allow up to 5 digits before the decimal and 2 digits after
                                                    const validValue =
                                                      /^\d{0,5}(\.\d{0,2})?$/.test(
                                                        value
                                                      )
                                                        ? value
                                                        : section.basePercentage;

                                                    // Set the valid value only if it matches the regex
                                                    if (
                                                      validValue !==
                                                      section.basePercentage
                                                    ) {
                                                      setSectionBasePercentage(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        e,
                                                        validValue
                                                      );
                                                    }
                                                  }}
                                                  maxLength="8" // Additional safeguard: max length of 8 characters (e.g., 12345.67)
                                                />
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* <div className="calculation-container">
                              <div className="form-group">
                                <label>Scoring Method </label>
                                <select
                                  value={section.scoringMethod}
                                  onChange={(event) => sectionScoringMethodChange(sections, setSections, sIndex, event)}
                                  className="scoring-method-dropdown"
                                >
                                  <option value="None">None</option>
                                  <option value="Category Sum">Sub Section Sum</option>
                                  <option value="Category Average">Sub Section Average</option>
                                  <option value="Category Percentage">Sub Section Percentage</option>
                                  <option value="Question Sum">Question Sum</option>
                                  <option value="Question Average">Question Average</option>
                                  <option value="Question Percentage">Question Percentage</option>
                                </select>
                                {(section.scoringMethod === "Category Percentage" ||
                                  section.scoringMethod === "Question Percentage") && (
                                    <div className="form-group">
                                      <label>Base Percentage </label>
                                      <input className="form-group" value={section.basePercentage} onChange={(e) => setSectionBasePercentage(sections, setSections, sIndex, e)} />
                                    </div>
                                  )}
                              </div>
                            </div> */}
                                  </div>
                                </div>

                                <div className="icon-container">
                                  <div className="tooltip-wrapper">
                                    <span
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData(
                                          "text/plain",
                                          `ADD_SUB_CATEGORY:${sIndex}`
                                        );
                                      }}
                                    >
                                      <TbCategoryPlus
                                        className="addsection-image cursor-pointer"
                                        size={40}
                                        onClick={() =>
                                          handleAddSubsection(
                                            sections,
                                            setSections,
                                            sIndex
                                          )
                                        }
                                      />
                                    </span>
                                    <span className="tooltip-container-text">
                                      SubCategory
                                    </span>
                                  </div>
                                  <div className="tooltip-wrapper">
                                    <Trash2
                                      className="deletesection-image"
                                      size={20}
                                      onClick={() =>
                                        handleDeleteSection(sIndex, setSections)
                                      }
                                    />
                                    <span className="tooltip-container-text">
                                      Delete Category
                                    </span>
                                  </div>
                                  <div className="tooltip-wrapper">
                                    <span
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = "copy";
                                        e.dataTransfer.setData(
                                          "text/plain",
                                          `DUPLICATE_CATEGORY:${sIndex}`
                                        );
                                      }}
                                    >
                                      <Copy
                                        className="duplicate-image"
                                        size={20}
                                        onClick={() =>
                                          handleDuplicateSectionWrapper(
                                            sections,
                                            sIndex
                                          )
                                        }
                                      />
                                    </span>
                                    <span className="tooltip-container-text">
                                      Duplicate Category
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!isSectionCollapsed &&
                              section.questions.map((question, questionKey) => {
                                const isQuestionCollapsed =
                                  collapsedQuestion[`${sIndex}-${questionKey}`];
                                return (
                                  <div
                                    key={questionKey}
                                    className="question-container"
                                    {...sectionDropProps}
                                  >
                                    <div className="question-content">
                                      <input
                                        type="text"
                                        placeholder="Question"
                                        value={question.question}
                                        onChange={(event) =>
                                          handleQuestionChange(
                                            sIndex,
                                            questionKey,
                                            event,
                                            setSections
                                          )
                                        }
                                      />
                                      <i
                                        type="button"
                                        onClick={() =>
                                          toggleQuestionCollapse(
                                            sIndex,
                                            questionKey
                                          )
                                        }
                                        className={
                                          isQuestionCollapsed
                                            ? "fa fa-plus-circle"
                                            : "fa fa-minus-circle"
                                        }
                                      ></i>
                                    </div>

                                    {!isQuestionCollapsed && (
                                      <div>
                                        <select
                                          value={question.type}
                                          onChange={(event) =>
                                            handleTypeChange(
                                              sections,
                                              setSections,
                                              sIndex,
                                              questionKey,
                                              event
                                            )
                                          }
                                          className="select-dropdown"
                                        >
                                          <option value="shortAnswer">
                                            Single Line
                                          </option>
                                          <option value="paragraph">
                                            Multi Line
                                          </option>
                                          <option value="multipleChoice">
                                            Radio List
                                          </option>
                                          <option value="checkboxes">
                                            Checkboxes
                                          </option>
                                          <option value="dropdown">Dropdown</option>
                                          <option value="fiveRankedList">
                                            Five Ranked List
                                          </option>
                                          <option value="twoRankedList">
                                            Yes/No
                                          </option>
                                        </select>

                                        {question.type === "shortAnswer" && (
                                          <div className="question-content">
                                            <input
                                              type="text"
                                              placeholder="Answer"
                                              maxLength={150}
                                              readOnly
                                              value={question.answer}
                                            />
                                          </div>
                                        )}

                                        {question.type === "paragraph" && (
                                          <div className="question-content">
                                            <textarea
                                              rows={4}
                                              placeholder="Paragraph"
                                              maxLength={250}
                                              value={question.paragraph}
                                              onChange={(event) =>
                                                handleParagraphChange(
                                                  sections,
                                                  setSections,
                                                  sIndex,
                                                  questionKey,
                                                  event
                                                )
                                              }
                                            />
                                          </div>
                                        )}

                                        {question.type === "multipleChoice" && (
                                          <div>
                                            {question.options.map(
                                              (option, oIndex) => (
                                                <div
                                                  key={oIndex}
                                                  className="option-container"
                                                >
                                                  <input
                                                    type="radio"
                                                    name={`question-${sIndex}-${questionKey}`}
                                                    value={option}
                                                    checked={
                                                      question.selectedOption ===
                                                      option
                                                    }
                                                    onChange={(event) =>
                                                      handleRadioChange(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        event
                                                      )
                                                    }
                                                  />
                                                  <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(event) =>
                                                      handleOptionChange(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        oIndex,
                                                        event
                                                      )
                                                    }
                                                  />
                                                  {question.scorable && (
                                                    <label>
                                                      Score
                                                      <input
                                                        className="score"
                                                        type="number"
                                                        placeholder="Score"
                                                        value={
                                                          question.scores[oIndex]
                                                        }
                                                        onChange={(event) =>
                                                          handleScoreChange(
                                                            sections,
                                                            setSections,
                                                            sIndex,
                                                            questionKey,
                                                            oIndex,
                                                            event
                                                          )
                                                        }
                                                      />
                                                    </label>
                                                  )}

                                                  <i
                                                    className="fa-solid fa-delete-left cross-image"
                                                    onClick={() =>
                                                      handleDeleteOption(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        oIndex
                                                      )
                                                    }
                                                  ></i>
                                                </div>
                                              )
                                            )}
                                            <div className="options">
                                              <span
                                                className="add-option-span"
                                                onClick={() =>
                                                  handleAddOption(
                                                    sections,
                                                    setSections,
                                                    sIndex,
                                                    questionKey
                                                  )
                                                }
                                              >
                                                Add Option
                                              </span>
                                              <label className="toggle-switch">
                                                <span className="toggle-label">
                                                  &nbsp; Scoreable
                                                </span>
                                                <input
                                                  type="checkbox"
                                                  checked={question.scorable}
                                                  onChange={() =>
                                                    handleScoreableChange(
                                                      sections,
                                                      setSections,
                                                      sIndex,
                                                      questionKey
                                                    )
                                                  }
                                                  style={{ display: "none" }}
                                                />
                                                <span className="toggle-slider"></span>
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {question.type === "checkboxes" && (
                                          <div>
                                            {question.options.map(
                                              (option, oIndex) => (
                                                <div
                                                  key={oIndex}
                                                  className="option-container"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    name={`question-${sIndex}-${questionKey}-${oIndex}`}
                                                    value={option}
                                                    checked={question.selectedCheckboxes.includes(
                                                      option
                                                    )}
                                                    onChange={() =>
                                                      handleCheckboxChange(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        option
                                                      )
                                                    }
                                                  />
                                                  <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(event) =>
                                                      handleOptionChange(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        oIndex,
                                                        event
                                                      )
                                                    }
                                                  />
                                                  {question.scorable && (
                                                    <label>
                                                      Score
                                                      <input
                                                        className="score"
                                                        type="number"
                                                        placeholder="Score"
                                                        value={
                                                          question.scores[oIndex]
                                                        }
                                                        onChange={(event) =>
                                                          handleScoreChange(
                                                            sections,
                                                            setSections,
                                                            sIndex,
                                                            questionKey,
                                                            oIndex,
                                                            event
                                                          )
                                                        }
                                                      />
                                                    </label>
                                                  )}

                                                  <i
                                                    className="fa-solid fa-delete-left cross-image"
                                                    onClick={() =>
                                                      handleDeleteOption(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        oIndex
                                                      )
                                                    }
                                                  ></i>
                                                </div>
                                              )
                                            )}
                                            <div className="options">
                                              <span
                                                className="add-option-span"
                                                onClick={() =>
                                                  handleAddOption(
                                                    sections,
                                                    setSections,
                                                    sIndex,
                                                    questionKey
                                                  )
                                                }
                                              >
                                                Add Option
                                              </span>
                                              <label className="toggle-switch">
                                                <span className="toggle-label">
                                                  &nbsp; Scoreable
                                                </span>
                                                <input
                                                  type="checkbox"
                                                  checked={question.scorable}
                                                  onChange={() =>
                                                    handleScoreableChange(
                                                      sections,
                                                      setSections,
                                                      sIndex,
                                                      questionKey
                                                    )
                                                  }
                                                  style={{ display: "none" }}
                                                />
                                                <span className="toggle-slider"></span>
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {question.type === "dropdown" && (
                                          <div>
                                            {question.options.map(
                                              (option, oIndex) => (
                                                <div
                                                  key={oIndex}
                                                  className="option-container"
                                                >
                                                  <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(event) =>
                                                      handleOptionChange(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        oIndex,
                                                        event
                                                      )
                                                    }
                                                  />
                                                  {question.scorable && (
                                                    <label>
                                                      Score
                                                      <input
                                                        className="score"
                                                        type="number"
                                                        placeholder="Score"
                                                        value={
                                                          question.scores[oIndex]
                                                        }
                                                        onChange={(event) =>
                                                          handleScoreChange(
                                                            sections,
                                                            setSections,
                                                            sIndex,
                                                            questionKey,
                                                            oIndex,
                                                            event
                                                          )
                                                        }
                                                      />
                                                    </label>
                                                  )}
                                                  <i
                                                    className="fa-solid fa-delete-left cross-image"
                                                    onClick={() =>
                                                      handleDeleteOption(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        oIndex
                                                      )
                                                    }
                                                  ></i>
                                                </div>
                                              )
                                            )}
                                            <div className="options">
                                              <span
                                                className="add-option-span"
                                                onClick={() =>
                                                  handleAddOption(
                                                    sections,
                                                    setSections,
                                                    sIndex,
                                                    questionKey
                                                  )
                                                }
                                              >
                                                Add Option
                                              </span>
                                              <label className="toggle-switch">
                                                <span className="toggle-label">
                                                  &nbsp; Scoreable
                                                </span>
                                                <input
                                                  type="checkbox"
                                                  checked={question.scorable}
                                                  onChange={() =>
                                                    handleScoreableChange(
                                                      sections,
                                                      setSections,
                                                      sIndex,
                                                      questionKey
                                                    )
                                                  }
                                                  style={{ display: "none" }}
                                                />
                                                <span className="toggle-slider"></span>
                                              </label>
                                            </div>
                                          </div>
                                        )}

                                        {question.type === "fiveRankedList" && (
                                          <div>
                                            {question.options.map(
                                              (option, oIndex) => (
                                                <div
                                                  key={oIndex}
                                                  className="option-container"
                                                >
                                                  <label>{option}</label>
                                                  <input
                                                    type="radio"
                                                    name={`question-${sIndex}-${questionKey}`}
                                                    value={option}
                                                    checked={
                                                      question.defaultSelected ===
                                                      option
                                                    }
                                                    onChange={(event) =>
                                                      handleRadioChange(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        event
                                                      )
                                                    }
                                                  />
                                                  {question.scorable && (
                                                    <label>
                                                      Score
                                                      <input
                                                        className="score"
                                                        type="number"
                                                        value={
                                                          question.scores[oIndex]
                                                        }
                                                        onChange={(event) =>
                                                          handleScoreChange(
                                                            sections,
                                                            setSections,
                                                            sIndex,
                                                            questionKey,
                                                            oIndex,
                                                            event
                                                          )
                                                        }
                                                      />
                                                    </label>
                                                  )}
                                                </div>
                                              )
                                            )}
                                            <div className="default-label">
                                              <label>Default Value</label>
                                              <select
                                                value={question.defaultSelected}
                                                onChange={(event) =>
                                                  handleDefaultSelectionChange(
                                                    sections,
                                                    setSections,
                                                    sIndex,
                                                    questionKey,
                                                    event
                                                  )
                                                }
                                              >
                                                {question.options.map(
                                                  (option, index) => (
                                                    <option
                                                      key={index}
                                                      value={option}
                                                    >
                                                      {option}
                                                    </option>
                                                  )
                                                )}
                                              </select>
                                            </div>
                                          </div>
                                        )}

                                        {question.type === "twoRankedList" && (
                                          <div>
                                            {question.options.map(
                                              (option, oIndex) => (
                                                <div
                                                  key={oIndex}
                                                  className="option-container"
                                                >
                                                  <label>{option}</label>
                                                  <input
                                                    type="radio"
                                                    name={`question-${sIndex}-${questionKey}`}
                                                    value={option}
                                                    checked={
                                                      question.defaultSelected ===
                                                      option
                                                    }
                                                    onChange={(event) =>
                                                      handleRadioChange(
                                                        sections,
                                                        setSections,
                                                        sIndex,
                                                        questionKey,
                                                        event
                                                      )
                                                    }
                                                  />
                                                  {question.scorable && (
                                                    <label>
                                                      Score
                                                      <input
                                                        className="score"
                                                        type="number"
                                                        value={
                                                          question.scores[oIndex]
                                                        }
                                                        onChange={(event) =>
                                                          handleScoreChange(
                                                            sections,
                                                            setSections,
                                                            sIndex,
                                                            questionKey,
                                                            oIndex,
                                                            event
                                                          )
                                                        }
                                                      />
                                                    </label>
                                                  )}
                                                </div>
                                              )
                                            )}
                                            <div className="default-label">
                                              <label>Default Value</label>
                                              <select
                                                value={question.defaultSelected}
                                                onChange={(event) =>
                                                  handleDefaultSelectionChange(
                                                    sections,
                                                    setSections,
                                                    sIndex,
                                                    questionKey,
                                                    event
                                                  )
                                                }
                                              >
                                                {question.options.map(
                                                  (option, index) => (
                                                    <option
                                                      key={index}
                                                      value={option}
                                                    >
                                                      {option}
                                                    </option>
                                                  )
                                                )}
                                              </select>
                                            </div>
                                          </div>
                                        )}

                                        <input
                                          placeholder="Question instructions"
                                          maxLength={250}
                                          value={question.QuestionInstructions}
                                          onChange={(event) =>
                                            handleQuestionInstructionChange(
                                              setSections,
                                              sIndex,
                                              questionKey,
                                              event
                                            )
                                          }
                                        />

                                        <div className="action-container">
                                          <label className="checkbox-label">
                                            <span className="toggle-label">
                                              &nbsp; Required{" "}
                                            </span>
                                            <input
                                              type="checkbox"
                                              checked={question.required}
                                              onChange={() =>
                                                handleRequiredChange(
                                                  sections,
                                                  setSections,
                                                  sIndex,
                                                  questionKey
                                                )
                                              }
                                            // style={{ display: "none" }}
                                            />

                                            {/* <span className="toggle-slider"></span> */}
                                          </label>
                                          <label className="checkbox-label">
                                            <span className="toggle-label">
                                              &nbsp; Hide Question
                                            </span>
                                            <input
                                              type="checkbox"
                                              checked={question.hidden}
                                              onChange={() =>
                                                handleHiddenquestionChange(
                                                  sections,
                                                  setSections,
                                                  sIndex,
                                                  questionKey
                                                )
                                              }
                                            // style={{ display: "none" }}
                                            />
                                            {/* <span className="toggle-slider"></span> */}
                                          </label>

                                          <div>
                                            <label className="checkbox-label">
                                              <span className="toggle-label">
                                                &nbsp; Hide Score
                                              </span>
                                              <input
                                                type="checkbox"
                                                checked={question.hideScore}
                                                onChange={() =>
                                                  handleHideQuestionScore(
                                                    sections,
                                                    setSections,
                                                    sIndex,
                                                    questionKey
                                                  )
                                                }
                                              />
                                            </label>
                                          </div>

                                          <div>
                                            <label className="checkbox-label">
                                              <span className="toggle-label">
                                                &nbsp; Comment
                                              </span>
                                              <input
                                                type="checkbox"
                                                checked={question.enableComment}
                                                onChange={() =>
                                                  handleEnableQuestionComment(
                                                    sections,
                                                    setSections,
                                                    sIndex,
                                                    questionKey
                                                  )
                                                }
                                              />
                                            </label>
                                          </div>

                                          <Trash2
                                            className="delete-image"
                                            size={18}
                                            onClick={() =>
                                              handleDeleteQuestion(
                                                sections,
                                                setSections,
                                                sIndex,
                                                questionKey
                                              )
                                            }
                                          />

                                          <Copy
                                            className="duplicate-image"
                                            size={18}
                                            onClick={() =>
                                              handleDuplicateQuestion(
                                                sections,
                                                setSections,
                                                sIndex,
                                                questionKey
                                              )
                                            }
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                            {!isSectionCollapsed &&
                              section.subsections.map((subsection, ssIndex) => {
                                const isSubsectionCollapsed =
                                  collapsedSubsections[`${sIndex}-${ssIndex}`];
                                return (
                                  <SubSection
                                    isSubSectionCollapsed={isSubsectionCollapsed}
                                    toggleSubsectionCollapse={
                                      toggleSubsectionCollapse
                                    }
                                    key={ssIndex}
                                    sectionIndex={sIndex}
                                    subsectionIndex={ssIndex}
                                    subSection={subsection}
                                    onDeleteSubsection={
                                      handleDeleteSubsectionWrapper
                                    }
                                    onSubsectionDetailsChange={
                                      handleSubSectionDetailsChangeWrapper
                                    }
                                    onSubsectionDescriptionChange={
                                      handleSubSectionDescriptionChangeWrapper
                                    }
                                    onAddSubsectionQuestion={
                                      handleAddSubQuestionWrapper
                                    }
                                    onAddAfterSubQuestionWrapper={
                                      handleAddAfterSubQuestionWrapper
                                    }
                                    onSubQuestionChange={
                                      handleSubQuestionChangeWrapper
                                    }
                                    onDeleteSubQuestion={
                                      handleDeleteSubQuestionWrapper
                                    }
                                    onAddSubOption={handleAddSubOptionWrapper}
                                    onSubAnswerChange={handleSubAnswerChangeWrapper}
                                    onSubRequiredChange={
                                      handleSubRequiredChangeWrapper
                                    }
                                    onSubTypeChange={handleSubTypeChangeWrapper}
                                    onSubOptionChange={handleSubOptionChangeWrapper}
                                    onSubScoreableChange={
                                      handleSubScoreableChangeWrapper
                                    }
                                    onHandlSubScoreChange={
                                      handleSubScoreChangeWrapper
                                    }
                                    onHandleDuplicate={
                                      handleSubDuplicateQuestionWrapper
                                    }
                                    onSubScoreChange={handleSubScoreChangeWrapper}
                                    onHandleSubQuestionInstruction={
                                      handleSubQuestionInstructionChangeWrapper
                                    }
                                    onHideSubsectionScore={
                                      handleHideSubSectionScoreChangeWrapper
                                    }
                                    onHideSubQuestionScore={
                                      handleHideSubQuestionScoreWrapper
                                    }
                                    onhandleHiddenSubquestionChange={
                                      handleHiddenSubquestionChangeWrapper
                                    }
                                    onEnableSubQuestionComment={
                                      handleEnableSubQuestionCommentWrapper
                                    }
                                    onSubDefaultSelectionChange={
                                      handleSubDefaultSelectionChangeWrapper
                                    }
                                    onSubRadioChange={handleSubRadioChangeWrapper}
                                    onhandleEnableSubSectionComment={
                                      handleEnableSubSectionCommentWrapper
                                    }
                                    onHandleSubOptionDelete={
                                      handleDeleteSubOptionWrapper
                                    }
                                    //added scoring functions
                                    onSubsectionScoringMethodChange={
                                      SubsectionScoringMethodChangeWrapper
                                    }
                                    onsetBasePercentage={setBasePercentage}
                                    onsetSubSectionBasePercentage={
                                      setSubsectionBasePercentageWrapper
                                    }
                                    onsetSubSectionBaselineScore={
                                      setSubsectionBaselineScoreWrapper
                                    }
                                    onHandleDuplicateSubSection={
                                      handleDuplicateSubsectionWrapper
                                    }
                                    focusData={focusData} // Pass the focusData state
                                    focusElement={focusElement}
                                  />
                                );
                              })}
                          </div>
                        );
                      })}
                    </div>

                    <div className="footer-container" id="footer">
                    </div>
                    {isFooterModalVisible && (
                      <ModalPortal>
                        <div className="modal-backdrop">
                          <div className="modal-content-box">
                            <button
                              className="close-modal-button"
                              onClick={closeFooterModal}
                            >
                              &times;
                            </button>

                            <div className="modal-element-footer-inputs">
                              {/* Footer Name Input */}
                              <div className="modal-element-input-group">
                                <label
                                  htmlFor="footer-name"
                                  className="modal-element-input-label"
                                >
                                  Footer Name
                                </label>
                                <input
                                  type="text"
                                  id="footer-name"
                                  placeholder="Enter footer name"
                                  value={footer.name || ""}
                                  onChange={(e) =>
                                    setFooter({ ...footer, name: e.target.value })
                                  }
                                  maxLength={50}
                                  className="modal-element-input-field"
                                />
                              </div>

                              {/* Footer Description Input */}
                              <div className="modal-element-input-group">
                                <label
                                  htmlFor="footer-description"
                                  className="modal-element-input-label"
                                >
                                  Footer Instructions
                                </label>
                                <textarea
                                  id="footer-description"
                                  placeholder="Footer Instructions"
                                  value={footer.description}
                                  maxLength={250}
                                  rows={3}
                                  onChange={(e) =>
                                    setFooter({
                                      ...footer,
                                      description: e.target.value,
                                    })
                                  }
                                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                                />
                              </div>

                              {/* Footer Toggle Controls */}
                              <div className="modal-element-toggle-controls">
                                <div className="modal-element-toggle-header">View</div>
                                <div className="modal-element-toggle-row">
                                  <input
                                    type="checkbox"
                                    id="footer-collapse"
                                    checked={footer.isCollapsed}
                                    onChange={() => setFooter({ ...footer, isCollapsed: !footer.isCollapsed })}
                                    className="modal-element-checkbox-input"
                                  />
                                  <label htmlFor="footer-collapse" className="modal-element-toggle-label">
                                    Collapse Footer
                                  </label>
                                </div>
                                <div className="modal-element-toggle-row">
                                  <input
                                    type="checkbox"
                                    id="footer-comment"
                                    checked={footer.enableComment}
                                    onChange={() => setFooter({ ...footer, enableComment: !footer.enableComment })}
                                    className="modal-element-checkbox-input"
                                  />
                                  <label htmlFor="footer-comment" className="modal-element-toggle-label">
                                    Display Footer Comment
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ModalPortal>
                    )}
                  </form>
                </>
              )}
            </div>
            <FormSidebar
              sections={sections}
              formName={formName}
              formDescription={formDescription}
              sectionDetails={sections.map((q) => q.sectionDetails)}
              sectionDescription={sections.map((q) => q.sectionDescription)}
              isSidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default withAuth(FormBuilder);

