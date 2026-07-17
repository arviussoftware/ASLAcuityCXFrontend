"use client";
import React, { useState, useEffect, useRef } from "react";
import "./Styles/FormPreview.css";
import DOMPurify from "dompurify";
import "./Styles/media_query_form_builder.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { useRouter } from "next/navigation";
import DynamicformNavbar from "./DynamicformNavbar";
import withAuth from "@/components/withAuth";
import FormStructure from "./FormStructure";
import { handlePrint } from "./FormPrint";

// Initialize the answers state based on the questions
const initializeAnswers = (sections) => {
  try {
    const answers = {};
    sections.forEach((section, sIndex) => {
      section.questions.forEach((question, qIndex) => {
        const questionId = `${sIndex}-${qIndex}`;
        if (question.type === "fiveRankedList") {
          answers[questionId] = question.defaultSelected;
        } else {
          answers[questionId] = question.type === "checkboxes" ? [] : "";
        }
        if (question.subQuestions) {
          question.subQuestions.forEach((_, subIndex) => {
            const subQuestionId = `${questionId}-${subIndex}`;
            answers[subQuestionId] =
              question.questionOptionType === "checkboxes" ? [] : "";
          });
        }
      });
      if (section.subsections) {
        section.subsections.forEach((subsection, subIndex) => {
          subsection.questions.forEach((question, qIndex) => {
            const subQuestionId = `${sIndex}-${subIndex}-${qIndex}`;
            if (
              question.type === "fiveRankedList" ||
              question.type === "twoRankedList"
            ) {
              // Set default answer for fiveRankList to the defaultSelected value
              answers[subQuestionId] = question.defaultSelected;
            } else {
              answers[subQuestionId] =
                question.questionOptionType === "checkboxes" ? [] : "";
              // Initialize other question types
            }
            if (question.subQuestions) {
              question.subQuestions.forEach((_, subSubIndex) => {
                const subSubQuestionId = `${subQuestionId}-${subSubIndex}`;
                answers[subSubQuestionId] =
                  question.questionOptionType === "checkboxes" ? [] : "";
              });
            }
          });
        });
      }
    });
    return answers;
  } catch (error) {
    console.error("Error initializing answers:", error);
    return {};
  }
};

const FormPreviewer = ({
  formName,
  formDescription,
  header,
  sections,
  togglePreviewMode,
  onEdit,
  visibilityRules,
  scoringRules,
  hideFormScore,
  showEditButton = true,
  scoringMethod,
  basePercentage,
  baselineScore,
  footer,
}) => {
  const router = useRouter();
  const [isPreviewFull, setIsPreviewFull] = useState(true);
  const [responses, setResponses] = useState({});
  const [disabledQuestions, setDisabledQuestions] = useState({});
  const [disabledScoreQuestions, setDisabledScoreQuestions] = useState({});
  const [visibleInstructions, setVisibleInstructions] = useState({});
  const [visibleComment, setVisibleComment] = useState({});
  const [hiddenSections, setHiddenSections] = useState({});
  const [disabledSections, setDisabledSections] = useState({});
  const [hiddenSubsections, setHiddenSubsections] = useState({});
  const [disabledSubsections, setDisabledSubsections] = useState({});
  const [scores, setScores] = useState({});
  const [increaseScores, setIncreaseScores] = useState({});
  const [decreaseScores, setDecreaseScores] = useState({});
  const [isUserInteracted, setIsUserInteracted] = useState(false);
  const [visbleMaxScore, setMaxScore] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(false);
  const contentRef = useRef();

  const toggleMaxScore = () => {
    setMaxScore(!visbleMaxScore);
  };

  const sanitizeHtmlContent = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== "string") {
      return ""; // Return empty string if invalid
    }

    let sanitized = htmlContent;
    if (typeof window !== "undefined") {
      sanitized = DOMPurify.sanitize(htmlContent);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, "text/html");

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

  const handleBuzzAnimation = () => {
    setBuzzing(true);
    setTimeout(() => {
      setBuzzing(false);
    }, 30); // Reset after the animation duration (0.3s)
  };

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

  useEffect(() => {
    const initializedAnswers = initializeAnswers(sections);
    setResponses(initializedAnswers);
    // applyRules(initializedAnswers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      applyRules(responses); // Ensure applyRules is defined elsewhere
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses]);

  // State for tracking collapsed state of sections and subsections
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedSubsections, setCollapsedSubsections] = useState({});
  const [collapsedHeader, setCollapsedHeader] = useState(
    header?.isCollapsed ??
      !(
        header?.customFields?.length > 0 ||
        header?.description ||
        header?.enableComment
      ),
  );
  const [collapsedFooter, setCollapsedFooter] = useState(
    footer?.isCollapsed || false,
  );
  // Toggle collapse state for sections
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

  // Toggle collapse state for subsections
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
  const [isDropdownOpen, setIsDropdownOpen] = useState({});

  // Toggle dropdown open/close
  const toggleDropdown = (qIndex) => {
    setIsDropdownOpen((prev) => ({
      ...prev,
      [qIndex]: !prev[qIndex],
    }));
  };

  const handleResponseChange = (e, questionId, type, questionOptionType) => {
    if (!isUserInteracted) {
      setIsUserInteracted(true);
    }

    const { value, checked } = e.target; // Get value (and checked state for checkboxes)
    setResponses((prevResponses) => {
      const updatedResponses = { ...prevResponses };

      if (
        questionOptionType === "dropdown" ||
        questionOptionType === "checkboxes"
      ) {
        // Ensure prevResponse is always a string before splitting
        let prevResponse =
          typeof updatedResponses[questionId] === "string"
            ? updatedResponses[questionId]
            : "";
        let newResponses =
          prevResponse.length > 0 ? prevResponse.split(", ") : [];

        if (checked) {
          if (!newResponses.includes(value)) {
            newResponses.push(value);
          }
        } else {
          newResponses = newResponses.filter((option) => option !== value);
        }
        // Store responses as a comma-separated string
        updatedResponses[questionId] =
          newResponses.length > 0 ? newResponses.join(", ") : "";
      } else if (type === "radio" || type === "fiveStar") {
        // Handle radio or five star rating response
        updatedResponses[questionId] = String(e.target.value);
      } else if (type === "drpdwn") {
        updatedResponses[questionId] = e.target.value;
      } else if (type === "slider") {
        // Handle slider input
        const sliderValue = parseInt(value, 10); // Ensure the value is an integer
        updatedResponses[questionId] = sliderValue;
      } else if (type === "emojiStars") {
        updatedResponses[questionId] = value;
      } else {
        // For any other types
        updatedResponses[questionId] = value;
      }
      // Apply any form rules based on the updated responses
      applyRules(updatedResponses, questionId);
      return updatedResponses;
    });
  };

  const applyVisibilityRules = (updatedResponses, currentQuestionId) => {
    try {
      const newDisabledQuestions = { ...disabledQuestions };
      const newHiddenQuestions = { ...hiddenQuestions };
      const newDisabledSubsections = { ...disabledSubsections };
      const newHiddenSubsections = { ...hiddenSubsections };
      const newDisabledSections = { ...disabledSections };
      const newHiddenSections = { ...hiddenSections };
      const newScores = { ...scores };

      // Helper to reverse actions
      const reverseAction = (action) => {
        switch (action?.toLowerCase()) {
          case "disable":
            return "enable";
          case "enable":
            return "disable";
          case "show":
            return "hide";
          case "hide":
            return "show";
          default:
            return null;
        }
      };
      // Function to handle the action (Enable, Disable, Show, Hide)
      const handleThenAction = (targetId, action) => {
        if (!action) return;
        const actionLower = action.toLowerCase();
        const [sectionId, subsectionId, questionId] = targetId.split("-");

        if (questionId !== undefined) {
          // Handle individual questions
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
          // Handle subsections
          if (actionLower === "disable") {
            newDisabledSubsections[targetId] = true;
          } else if (actionLower === "enable") {
            delete newDisabledSubsections[targetId];
            // Enable all questions inside the subsection when enabling the subsection
            Object.keys(newDisabledQuestions).forEach((qid) => {
              const [qSectionId, qSubsectionId] = qid.split("-");
              if (qSectionId === sectionId && qSubsectionId === subsectionId) {
                delete newDisabledQuestions[qid];
              }
            });

            Object.keys(newHiddenQuestions).forEach((qid) => {
              const [qSectionId, qSubsectionId] = qid.split("-");
              if (qSectionId === sectionId && qSubsectionId === subsectionId) {
                delete newHiddenQuestions[qid];
              }
            });
          } else if (actionLower === "hide") {
            newHiddenSubsections[targetId] = true;
            delete newDisabledSubsections[targetId];
            newScores[targetId] = null;

            // Hide all questions inside the subsection
            Object.keys(newHiddenQuestions).forEach((qid) => {
              const [qSectionId, qSubsectionId] = qid.split("-");
              if (qSectionId === sectionId && qSubsectionId === subsectionId) {
                newHiddenQuestions[qid] = true;
              }
            });
          } else if (actionLower === "show") {
            delete newHiddenSubsections[targetId];

            // Show all questions inside the subsection
            Object.keys(newHiddenQuestions).forEach((qid) => {
              const [qSectionId, qSubsectionId] = qid.split("-");
              if (qSectionId === sectionId && qSubsectionId === subsectionId) {
                delete newHiddenQuestions[qid];
              }
            });
          }
        } else if (sectionId) {
          // Handle sections
          if (actionLower === "disable") {
            newDisabledSections[sectionId] = true;
          } else if (actionLower === "enable") {
            delete newDisabledSections[sectionId];
            Object.keys(newDisabledSubsections).forEach((sid) => {
              if (sid.startsWith(`${sectionId}-`)) {
                delete newDisabledSubsections[sid];
                // Enable all questions inside the subsection
                Object.keys(newDisabledQuestions).forEach((qid) => {
                  if (qid.startsWith(`${sid}-`)) {
                    delete newDisabledQuestions[qid];
                  }
                });
              }
            });
          } else if (actionLower === "hide") {
            newHiddenSections[sectionId] = true;
            newScores[targetId] = null;
            delete newDisabledSections[sectionId];
          } else if (actionLower === "show") {
            delete newHiddenSections[sectionId];
          }
        }
      };

      // Apply visibility rules
      visibilityRules.forEach((rule) => {
        const {
          firstOption,
          comparison,
          selectedOptionValue,
          secondOption,
          thenAction,
        } = rule;

        const isQuestionInvolved =
          firstOption === currentQuestionId ||
          secondOption === currentQuestionId;
        if (!isQuestionInvolved) return;

        let responseValue = updatedResponses[firstOption] ?? "N/A";
        if (
          responseValue === undefined ||
          responseValue === null ||
          responseValue === ""
        ) {
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
          // Find similar rules with the same firstOption, secondOption, comparison, and thenAction but different selectedOptionValue
          const matchingRules = visibilityRules.filter(
            (r) =>
              r.firstOption === firstOption &&
              r.secondOption === secondOption &&
              r.comparison === comparison &&
              r.thenAction === thenAction &&
              r.selectedOptionValue !== selectedOptionValue,
          );

          if (matchingRules.length > 0) {
            // Reverse actions for all matching rules
            matchingRules.forEach((matchingRule) => {
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

      // Update state
      setDisabledQuestions(newDisabledQuestions);
      setHiddenQuestions(newHiddenQuestions);
      setDisabledSubsections(newDisabledSubsections);
      setHiddenSubsections(newHiddenSubsections);
      setDisabledSections(newDisabledSections);
      setHiddenSections(newHiddenSections);
    } catch (error) {
      console.error("Error applying rules:", error);
    }
  };

  const applyScoringRules = (updatedResponses) => {
    const updatedScores = { ...scores };
    const updatedIncreaseScores = {};
    const updatedDecreaseScores = {};
    const NewScoreDisabledQuestion = { ...disabledScoreQuestions };

    const setValueApplied = {};
    const sliderMarks = ["N/A", "Poor", "Fair", "Average", "Good", "Excellent"];

    // Reset all scores to base before applying new rules
    Object.keys(updatedScores).forEach((q) => {
      if (updatedScores[q] < 0 || updatedScores[q] === undefined)
        updatedScores[q] = 0;
    });

    // --- Apply all rules ---
    scoringRules.forEach((rule) => {
      const {
        firstOption,
        comparison,
        selectedOptionValue,
        secondOption,
        thenAction,
        setvalue,
      } = rule;

      let responseValue = updatedResponses[firstOption] ?? "N/A";
      if (
        typeof responseValue === "number" &&
        sliderMarks[responseValue] !== undefined
      ) {
        responseValue = sliderMarks[responseValue];
      }

      // --- Check condition ---
      let conditionMet = false;
      switch (comparison) {
        case "equals":
          conditionMet = responseValue === selectedOptionValue;
          break;
        case "not-equals":
          conditionMet = responseValue !== selectedOptionValue;
          break;
        case "is-either":
          conditionMet =
            Array.isArray(selectedOptionValue) &&
            selectedOptionValue.includes(responseValue);
          break;
        default:
          break;
      }

      if (
        responseValue === "N/A" ||
        responseValue === "" ||
        responseValue === undefined
      ) {
        conditionMet = false;
      }

      // Initialize if needed
      if (updatedIncreaseScores[secondOption] === undefined)
        updatedIncreaseScores[secondOption] = 0;
      if (updatedDecreaseScores[secondOption] === undefined)
        updatedDecreaseScores[secondOption] = 0;

      // --- Apply Actions ---
      if (conditionMet) {
        if (thenAction === "Set Value") {
          updatedScores[secondOption] = Number(setvalue);
          setValueApplied[secondOption] = true;
        }

        if (thenAction === "Increase Score" && !setValueApplied[secondOption]) {
          updatedIncreaseScores[secondOption] += Number(setvalue); // ✅ add cumulative increase
        }

        if (thenAction === "Decrease Score" && !setValueApplied[secondOption]) {
          updatedDecreaseScores[secondOption] += Number(setvalue);
        }

        if (thenAction === "Set Answer") {
          updatedResponses[secondOption] = setvalue;
          NewScoreDisabledQuestion[secondOption] = true;
        }
      } else {
        // Important: Don't overwrite an existing increase from another rule
        if (!setValueApplied[secondOption] && thenAction === "Set Answer") {
          NewScoreDisabledQuestion[secondOption] = false;
        }
      }
    });

    // --- Recalculate final scores ---
    Object.keys(updatedScores).forEach((questionId) => {
      updatedScores[questionId] =
        (updatedScores[questionId] || 0) +
        (updatedIncreaseScores[questionId] || 0) -
        (updatedDecreaseScores[questionId] || 0);
    });

    // --- Update state ---
    setScores(updatedScores);
    setIncreaseScores(updatedIncreaseScores);
    setDecreaseScores(updatedDecreaseScores);
    setResponses(updatedResponses);
    setDisabledScoreQuestions(NewScoreDisabledQuestion);
  };

  const applyRules = (updatedResponses, currentQuestionId) => {
    try {
      applyVisibilityRules(updatedResponses, currentQuestionId);
      applyScoringRules(updatedResponses);
    } catch (error) {
      console.error("Error applying rules:", error);
    }
  };

  const calculateQuestionScore = (question, questionId) => {
    let baseScore = null; // Start with null to signify no valid score yet

    if (hiddenQuestions[questionId]) {
      return null;
    }
    // Calculate base score based on question type
    if (
      question.type === "multipleChoice" ||
      question.type === "fiveRankedList" ||
      question.type === "twoRankedList" ||
      question.type === "drpdwn"
    ) {
      const selectedOption = responses[questionId] || question.setValue;
      const optionIndex = question.options.indexOf(selectedOption);

      if (optionIndex !== -1 && selectedOption !== undefined) {
        const validScore =
          question.scores[optionIndex] !== null
            ? Number(question.scores[optionIndex])
            : null;
        baseScore =
          validScore !== null && !isNaN(validScore) ? validScore : null;
      }
    }
    if (baseScore === null) {
      const setScore =
        scores[questionId] !== undefined && scores[questionId] !== null
          ? scores[questionId]
          : null;
      baseScore = setScore !== null && setScore !== -1 ? setScore : null;
    }

    // Prioritize Base Score if it's valid
    let setScore;

    if (scores[questionId] !== undefined && scores[questionId] !== null) {
      // Use scores[questionId] only if it’s explicitly meaningful (not -1 or 0)
      setScore =
        scores[questionId] !== -1 && scores[questionId] !== 0
          ? scores[questionId]
          : baseScore;
    } else {
      // Fallback to Base Score if scores[questionId] is undefined or null
      setScore = baseScore;
    }

    let increaseScore = Number(increaseScores[questionId]) || 0;
    let decreaseScore = Number(decreaseScores[questionId]) || 0;

    if (baseScore === null) {
      return null;
    }

    // Calculate Final Score
    let finalScore = setScore + increaseScore - decreaseScore;
    finalScore = Math.max(finalScore, 0);

    return finalScore;
  };

  const calculateTotalFormScore = (sections, scoringMethod) => {
    let totalScore = 0;
    let totalSectionPossibleScore = 0;
    let questionWiseScore = 0;
    let questionMaxPossibleScore = 0;
    let answeredQuestions = 0;
    let subsectionWiseScore = 0;
    let subsectionMaxScore = 0;
    let attemptedSubSections = 0;
    let sectionWiseScore = 0;
    let sectionMaxScore = 0;
    let attemptedSections = 0;

    try {
      sections.forEach((section, sIndex) => {
        let sectionHasAttemptedQuestions = false;
        const sectionScore = calculateSectionScore(section, sIndex); // Calculate the score for each section

        if (sectionScore > 0) {
          // Assuming the score is > 0 if there are any questions answered.
          sectionHasAttemptedQuestions = true;
          attemptedSections += 1;
        }
        if (hiddenSections[sIndex]) {
          return null;
        }
        totalScore += sectionScore;
        sectionWiseScore += sectionScore;
        const sectionPossibleScore = calculateSectionMaxPossibleScore(
          section,
          sIndex,
        );
        sectionMaxScore += sectionPossibleScore;
        section.subsections.forEach((subSection, subIndex) => {
          let hasAttemptedQuestions = false;
          const qMaxScore = calculateQuesMaxPossibleScore(
            subSection,
            `${sIndex}-${subIndex}`,
          );
          questionMaxPossibleScore += qMaxScore;
          if (hiddenSubsections[`${sIndex}-${subIndex}`]) {
            return null;
          }
          subSection.questions.forEach((question, qIndex) => {
            const questionId = `${sIndex}-${subIndex}-${qIndex}`;
            const userAnswer = responses[questionId];
            const questionScore = calculateQuestionScore(question, questionId);
            if (hiddenQuestions[questionId]) {
              return null;
            }
            const setScore =
              scores[questionId] !== undefined ? scores[questionId] : null; // Manually set score
            if (setScore !== null && setScore !== -1) {
              questionWiseScore += Number(setScore);
              answeredQuestions += 1;
              hasAttemptedQuestions = true;
              sectionHasAttemptedQuestions = true;
              return; // Skip further logic for this question
            }
            if (questionScore !== null) {
              if (question.questionOptionType === "checkboxes") {
                if (Array.isArray(userAnswer) && userAnswer.length > 0) {
                  answeredQuestions += 1;
                  hasAttemptedQuestions = true;
                  sectionHasAttemptedQuestions = true;
                  questionWiseScore += questionScore;
                }
              } else if (question.questionOptionType === "dropdown") {
                if (
                  userAnswer !== undefined &&
                  userAnswer !== "N/A" &&
                  userAnswer !== ""
                ) {
                  answeredQuestions += 1;
                  hasAttemptedQuestions = true;
                  sectionHasAttemptedQuestions = true;
                  questionWiseScore += questionScore;
                }
              } else {
                if (
                  userAnswer !== undefined &&
                  userAnswer !== "N/A" &&
                  userAnswer !== ""
                ) {
                  answeredQuestions += 1;
                  hasAttemptedQuestions = true;
                  sectionHasAttemptedQuestions = true;
                  questionWiseScore += questionScore;
                }
              }
            }
          });
          if (hasAttemptedQuestions) {
            attemptedSubSections += 1;
            const subSectionScore = calculateSubsectionScore(
              subSection,
              `${sIndex}-${subIndex}`,
            );
            if (hiddenSubsections[subIndex]) {
              return null;
            }
            subsectionWiseScore += subSectionScore;
            const subMaxScore = calculateSubSectionMaxPossibleScore(
              subSection,
              `${sIndex}-${subIndex}`,
            );
            if (hiddenSubsections[subIndex]) {
              return null;
            }
            subsectionMaxScore += subMaxScore;
          }
        });

        if (sectionHasAttemptedQuestions) {
          const sectionMaxPossibleScore = calculateSectionMaxPossibleScore(
            section,
            sIndex,
          );

          totalSectionPossibleScore += sectionMaxPossibleScore;
        } else {
          console.log(`Section ${sIndex} - No Attempted Questions`);
        }
      });
      switch (scoringMethod) {
        case "Section Sum":
          totalScore = sectionWiseScore;
          break;
        case "Section Average":
          totalScore =
            attemptedSections > 0 ? sectionWiseScore / attemptedSections : 0;
          break;
        case "Section Percentage":
          totalScore =
            totalSectionPossibleScore > 0
              ? (totalScore / totalSectionPossibleScore) * basePercentage
              : 0;
          break;
        case "Category Sum":
          totalScore = subsectionWiseScore;
          break;
        case "Category Average":
          totalScore = subsectionWiseScore / attemptedSubSections || 0;
          break;
        case "Category Percentage":
          totalScore =
            (subsectionWiseScore / subsectionMaxScore) * basePercentage;
          break;
        case "Question Sum":
          totalScore = questionWiseScore;
          break;
        case "Question Average":
          totalScore = questionWiseScore / answeredQuestions || 0;
          break;
        case "Question Percentage":
          totalScore =
            questionMaxPossibleScore > 0
              ? (questionWiseScore / questionMaxPossibleScore) * basePercentage
              : 0;
          break;
        case "None":
          totalScore = 0;
          break;
        default:
          totalScore = 0;
          break;
      }

      return totalScore;
    } catch (error) {
      console.error("Error Calculating Total Form Score:", error);
      return 0;
    }
  };

  const calculateSectionMaxPossibleScore = (section, sIndex) => {
    let totalPossibleScore = 0;
    let totalMaxPossibleScore = 0;
    let answeredQuestions = 0;
    let attemptedSubSections = 0;

    if (hiddenSections[sIndex]) {
      return null;
    }
    // Section-level dynamic score adjustments
    const sectionDynamicIncrease = increaseScores[sIndex] || 0;
    const sectionDynamicDecrease = decreaseScores[sIndex] || 0;

    // Iterate over each subsection in the section
    section.subsections.forEach((subSection, subIndex) => {
      let subSectionPossibleScore = 0;
      if (hiddenSubsections[subIndex]) {
        return null;
      }
      // Calculate max possible score for this subsection
      subSectionPossibleScore = calculateSubSectionMaxPossibleScore(
        subSection,
        `${sIndex}-${subIndex}`,
      );
      // Get count of answered questions in this subsection
      const answeredQuestionsCount = subSection.questions.filter(
        (_, qIndex) => {
          const questionId = `${sIndex}-${subIndex}-${qIndex}`;
          const userAnswer = responses[questionId];
          const setScore = scores[questionId]; // Get manually set score
          if (hiddenQuestions[questionId]) {
            return null;
          }
          // Check if the question has a manually set score
          if (setScore !== undefined && setScore !== null && setScore !== -1) {
            // Treat the question as "answered" since it has a set score
            answeredQuestions += 1;
            return true; // Count it as an answered question
          }
          return (
            responses[questionId] !== undefined &&
            responses[questionId] !== null &&
            responses[questionId] !== ""
          );
        },
      ).length;

      // Check if there are answered questions in the subsection
      if (answeredQuestionsCount > 0) {
        attemptedSubSections += 1; // Count attempted subsections
        answeredQuestions += answeredQuestionsCount; // Increment total answered questions
      }

      // Add to total max possible score and possible score
      totalMaxPossibleScore += subSectionPossibleScore; // Accumulate max possible score
      totalPossibleScore += subSectionPossibleScore; // Accumulate possible score
    });

    // Section-level scoring method
    switch (section.scoringMethod) {
      case "Question Sum":
        // totalPossibleScore is already the sum of all possible scores
        break;
      case "Question Average":
        totalPossibleScore =
          answeredQuestions > 0 ? totalPossibleScore / answeredQuestions : 0;
        break;
      case "Question Percentage":
        totalPossibleScore =
          answeredQuestions > 0 && totalMaxPossibleScore > 0
            ? (totalPossibleScore / totalMaxPossibleScore) * basePercentage
            : 0;
        break;
      case "Category Sum":
        // totalPossibleScore is already summed from subsections
        break;
      case "Category Average":
        totalPossibleScore =
          attemptedSubSections > 0
            ? totalPossibleScore / attemptedSubSections
            : 0;
        break;
      case "Category Percentage":
        totalPossibleScore =
          totalMaxPossibleScore > 0
            ? (totalPossibleScore / totalMaxPossibleScore) *
              (section.basePercentage || 100)
            : 0;
        break;
      case "None":
        totalPossibleScore = 0;
        break;
      default:
        break;
    }
    // Apply section-level dynamic score adjustments
    totalPossibleScore += sectionDynamicIncrease - sectionDynamicDecrease;
    // Ensure score does not go below zero
    totalPossibleScore = Math.max(totalPossibleScore, 0);
    return totalPossibleScore;
  };

  const calculateSectionScore = (section, sIndex) => {
    let sectionScore = 0;
    let questionWiseScore = 0;
    let maxPossibleScore = 0; // This will hold the total max possible score for the section
    let qMaxPossibleScore = 0; // To calculate max possible score for the section
    let attemptedQuestions = 0;
    let attemptedSubSections = 0; // Count only attempted subsections
    const basePercentage = section.basePercentage;
    let hasResponses = false;

    if (hiddenSections[sIndex]) {
      return null;
    }
    try {
      // Loop through subsections to calculate max possible score
      section.subsections.forEach((subSection, subIndex) => {
        const subSectionId = `${sIndex}-${subIndex}`;
        const subSectionMaxScore = calculateSubSectionMaxPossibleScore(
          subSection,
          subSectionId,
        );
        if (hiddenSubsections[subSectionId]) {
          return null;
        }
        maxPossibleScore += subSectionMaxScore;

        let subSectionHasResponses = false; // Track if this subsection has any responses

        subSection.questions.forEach((question, qIndex) => {
          const questionId = `${subSectionId}-${qIndex}`;
          const userAnswer = responses[questionId];
          const questionScore = calculateQuestionScore(question, questionId);
          const setScore =
            scores[questionId] !== undefined
              ? Number(scores[questionId])
              : null;
          if (hiddenQuestions[questionId]) {
            return null;
          }
          // Calculate the max possible score for the question
          let baseMaxScore = 0;
          // Check question type and calculate max score
          if (
            ["multipleChoice", "fiveRankedList", "twoRankedList"].includes(
              question.type,
            )
          ) {
            const validScores = question.scores
              .map(Number)
              .filter((score) => score !== null && !isNaN(score));
            baseMaxScore =
              validScores.length > 0 ? Math.max(...validScores) : 0; // Use highest valid score
          } else if (question.questionOptionType === "checkboxes") {
            baseMaxScore = question.scores.reduce(
              (sum, score) => sum + (Number(score) || 0),
              0,
            ); // Sum all valid scores
          } else if (question.type === "drpdwn") {
            const selectedOptionIndex = responses[questionId];
            if (selectedOptionIndex !== "" && selectedOptionIndex !== "N/A") {
              const validScores = question.scores
                .map(Number)
                .filter((score) => score !== null && !isNaN(score));
              baseMaxScore =
                validScores.length > 0 ? Math.max(...validScores) : 0;
            }
          }

          // Process dynamic set score logic
          if (setScore !== null && setScore !== -1) {
            question.finalScore = setScore;
            questionWiseScore += Number(setScore);
            question.maxScore = baseMaxScore; // Retain the max score for reference
            qMaxPossibleScore += baseMaxScore; // Add max score to the total
            hasResponses = true; // Mark that there was a response
            subSectionHasResponses = true; // Mark that this subsection has responses
            attemptedQuestions += 1;
            return; // Skip the rest of the logic for this question
          }

          // If there is a user response, calculate score based on response
          if (
            userAnswer !== undefined &&
            userAnswer !== null &&
            userAnswer !== ""
          ) {
            const selectedOptionIndex = question.options.indexOf(userAnswer);
            const responseScore = question.scores[selectedOptionIndex];

            // Skip if the response's score is invalid or null
            if (responseScore === null || isNaN(Number(responseScore))) {
              question.finalScore = 0;
              return;
            }

            // Apply increase/decrease logic
            const increase = increaseScores[questionId] || 0;

            const decrease = decreaseScores[questionId] || 0;
            const adjustedScore = Math.max(
              baseMaxScore + increase - decrease,
              0,
            );
            question.finalScore = adjustedScore;

            // Add the adjusted score to the section's max possible score
            qMaxPossibleScore += adjustedScore;
          } else {
            question.finalScore = 0; // If no answer, set the score to 0
          }

          // Calculate the question-wise score for the section
          if (setScore !== null && setScore !== -1) {
            questionWiseScore += Number(setScore);
          } else if (userAnswer !== undefined && userAnswer !== "") {
            questionWiseScore += questionScore; // Aggregate score for attempted questions
          }

          if (userAnswer !== undefined && userAnswer !== "") {
            attemptedQuestions += 1;
            subSectionHasResponses = true; // Mark subsection as having responses
            hasResponses = true;
          }
        });

        // Aggregate subsection score
        sectionScore += calculateSubsectionScore(subSection, subSectionId);

        if (subSectionHasResponses) {
          attemptedSubSections += 1;
        }
      });

      // Now calculate the section score based on the scoring method
      switch (section.scoringMethod) {
        case "Category Average":
          sectionScore =
            attemptedSubSections > 0 ? sectionScore / attemptedSubSections : 0;
          break;
        case "Category Percentage":
          sectionScore =
            maxPossibleScore > 0
              ? (sectionScore / maxPossibleScore) * (basePercentage || 0)
              : 0;
          break;
        case "Question Sum":
          sectionScore = questionWiseScore;
          break;
        case "Question Average":
          sectionScore =
            attemptedQuestions > 0 ? questionWiseScore / attemptedQuestions : 0;
          break;
        case "Question Percentage":
          sectionScore =
            qMaxPossibleScore > 0
              ? (questionWiseScore / qMaxPossibleScore) * (basePercentage || 0)
              : 0;
          break;
        case "None":
          sectionScore = 0;
          break;
        default:
          break;
      }

      // Final section score calculation
      let finalScore = 0;
      const setScore =
        scores[sIndex] !== undefined ? scores[sIndex] : sectionScore;
      const increaseScore = increaseScores[sIndex] || 0;
      const decreaseScore = decreaseScores[sIndex] || 0;
      if (hasResponses) {
        finalScore = setScore + Number(increaseScore) - Number(decreaseScore);
      } else {
        finalScore = setScore;
      }

      if (setScore === -1 && hasResponses) {
        finalScore = sectionScore + increaseScore - decreaseScore;
      }

      return Math.max(finalScore, 0); // Ensure score is non-negative
    } catch (error) {
      console.error("Error calculating section score", error);
      return 0;
    }
  };

  const calculateSubSectionMaxPossibleScore = (subsection, baseIndex) => {
    let maxPossibleScore = 0;
    let answeredQuestions = 0;

    if (hiddenSubsections[baseIndex]) {
      return null;
    }
    // Iterate over each question in the subsection
    subsection.questions.forEach((question, qIndex) => {
      const questionId = `${baseIndex}-${qIndex}`;
      let baseMaxScore = 0;
      if (hiddenQuestions[questionId]) {
        return null;
      }
      // Fetch dynamic set score (if defined)
      const dynamicSetScore =
        scores[questionId] !== undefined ? Number(scores[questionId]) : null;
      const response = responses[questionId];

      // Step 1: Calculate the base max score based on question type
      if (
        [
          "multipleChoice",
          "fiveRankedList",
          "drpdwn",
          "twoRankedList",
        ].includes(question.type)
      ) {
        const validScores = question.scores
          .map(Number)
          .filter((score) => score !== null && !isNaN(score));
        baseMaxScore = validScores.length > 0 ? Math.max(...validScores) : 0; // Use highest valid score or 0 if all are null
      } else if (question.questionOptionType === "checkboxes") {
        const validScores = question.scores
          .map(Number)
          .filter((score) => score !== null && !isNaN(score));
        baseMaxScore =
          validScores.length > 0
            ? validScores.reduce((sum, score) => sum + score, 0)
            : 0; // Sum valid scores or 0
      } else if (question.questionOptionType === "drpdwn") {
        const validScores = question.scores
          .map(Number)
          .filter((score) => score !== null && !isNaN(score));
        baseMaxScore = validScores.length > 0 ? Math.max(...validScores) : 0; // Use highest valid score or 0 if all are null
      }

      // Step 2: Apply "Set Score" Logic
      if (dynamicSetScore !== null && dynamicSetScore !== -1) {
        question.finalScore = dynamicSetScore;
        question.maxScore = baseMaxScore; // Retain the original max score for reference
        maxPossibleScore += baseMaxScore; // Add the base max score to total
        answeredQuestions += 1;
        return; // Skip other logic for this question
      }

      // Step 3: Apply "Increase/Decrease" Logic if there's a Response
      if (response !== undefined && response !== null && response !== "") {
        const selectedOptionIndex = question.options.indexOf(response);
        const responseScore = question.scores[selectedOptionIndex];

        // Skip if the response's score is invalid or null
        if (responseScore === null || isNaN(Number(responseScore))) {
          question.finalScore = 0;
          return;
        }

        const increase =
          increaseScores[questionId] !== undefined &&
          increaseScores[questionId] !== null
            ? Number(increaseScores[questionId])
            : 0;
        const decrease =
          decreaseScores[questionId] !== undefined &&
          decreaseScores[questionId] !== null
            ? Number(decreaseScores[questionId])
            : 0;
        // Calculate adjusted score based on the increase and decrease
        const adjustedScore = Math.max(baseMaxScore + increase - decrease, 0);
        question.finalScore = adjustedScore;

        maxPossibleScore += adjustedScore;
        answeredQuestions += 1;
      } else {
        question.finalScore = 0; // If no response, score is 0
      }
    });

    // Ensure there are some answered questions before proceeding with calculations
    if (maxPossibleScore === 0) {
      return 0; // If no questions are answered, return 0
    }

    let totalPossibleScore = maxPossibleScore; // Start with the base max score

    // Dynamic subsection-level adjustments
    const subSectionDynamicSetScore =
      scores[baseIndex] !== undefined ? Number(scores[baseIndex]) : null;
    const subSectionDynamicIncrease = increaseScores[baseIndex] || 0;
    const subSectionDynamicDecrease = decreaseScores[baseIndex] || 0;

    // Calculate total possible score based on subsection scoring method
    switch (subsection.scoringMethod) {
      case "Question Sum":
        totalPossibleScore = maxPossibleScore; // Sum of all questions' max possible scores
        break;
      case "Question Average":
        totalPossibleScore =
          answeredQuestions > 0 ? maxPossibleScore / answeredQuestions : 0; // Average of answered questions
        break;
      case "Question Percentage":
        totalPossibleScore = subsection.basePercentage || 0;
        break;
      default:
        totalPossibleScore = maxPossibleScore; // Default to sum of max possible scores
        break;
    }
    // Apply subsection-level dynamic adjustments (if no set score exists)
    if (subSectionDynamicSetScore === null) {
      totalPossibleScore +=
        subSectionDynamicIncrease - subSectionDynamicDecrease;
    }
    // Ensure the score is non-negative
    totalPossibleScore = Math.max(totalPossibleScore, 0);
    return totalPossibleScore;
  };

  const calculateSubsectionScore = (subsection, baseIndex) => {
    let totalScore = 0;
    let answeredQuestions = 0;
    let hasResponses = false;
    let attemptedQuestions = 0;
    let validQuestionCount = 0; // To count questions with a valid score, used for average calculation

    if (hiddenSubsections[baseIndex]) {
      return null;
    }
    try {
      subsection.questions.forEach((question, qIndex) => {
        const questionId = `${baseIndex}-${qIndex}`;
        if (hiddenQuestions[questionId]) {
          return null;
        }
        // Apply rule-defined setScore first, regardless of user response
        let questionScore = calculateQuestionScore(question, questionId);
        const setScore =
          scores[questionId] !== undefined ? scores[questionId] : null;

        if (setScore !== null && setScore !== -1) {
          // If there's a setScore rule, use it directly
          totalScore += Number(setScore);
          attemptedQuestions += 1;
          hasResponses = true; // Mark as responded due to rule

          // Count this question as answered by user if there's a response recorded
          if (
            responses[questionId] !== undefined &&
            responses[questionId] !== null
          ) {
            answeredQuestions += 1;
          }
          validQuestionCount += 1; // Count this question for average calculation
        } else if (questionScore !== null && !isNaN(questionScore)) {
          // If no setScore rule, proceed with normal response checking logic
          const selectedOption =
            responses[questionId] || question.setValue || "";
          let isAnswered = false;

          if (
            question.type === "multipleChoice" ||
            question.type === "fiveRankedList" ||
            question.type === "twoRankedList"
          ) {
            // if (selectedOption !== "" && selectedOption !== undefined && selectedOption !== "N/A") {
            if (selectedOption !== "" && selectedOption !== undefined) {
              totalScore += questionScore;
              isAnswered = true;
              attemptedQuestions += 1;
              hasResponses = true;
              validQuestionCount += 1; // Count this question for average calculation
            }
          } else if (question.questionOptionType === "checkboxes") {
            const anyOptionSelected = question.options.some(
              (option, oIndex) => {
                const optionId = `${questionId}-${oIndex}`;
                const selectedOption = responses[optionId];
                return selectedOption && selectedOption.includes(option);
              },
            );
            if (anyOptionSelected) {
              totalScore += questionScore;
              hasResponses = true;
              validQuestionCount += 1; // Count this question for average calculation
            }
          } else if (question.type === "drpdwn") {
            if (
              (selectedOption !== "" && selectedOption !== "N/A") ||
              (selectedOption === "N/A" && questionScore !== 0)
            ) {
              totalScore += questionScore;
              hasResponses = true;
              validQuestionCount += 1; // Count this question for average calculation
            }
          }
          if (isAnswered) {
            answeredQuestions += 1;
          }
        }
      });
      // Apply the subsection's scoring method
      switch (subsection.scoringMethod) {
        case "Question Sum":
          break;
        case "Question Average":
          totalScore =
            validQuestionCount > 0 ? totalScore / validQuestionCount : 0;
          break;
        case "Question Percentage": {
          const totalPossibleScore = calculateQuesMaxPossibleScore(
            subsection,
            baseIndex,
          );
          totalScore =
            totalPossibleScore > 0
              ? (totalScore / totalPossibleScore) * subsection.basePercentage
              : 0;
          break;
        }
        case "None":
          totalScore = 0;
          break;
        default:
          break;
      }
      // Adjust with setScore, increaseScore, and decreaseScore
      const subsectionSetScore =
        scores[baseIndex] !== undefined ? scores[baseIndex] : null;

      if (hasResponses || subsectionSetScore !== null) {
        // If setScore for subsection is defined, use it
        if (subsectionSetScore !== null && subsectionSetScore !== -1) {
          totalScore = Number(subsectionSetScore);
        }
        if (hasResponses) {
          // Apply increaseScore and decreaseScore at subsection level
          const increaseScore = increaseScores[baseIndex] || 0;
          const decreaseScore = decreaseScores[baseIndex] || 0;

          totalScore =
            totalScore + Number(increaseScore) - Number(decreaseScore);
        }
      }
      // Ensure final score is non-negative
      totalScore = Math.max(totalScore, 0);

      return totalScore;
    } catch (error) {
      console.error("Error calculating subsection score: ", error);
      return 0;
    }
  };

  const calculateQuesMaxPossibleScore = (subsection, baseIndex) => {
    let maxPossibleScore = 0; // Initialize total max possible score

    subsection.questions.forEach((question, qIndex) => {
      const questionId = `${baseIndex}-${qIndex}`;
      let baseMaxScore = 0;

      if (hiddenQuestions[questionId]) {
        return null;
      }
      // Fetch dynamic set score (if defined)
      const dynamicSetScore =
        scores[questionId] !== undefined ? Number(scores[questionId]) : null;
      const response = responses[questionId];

      // Step 1: Calculate the base max score based on question type
      if (
        ["multipleChoice", "fiveRankedList", "twoRankedList"].includes(
          question.type,
        )
      ) {
        const validScores = question.scores
          .map(Number)
          .filter((score) => score !== null && !isNaN(score));
        baseMaxScore = validScores.length > 0 ? Math.max(...validScores) : 0; // Use highest valid score
      } else if (question.questionOptionType === "checkboxes") {
        baseMaxScore = question.scores.reduce(
          (sum, score) => sum + (Number(score) || 0),
          0,
        ); // Sum scores for all checkboxes
      } else if (question.type === "drpdwn") {
        const selectedOptionIndex = responses[questionId];
        if (selectedOptionIndex !== "" && selectedOptionIndex !== "N/A") {
          const validScores = question.scores
            .map(Number)
            .filter((score) => score !== null && !isNaN(score));
          baseMaxScore = validScores.length > 0 ? Math.max(...validScores) : 0;
        }
      }
      // Step 2: Apply "Set Score" Logic
      if (dynamicSetScore !== null && dynamicSetScore !== -1) {
        question.finalScore = dynamicSetScore;
        question.maxScore = baseMaxScore; // Retain the original max score for reference
        maxPossibleScore += baseMaxScore; // Add the base max score to total
        return; // Skip other logic for this question
      }

      // Step 3: Apply "Increase/Decrease" Logic if there's a Response
      if (response !== undefined && response !== null && response !== "") {
        const selectedOptionIndex = question.options.indexOf(response);
        const responseScore = question.scores[selectedOptionIndex];

        // Skip calculation if the response's score is null
        if (responseScore === null || isNaN(Number(responseScore))) {
          question.finalScore = 0;
          return;
        }

        const increase = increaseScores[questionId] || 0;
        const decrease = decreaseScores[questionId] || 0;

        // Calculate adjusted score based on the increase and decrease
        const adjustedScore = Math.max(baseMaxScore + increase - decrease, 0);
        question.finalScore = adjustedScore;

        // Only add this question's score to the total max possible score
        maxPossibleScore += adjustedScore;
      } else {
        // If no response, skip this question entirely from the max possible score calculation
        question.finalScore = 0; // You can set the final score to 0 or any other default if needed
      }
    });

    return maxPossibleScore;
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
      } else if (
        question.type === "shortAnswer" ||
        question.type === "paragraph"
      ) {
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
        case "Question Sum":
          break;
        case "Question Average":
          totalPossibleScore = totalPossibleScore / length || 0;
          break;
        case "Question Percentage":
          if (totalPossibleScore !== 0) {
            totalPossibleScore = subsection.basePercentage;
            break;
          } else totalPossibleScore = 0;
          break;
        case "None":
          totalPossibleScore = 0;
          break;
        default:
          break;
      }
      return totalPossibleScore || 0;
    } catch (error) {
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
        });
        if (hasQuestions) {
          sublength += 1;
          const ssmaxScore = calculateSubSectionMaxScore(subsection);
          totalPossibleScore += ssmaxScore;
        }
      });
      switch (section.scoringMethod) {
        case "Question Sum":
          totalPossibleScore = qmaxpossiblescore || 0;
          break;
        case "Question Average":
          totalPossibleScore = qmaxpossiblescore / length || 0;
          break;
        case "Question Percentage":
          if (qmaxpossiblescore !== 0) {
            totalPossibleScore = section.basePercentage;
            break;
          } else totalPossibleScore = 0;
          break;
        case "Category Sum":
          totalPossibleScore = totalPossibleScore || 0;
          break;
        case "Category Average":
          totalPossibleScore = totalPossibleScore / sublength || 0;
          break;
        case "Category Percentage":
          if (qmaxpossiblescore !== 0) {
            totalPossibleScore = section.basePercentage;
            break;
          } else totalPossibleScore = 0;
          break;
        case "None":
          totalPossibleScore = 0;
          break;
        default:
          break;
      }
      return totalPossibleScore;
    } catch (error) {
      console.error("Error calculating Section Max Score : ", error);
      return;
    }
  };

  // const calculateMaxFormScore = (sections, scoringMethod) => {
  //   let totalScore = 0;
  //   let questionMaxPosibleScore = 0;
  //   let length = 0;
  //   let sublength = 0;
  //   let sectionCount = 0;
  //   let subsectionMaxScore = 0;
  //   let sectionMaxScore = 0;

  //   try {
  //     sections.forEach((section, sIndex) => {
  //       let hasSubsections = false;
  //       let sectionScore = 0;

  //       section.subsections.forEach((subSection) => {
  //         let hasQuestions = false;
  //         subSection.questions.forEach((question) => {
  //           const qMaxscore = calculateQuesMaxScore(question)
  //           questionMaxPosibleScore += qMaxscore;
  //           if (question.scorable) {
  //             length += 1;
  //           }
  //           hasQuestions = true;
  //         }
  //         );
  //         if (hasQuestions) {
  //           const subMaxScore = calculateSubSectionMaxScore(subSection);
  //           subsectionMaxScore += subMaxScore;
  //           sublength += 1;
  //         }
  //       }
  //       );

  //       if(hasSubsections){
  //         sectionMaxScore += sectionScore;
  //         sectionCount += 1;
  //       }
  //     });
  //     switch (scoringMethod) {
  //       case 'Section Sum':
  //         totalScore = sectionMaxScore;
  //         break;
  //         case 'Section Average':
  //           totalScore = sectionMaxScore / sectionCount || 0;
  //         break;
  //       case 'Category Sum':
  //         totalScore = subsectionMaxScore;
  //         break;
  //       case 'Category Average':
  //         totalScore = subsectionMaxScore / sublength || 0;
  //         break;
  //       case 'Category Percentage':
  //         if (questionMaxPosibleScore !== 0) {
  //           totalScore = basePercentage
  //           break;
  //         }
  //         else
  //           totalScore = 0
  //         break;
  //       case 'Question Sum':
  //         totalScore = questionMaxPosibleScore;
  //         break;
  //       case 'Question Average':
  //         totalScore = questionMaxPosibleScore / length || 0;
  //         break;
  //       case 'Question Percentage':
  //         if (questionMaxPosibleScore !== 0) {
  //           totalScore = basePercentage
  //           break;
  //         }
  //         else
  //           totalScore = 0
  //         break;
  //       case 'None':
  //         totalScore = 0;
  //         break;
  //       default:
  //         totalScore = 0;
  //         break;
  //     }
  //     // totalScore = totalScore.toFixed(2);
  //     return (totalScore);
  //   }
  //   catch (error) {
  //     console.error("Error calculating Max Form Score");
  //     return;
  //   }
  // };

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
        if (section.scoringMethod === "None") {
          return 0;
        }
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
        case "Section Sum":
          totalScore = sectionMaxScore || 0;
          break;
        case "Section Average":
          totalScore = sectionMaxScore / sectionCount || 0;
          break;
        case "Section Percentage":
          if (questionMaxPosibleScore !== 0) {
            totalScore = basePercentage;
            break;
          } else totalScore = 0;
          break;
        case "Category Sum":
          totalScore = subsectionMaxScore;
          break;
        case "Category Average":
          totalScore = subsectionMaxScore / sublength || 0;
          break;
        case "Category Percentage":
          totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0;
          break;
        case "Question Sum":
          totalScore = questionMaxPosibleScore;
          break;
        case "Question Average":
          totalScore = questionMaxPosibleScore / length || 0;
          break;
        case "Question Percentage":
          totalScore = questionMaxPosibleScore !== 0 ? basePercentage : 0;
          break;
        case "None":
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

  const emojiMap = {
    Yes: "\u{1F44D}",
    No: "\u{1F44E}",
    "N/A": "\u{1F6AB}",
  };

  const emojiMap1 = {
    Excellent: "\u{1F60D}",
    Good: "\u{1F60A}",
    Average: "\u{1F610}",
    Fair: "\u{1F61F}",
    Poor: "\u{1F621}",
    "N/A": "\u{1F6AB}",
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
    Poor: 1,
    Fair: 2,
    Average: 3,
    Good: 4,
    Excellent: 5,
  };

  const handleCancel = () => {
    router.back();
  };

  let totalFormScore = calculateTotalFormScore(sections, scoringMethod);
  const setScore = scores[formName];
  const incBy = increaseScores[formName];
  const decBy = decreaseScores[formName];
  if (!isNaN(setScore) && setScore !== -1) {
    totalFormScore = setScore;
  } else {
    if (!isNaN(incBy) && incBy !== -1) {
      totalFormScore += incBy;
    }
    if (!isNaN(decBy) && decBy !== -1) {
      totalFormScore -= decBy;
    }
  }
  // Ensure score does not go below 0
  if (totalFormScore < 0) {
    totalFormScore = 0;
  }

  return (
    <div ref={contentRef} id="form-preview-content" className="form-previewer">
      <div className="no-print form-previewer-navbar">
        <DynamicformNavbar
          isPreviewFull={isPreviewFull}
          setIsPreviewFull={setIsPreviewFull}
          toggleMaxScore={toggleMaxScore}
          handlePrint={() => handlePrint(contentRef)}
          onClose={togglePreviewMode || handleCancel}
        />
      </div>

      <div className="form-preview-content">
        {!isPreviewFull && (
          <div className="form-structure no-print">
            <nav className="form-tree-navbar">
              <span className="form-tree-nav-tab active">Form Structure</span>
            </nav>
            <FormStructure
              sections={sections}
              formName={formName}
              showQuestions={true}
              header={header}
              footer={footer}
            />
          </div>
        )}

        <div className={`form-preview ${isPreviewFull ? "full-preview" : ""}`}>
          <div className="form-details" id="form">
            <div className="form-details-header">
              <h3>{formName || "Untitled Form"}</h3>
              <i
                className={`fa ${isDescriptionCollapsed ? "fa-plus-circle" : "fa-minus-circle"} form-details-collapse-btn`}
                onClick={() =>
                  setIsDescriptionCollapsed(!isDescriptionCollapsed)
                }
                title={isDescriptionCollapsed ? "Expand" : "Collapse"}
              />
            </div>
            {!isDescriptionCollapsed && (
              <>
                <div className="form-score">
                  {!hideFormScore && (
                    <>
                      {scoringMethod === "None" ? (
                        // Show the score box only if the score is defined and the answer is correct
                        scores[formName] !== undefined &&
                        scores[formName] >= 0 ? (
                          <div className="totalform-score">
                            <h4>{scores[formName].toFixed(2)}</h4>
                          </div>
                        ) : null // Hide the score box if the score is undefined or negative
                      ) : (
                        // Show form score only if it's greater than or equal to 0
                        totalFormScore >= 0 && (
                          <div className="totalform-score">
                            <h4>{totalFormScore.toFixed(2)}</h4>
                          </div>
                        )
                      )}
                      {/* {visbleMaxScore && scoringMethod !== "None" && (
                  <div className="Form-Max-Score-container">
                    <h2>Max Score{
                      parseFloat{calculateMaxFormScore(sections, scoringMethod).toFixed(2)}
                    }</h2>
                  </div>
                )} */}
                      {visbleMaxScore && scoringMethod !== "None" && (
                        <div className="Form-Max-Score-container">
                          <h4>
                            Max Score{" "}
                            {
                              // Ensure the value is a number and format it with 2 decimals
                              parseFloat(
                                calculateMaxFormScore(sections, scoringMethod),
                              ).toFixed(2)
                            }
                          </h4>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p>
                  <span dangerouslySetInnerHTML={{ __html: formDescription }} />
                </p>
              </>
            )}
          </div>

          {header && (
            <div className="header-section" id="header">
              <h3>
                <div className="header-container-header">
                  <span className="header-details">
                    {header?.name || "Details"}
                  </span>
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
                          collapsedHeader
                            ? "fa fa-plus-circle"
                            : "fa fa-minus-circle"
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
                          textAlign: "inherit",
                          listStyle: "inherit",
                        }}
                      />
                    )}
                  </>
                )}
              </h3>
              {!collapsedHeader && visibleComment[header?.id] && (
                <div className="header-instruction-box">
                  <textarea
                    autoFocus
                    placeholder="Header Comment Box"
                    className="preview-input"
                  />
                </div>
              )}
              {!collapsedHeader && header?.customFields?.length > 0 && (
                <div className="evaluator-title">
                  <h3 className="evaluator-title">
                    {header.customFields.map((field, index) => (
                      <span key={index} className="custom-field">
                        {field.customfieldlable}
                        {index !== header.customFields.length - 1 && ", "}
                      </span>
                    ))}
                  </h3>
                </div>
              )}
            </div>
          )}
          <form>
            {sections.map((section, sIndex) => {
              let sectionScore = calculateSectionScore(section, `${sIndex}`);
              const Smaxscore = calculateSectionMaxScore(section);
              const secId = `${sIndex}`;
              const isSectionCollapsed = collapsedSections[sIndex];
              const isSectionHidden = hiddenSections[secId];
              const isSectionDisabled = disabledSections[secId];
              if (isSectionHidden) {
                return null;
              }
              return (
                <div
                  key={sIndex}
                  id={`section-${sIndex}`}
                  className={`preview-section ${
                    isSectionDisabled ? "disabled" : ""
                  }`}
                >
                  <h3>
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
                            className={
                              isSectionCollapsed
                                ? "fa fa-plus-circle"
                                : "fa fa-minus-circle"
                            }
                          ></i>
                        </div>
                        <div className="section-score-box">
                          {!section.hideScore && (
                            <>
                              {section.scoringMethod === "None" ? (
                                // Show the score box only if the score is defined and the answer is correct
                                scores[`${sIndex}`] !== undefined &&
                                scores[`${sIndex}`] >= 0 ? (
                                  <div className="section-score">
                                    <h4>{scores[`${sIndex}`].toFixed(2)}</h4>
                                  </div>
                                ) : null // Hide the score box if the score is undefined or negative
                              ) : (
                                sectionScore >= 0 && ( // Show when the score is >= 0
                                  <div className="section-score">
                                    <h4>{sectionScore.toFixed(2)}</h4>
                                  </div>
                                )
                              )}
                              {visbleMaxScore &&
                                section.scoringMethod !== "None" && (
                                  <div className="Section-Max-Score-container">
                                    <h4>
                                      Max Score{" "}
                                      {parseFloat(Smaxscore).toFixed(2)}{" "}
                                    </h4>
                                  </div>
                                )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* {visibleInstructions[sIndex] && section.sectionDescription && (
                  <div className="instruction-box">
                    <div dangerouslySetInnerHTML={{ __html: section.sectionDescription }} />
                  </div>
                )} */}

                    {visibleInstructions[sIndex] &&
                      section.sectionDescription && (
                        <div className="instruction-box">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtmlContent(
                                section.sectionDescription,
                              ),
                            }}
                            style={{
                              textAlign: "inherit", // Alignment maintain kare
                              listStyle: "inherit", // Bullets and numbering maintain kare
                            }}
                          />
                        </div>
                      )}
                  </h3>
                  {!isSectionCollapsed &&
                    section.questions.map((question, qIndex) => {
                      const questionId = `${sIndex}-${qIndex}`;
                      const questionScore = calculateQuestionScore(
                        question,
                        questionId,
                      );
                      const isDisabled = disabledQuestions[questionId];
                      if (hiddenQuestions[questionId]) {
                        return null; // Don't render the question if it's hidden
                      }
                      return (
                        <div key={qIndex} className="preview-question">
                          <p className="question-number">{qIndex + 1}.</p>
                          <p className="question-text">
                            {question.question || `Question ${qIndex + 1}`}
                            {question.required && (
                              <span className="required-indicator">*</span>
                            )}
                          </p>
                          <i
                            className="fa fa-info-circle instruction-button"
                            onClick={() => toggleInstructions(questionId)}
                          >
                            {visibleInstructions[questionId]}
                          </i>
                          {question.enableComment && (
                            <i
                              className="fa fa-comment comment-button"
                              onClick={() => toggleComment(questionId)}
                            >
                              {visibleComment[questionId]}
                            </i>
                          )}
                          {visibleInstructions[questionId] && (
                            <div className="instruction-box">
                              {
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: question.QuestionInstructions,
                                  }}
                                />
                              }
                            </div>
                          )}
                          {visibleComment[questionId] && (
                            <div className="instruction-box">
                              <textarea
                                autoFocus
                                type="text"
                                placeholder="Comment"
                                className="preview-input"
                              />
                            </div>
                          )}
                          {question.scorable && !question.hideScore && (
                            <div className="question-score fa fa-sticky-note-o">
                              <h4>{questionScore}</h4>
                            </div>
                          )}
                          {question.scorable && !question.hideScore && (
                            <div className="question-score fa fa-sticky-note-o">
                              <h4>{questionScore}</h4>
                            </div>
                          )}
                          {question.type === "shortAnswer" && (
                            <input
                              type="text"
                              placeholder="Your answer here"
                              className="preview-input"
                              disabled={isDisabled || isSectionDisabled}
                              onChange={(e) =>
                                handleResponseChange(e, questionId)
                              }
                            />
                          )}
                          {question.type === "paragraph" && (
                            <textarea
                              placeholder="Your answer here"
                              rows={4}
                              className="preview-textarea"
                              disabled={isSectionDisabled || isDisabled}
                              onChange={(e) =>
                                handleResponseChange(e, questionId)
                              }
                            />
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
                                    disabled={isSectionDisabled || isDisabled}
                                    onChange={(e) =>
                                      handleResponseChange(
                                        e,
                                        questionId,
                                        "radio",
                                      )
                                    }
                                  />
                                  <label htmlFor={`${questionId}-${oIndex}`}>
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                          {question.type === "checkboxes" && (
                            <div className="preview-options">
                              {question.options.map((option, oIndex) => (
                                <div key={oIndex} className="preview-option">
                                  <input
                                    type="checkbox"
                                    id={`${questionId}-${oIndex}`}
                                    name={`${questionId}-${oIndex}`}
                                    value={option}
                                    disabled={isSectionDisabled || isDisabled}
                                    onChange={(e) =>
                                      handleResponseChange(
                                        e,
                                        questionId,
                                        "checkboxes",
                                      )
                                    }
                                  />
                                  <label htmlFor={`${questionId}-${oIndex}`}>
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                          {question.type === "dropdown" && (
                            <select
                              className="preview-select"
                              multiple
                              disabled={isSectionDisabled || isDisabled}
                              onChange={(e) =>
                                handleResponseChange(e, questionId, "dropdown")
                              }
                            >
                              <option value="">-- Select options --</option>
                              {question.options.map((option, oIndex) => (
                                <option key={oIndex} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                          {question.type === "drpdwn" && (
                            <select
                              className="preview-select"
                              disabled={isSectionDisabled || isDisabled}
                              onChange={(e) =>
                                handleResponseChange(e, questionId, "drpdwn")
                              }
                            >
                              <option value="">-- Select an option --</option>
                              {question.options.map((option, oIndex) => (
                                <option key={oIndex} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                          {question.type === "fiveRankedList" && (
                            <div className="preview-options">
                              {question.options.map((option, oIndex) => (
                                <div key={oIndex} className="preview-option">
                                  <input
                                    type="radio"
                                    id={`${questionId}-${oIndex}`}
                                    name={`question-${sIndex}-${qIndex}`}
                                    value={option}
                                    disabled={isSectionDisabled || isDisabled}
                                    // className="preview-radio"
                                    checked={
                                      responses[`${sIndex}-${qIndex}`] ===
                                      option
                                    }
                                    onChange={(e) =>
                                      handleResponseChange(
                                        e,
                                        questionId,
                                        "radio",
                                      )
                                    }
                                  />
                                  {/* <label>{option}</label> */}
                                  <label htmlFor={`${questionId}-${oIndex}`}>
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === "twoRankedList" && (
                            <div className="preview-options">
                              {question.options.map((option, oIndex) => (
                                <div key={oIndex} className="preview-option">
                                  <input
                                    type="radio"
                                    id={`${questionId}-${oIndex}`}
                                    name={`question-${sIndex}-${qIndex}`}
                                    value={option}
                                    disabled={isSectionDisabled || isDisabled}
                                    // className="preview-radio"
                                    checked={
                                      responses[`${sIndex}-${qIndex}`] ===
                                      option
                                    }
                                    onChange={(e) =>
                                      handleResponseChange(
                                        e,
                                        questionId,
                                        "radio",
                                      )
                                    }
                                  />
                                  {/* <label>{option}</label> */}
                                  <label htmlFor={`${questionId}-${oIndex}`}>
                                    {option}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {!isSectionCollapsed &&
                    section.subsections &&
                    section.subsections.map((subsection, subIndex) => {
                      let subsectionScore = calculateSubsectionScore(
                        subsection,
                        `${sIndex}-${subIndex}`,
                      );
                      const SSmaxScore =
                        calculateSubSectionMaxScore(subsection);
                      const subId = `${sIndex}-${subIndex}`;
                      const isSubsectionCollapsed =
                        collapsedSubsections[`${sIndex}-${subIndex}`];
                      const isSubsectionDisabled = disabledSubsections[subId];
                      const isSubsectionHidden = hiddenSubsections[subId];

                      if (isSubsectionHidden) {
                        return null;
                      }
                      return (
                        <div
                          key={subIndex}
                          id={`subsection-${sIndex}-${subIndex}`}
                          className={`preview-subsection ${
                            isSubsectionDisabled
                              ? "disabled"
                              : "" || isSectionDisabled
                          }`}
                        >
                          <h4>
                            <div className="header-container">
                              <span className="sub-section-details">
                                {subsection.subsectionDetails || ""}
                              </span>
                              <div className="button-group">
                                {subsection.subsectionDescription && (
                                  <i
                                    className="fa fa-info-circle instruction-button"
                                    onClick={() =>
                                      toggleSectionInstructions(subId)
                                    }
                                  >
                                    {visibleInstructions[subId]}
                                  </i>
                                )}
                                {subsection.enableComment && (
                                  <i
                                    className="fa fa-comment comment-button"
                                    onClick={() => toggleComment(subId)}
                                  >
                                    {visibleComment[subId]}
                                  </i>
                                )}
                                <div className="collapse-button">
                                  <i
                                    type="button"
                                    onClick={() =>
                                      toggleSubsectionCollapse(sIndex, subIndex)
                                    }
                                    className={
                                      isSubsectionCollapsed
                                        ? "fa fa-plus-circle"
                                        : "fa fa-minus-circle"
                                    }
                                  ></i>
                                </div>
                                <div className="sub-section-score-box">
                                  {!subsection.hideScore && (
                                    <>
                                      {subsection.scoringMethod === "None" ? (
                                        // Show the score box only if the score is defined and the answer is correct
                                        scores[`${sIndex}-${subIndex}`] !==
                                          undefined &&
                                        scores[`${sIndex}-${subIndex}`] >= 0 ? (
                                          <div className="subsection-score">
                                            <h4>
                                              {scores[
                                                `${sIndex}-${subIndex}`
                                              ].toFixed(2)}
                                            </h4>
                                          </div>
                                        ) : null // Hide the score box if the score is undefined or negative
                                      ) : (
                                        // Show subsection score only if it's greater than or equal to 0
                                        subsectionScore >= 0 && ( // Show when the score is >= 0
                                          <div className="subsection-score">
                                            <h4>
                                              {subsectionScore.toFixed(2)}
                                            </h4>
                                          </div>
                                        )
                                      )}
                                      {visbleMaxScore &&
                                        subsection.scoringMethod !== "None" && (
                                          <div className="Sub-Max-Score-container">
                                            <h4>
                                              Max Score{" "}
                                              {parseFloat(SSmaxScore).toFixed(
                                                2,
                                              )}
                                            </h4>
                                          </div>
                                        )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* {!isSubsectionCollapsed && visibleInstructions[subId] && subsection.subsectionDescription && (
                          <div className="instruction-box">
                            <div dangerouslySetInnerHTML={{ __html: subsection.subsectionDescription }} />
                          </div>
                        )} */}

                            {!isSubsectionCollapsed &&
                              visibleInstructions[subId] &&
                              subsection.subsectionDescription && (
                                <div className="instruction-box">
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeHtmlContent(
                                        subsection.subsectionDescription,
                                      ),
                                    }}
                                    style={{
                                      textAlign: "inherit", // Alignment maintain kare
                                      listStyle: "inherit", // Bullets and numbering maintain kare
                                    }}
                                  />
                                </div>
                              )}
                          </h4>
                          {!isSubsectionCollapsed &&
                            subsection.questions.map((question, qIndex) => {
                              const questionId = `${sIndex}-${subIndex}-${qIndex}`;

                              const maxQuestionScore =
                                calculateQuesMaxScore(question);
                              let subquestionScore = calculateQuestionScore(
                                question,
                                questionId,
                              );
                              const isDisabled = disabledQuestions[questionId];
                              const isScoreQuestionDisabled =
                                disabledScoreQuestions[questionId];
                              if (hiddenQuestions[questionId]) {
                                return null;
                              }
                              return (
                                <div
                                  key={qIndex}
                                  className="preview-question"
                                  id={`question-${sIndex}-${subIndex}-${qIndex}`}
                                >
                                  <div className="sub-question-header">
                                    <div className="question-header">
                                      <p className="question-number">
                                        {qIndex + 1}.
                                      </p>
                                      <p className="question-text">
                                        {question.question || ""}
                                        {question.required && (
                                          <span className="required-indicator">
                                            *
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="scorebox">
                                      <div className="question-icons">
                                        {question.SubQuestionInstructions && (
                                          <i
                                            className="fa fa-info-circle instruction-button"
                                            onClick={() =>
                                              toggleInstructions(questionId)
                                            }
                                          >
                                            {visibleInstructions[questionId]}
                                          </i>
                                        )}
                                        {question.enableComment && (
                                          <i
                                            className="fa fa-comment comment-button"
                                            onClick={() =>
                                              toggleComment(questionId)
                                            }
                                          >
                                            {visibleComment[questionId]}
                                          </i>
                                        )}
                                      </div>
                                      {/* Render max score if applicable */}
                                      {question.scorable &&
                                        visbleMaxScore &&
                                        question.questionOptionType !==
                                          "checkboxes" &&
                                        question.questionOptionType !==
                                          "dropdown" &&
                                        question.type !== "paragraph" &&
                                        question.type !== "shortAnswer" && (
                                          <div className="Question-Max-Score-container">
                                            <h4>
                                              Max Score{" "}
                                              {parseFloat(
                                                maxQuestionScore,
                                              ).toFixed(2)}
                                            </h4>
                                          </div>
                                        )}
                                      {(responses[questionId] ||
                                        scores[questionId] !== undefined) && (
                                        <div>
                                          {question.scorable &&
                                            (question.type ===
                                              "multipleChoice" ||
                                              question.type ===
                                                "fiveRankedList" ||
                                              question.type ===
                                                "twoRankedList" ||
                                              question.type === "drpdwn") &&
                                            !question.hideScore &&
                                            subquestionScore !== null &&
                                            subquestionScore !== " " &&
                                            question.questionOptionType !==
                                              "checkboxes" &&
                                            question.questionOptionType !==
                                              "dropdown" &&
                                            question.type !== "paragraph" &&
                                            question.type !== "shortAnswer" && (
                                              <div className="sub-question-score">
                                                <h4>{subquestionScore}</h4>
                                              </div>
                                            )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {/* {visibleInstructions[questionId] && question.SubQuestionInstructions && (
                                <div className="instruction-box">
                                  {question.SubQuestionInstructions}
                                </div>
                              )} */}

                                  {visibleInstructions[questionId] &&
                                    question.SubQuestionInstructions && (
                                      <div className="instruction-box">
                                        <div
                                          dangerouslySetInnerHTML={{
                                            __html: sanitizeHtmlContent(
                                              question.SubQuestionInstructions,
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
                                    <div>
                                      <input
                                        type="text"
                                        placeholder="Your answer here"
                                        className="preview-input"
                                        maxLength={150}
                                        disabled={
                                          isSectionDisabled ||
                                          isSubsectionDisabled ||
                                          isDisabled ||
                                          isScoreQuestionDisabled
                                        }
                                        onChange={(e) =>
                                          handleResponseChange(e, questionId)
                                        }
                                        value={responses[questionId] || ""}
                                      />
                                      {/* {question.scorable && visbleMaxScore && (
                                    <div className="Question-Max-Score-container">
                                      <h2>Max Score {maxQuestionScore}</h2>
                                    </div>
                                  )} */}
                                    </div>
                                  )}
                                  {question.type === "paragraph" && (
                                    <div>
                                      <textarea
                                        value={responses[questionId] || ""}
                                        placeholder="Your answer here"
                                        rows={2}
                                        maxLength={250}
                                        className="preview-textarea"
                                        disabled={
                                          isSectionDisabled ||
                                          isSubsectionDisabled ||
                                          isDisabled ||
                                          isScoreQuestionDisabled
                                        }
                                        onChange={(e) =>
                                          handleResponseChange(e, questionId)
                                        }
                                      />
                                    </div>
                                  )}
                                  {question.type === "multipleChoice" && (
                                    <div className="preview-options">
                                      {question.options.map(
                                        (option, oIndex) => (
                                          <div
                                            key={oIndex}
                                            className="preview-option"
                                          >
                                            <input
                                              type="radio"
                                              id={`${questionId}-${oIndex}`}
                                              name={questionId}
                                              value={option}
                                              disabled={
                                                isSectionDisabled ||
                                                isSubsectionDisabled ||
                                                isDisabled ||
                                                isScoreQuestionDisabled
                                              }
                                              checked={
                                                responses[questionId] === option
                                              }
                                              onChange={(e) =>
                                                handleResponseChange(
                                                  e,
                                                  questionId,
                                                  "radio",
                                                )
                                              }
                                            />
                                            <label
                                              htmlFor={`${questionId}-${oIndex}`}
                                            >
                                              {option}
                                            </label>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                                  {question.type === "selectMultipleChoice" &&
                                    question.questionOptionType ===
                                      "checkboxes" && (
                                      <div className="preview-options">
                                        {question.options.map(
                                          (option, oIndex) => (
                                            <div
                                              key={oIndex}
                                              className="preview-option"
                                            >
                                              <input
                                                type="checkbox"
                                                id={`${questionId}-${oIndex}`}
                                                name={`${questionId}-${oIndex}`}
                                                value={option}
                                                disabled={
                                                  isSectionDisabled ||
                                                  isSubsectionDisabled ||
                                                  isDisabled ||
                                                  isScoreQuestionDisabled
                                                }
                                                onChange={(e) =>
                                                  handleResponseChange(
                                                    e,
                                                    questionId,
                                                    "checkboxes",
                                                    "checkboxes",
                                                  )
                                                }
                                                checked={(typeof responses[
                                                  questionId
                                                ] === "string"
                                                  ? responses[questionId]
                                                  : ""
                                                )
                                                  .split(", ")
                                                  .includes(option)}
                                              />
                                              <label
                                                htmlFor={`${questionId}-${oIndex}`}
                                              >
                                                {option}
                                              </label>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}

                                  {question.type === "selectMultipleChoice" &&
                                    question.questionOptionType ===
                                      "dropdown" && (
                                      <div className="custom-dropdownn text-xs">
                                        <div
                                          className="dropdown-header"
                                          style={{
                                            minWidth: `${Math.max(
                                              ...question.options.map(
                                                (option) => option.length * 8,
                                              ),
                                              180,
                                            )}px`,
                                          }}
                                          onClick={() => {
                                            if (
                                              !(
                                                isSectionDisabled ||
                                                isSubsectionDisabled ||
                                                isDisabled ||
                                                isScoreQuestionDisabled
                                              )
                                            ) {
                                              toggleDropdown(qIndex);
                                            }
                                          }}
                                        >
                                          {responses[questionId] ? (
                                            <div className="selected-options">
                                              {responses[questionId]
                                                .split(",")
                                                .map((option, oindex) => (
                                                  <span
                                                    key={oindex}
                                                    className="selected-option"
                                                  >
                                                    {option}
                                                    <i
                                                      disabled={
                                                        isSectionDisabled ||
                                                        isSubsectionDisabled ||
                                                        isDisabled ||
                                                        isScoreQuestionDisabled
                                                      }
                                                      className="remove-option"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleResponseChange(
                                                          {
                                                            target: {
                                                              value: option,
                                                              checked: false,
                                                            },
                                                          }, // Simulate unchecking the option
                                                          questionId,
                                                          "dropdown",
                                                          question.questionOptionType,
                                                        );
                                                      }}
                                                    >
                                                      &times;
                                                    </i>
                                                  </span>
                                                ))}
                                            </div>
                                          ) : (
                                            <span className="text-xs">
                                              Select options
                                            </span>
                                          )}
                                          <i
                                            className={`arrow ${
                                              isDropdownOpen[qIndex]
                                                ? "open"
                                                : ""
                                            }`}
                                          ></i>
                                        </div>

                                        {isDropdownOpen[qIndex] && (
                                          <div className="dropdown-options text-xs">
                                            {question.options.map(
                                              (option, optionIndex) => (
                                                <div
                                                  key={optionIndex}
                                                  className="dropdown-option text-xs"
                                                  onClick={(e) => {
                                                    if (
                                                      !(
                                                        isSectionDisabled ||
                                                        isSubsectionDisabled ||
                                                        isDisabled ||
                                                        isScoreQuestionDisabled
                                                      )
                                                    ) {
                                                      handleResponseChange(
                                                        {
                                                          target: {
                                                            value: option,
                                                            checked: !(
                                                              responses[
                                                                questionId
                                                              ] || []
                                                            ).includes(option),
                                                          },
                                                        },
                                                        questionId,
                                                        "dropdown",
                                                        question.questionOptionType,
                                                      );
                                                    }
                                                  }}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    name={`section-${sIndex}-subsection-${subIndex}-question-${qIndex}-${question.type}-${optionIndex}`}
                                                    value={option}
                                                    checked={(
                                                      responses[questionId] ||
                                                      []
                                                    ).includes(option)}
                                                    onChange={(e) => {
                                                      handleResponseChange(
                                                        e,
                                                        questionId,
                                                        "dropdown",
                                                        question.questionOptionType,
                                                      );
                                                    }}
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                  />
                                                  <label>{option}</label>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                  {question.type === "drpdwn" && (
                                    <select
                                      className="preview-select"
                                      disabled={
                                        isSectionDisabled ||
                                        isSubsectionDisabled ||
                                        isDisabled
                                      }
                                      onChange={(e) =>
                                        handleResponseChange(
                                          e,
                                          questionId,
                                          "drpdwn",
                                        )
                                      }
                                      value={responses[questionId] || ""}
                                    >
                                      <option value="">
                                        -- Select an option --
                                      </option>
                                      {question.options.map(
                                        (option, oIndex) => (
                                          <option key={oIndex} value={option}>
                                            {option}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  )}
                                  {question.type === "fiveRankedList" && (
                                    <div className="preview-options">
                                      {question.questionOptionType ===
                                      "fiveStar" ? (
                                        <div
                                          className="five-star-container"
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            margin: "4px 0",
                                            width: "fit-content",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              justifyContent: "center",
                                              marginBottom: "0px",
                                              gap: "5px",
                                            }}
                                          >
                                            {question.options.map(
                                              (option, oIndex) => {
                                                // Get the current value of the star rating for this question
                                                const currentValue =
                                                  responses[
                                                    `${sIndex}-${subIndex}-${qIndex}`
                                                  ];

                                                // Check if the current star should be selected
                                                const isSelected =
                                                  currentValue === option ||
                                                  (currentValue !== "N/A" &&
                                                    currentValue &&
                                                    ratingMap[currentValue] >=
                                                      (ratingMap[option] || 0));

                                                return (
                                                  <span
                                                    key={oIndex}
                                                    className={`star-icon ${
                                                      isSelected
                                                        ? "selected"
                                                        : ""
                                                    }`}
                                                    style={{
                                                      fontSize: "26px",
                                                      color: isSelected
                                                        ? "hsl(var(--primary))"
                                                        : "#ddd",
                                                      cursor: "pointer",
                                                      marginRight: "15px",
                                                      transition:
                                                        "all 0.3s ease",
                                                      padding: "8px",
                                                      transform: "scale(1)",
                                                    }}
                                                    onMouseEnter={(e) =>
                                                      (e.target.style.transform =
                                                        "scale(1.2)")
                                                    }
                                                    onMouseLeave={(e) =>
                                                      (e.target.style.transform =
                                                        "scale(1)")
                                                    }
                                                    onClick={() => {
                                                      if (
                                                        !(
                                                          isSectionDisabled ||
                                                          isSubsectionDisabled ||
                                                          isDisabled ||
                                                          isScoreQuestionDisabled
                                                        )
                                                      ) {
                                                        handleResponseChange(
                                                          {
                                                            target: {
                                                              value: option,
                                                            },
                                                          },
                                                          questionId,
                                                          "fiveStar",
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    ★
                                                  </span>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>
                                      ) : question.questionOptionType ===
                                        "slider" ? (
                                        (() => {
                                          const responseValue =
                                            responses[
                                              `${sIndex}-${subIndex}-${qIndex}`
                                            ]; // Get response string (like "Good", "Poor", etc.)
                                          const ratingMap = {
                                            "N/A": 0,
                                            Poor: 1,
                                            Fair: 2,
                                            Average: 3,
                                            Good: 4,
                                            Excellent: 5,
                                          };
                                          // Ensure we use numeric slider values
                                          const sliderValue =
                                            typeof responseValue === "string"
                                              ? ratingMap[responseValue]
                                              : (responseValue ?? 0);
                                          // Map sliderValue back to the rating string for display
                                          const sliderText = [
                                            "N/A",
                                            "Poor",
                                            "Fair",
                                            "Average",
                                            "Good",
                                            "Excellent",
                                          ][sliderValue];

                                          return (
                                            <div className="slider-container">
                                              <input
                                                type="range"
                                                min="0"
                                                max="5"
                                                step="1"
                                                value={sliderValue} // Dynamically set slider position based on the response
                                                disabled={
                                                  isSectionDisabled ||
                                                  isSubsectionDisabled ||
                                                  isDisabled ||
                                                  isScoreQuestionDisabled
                                                }
                                                onChange={(e) =>
                                                  handleResponseChange(
                                                    {
                                                      target: {
                                                        value: parseInt(
                                                          e.target.value,
                                                          10,
                                                        ),
                                                      },
                                                    }, // Ensure the value is an integer
                                                    questionId,
                                                    "slider",
                                                  )
                                                }
                                                className="slider"
                                                style={{
                                                  width: "100%",
                                                  marginBottom: "10px",
                                                }}
                                              />
                                              <div
                                                className="slider-marks"
                                                style={{
                                                  display: "flex",
                                                  justifyContent:
                                                    "space-between",
                                                }}
                                              >
                                                {[
                                                  "N/A",
                                                  "Poor",
                                                  "Fair",
                                                  "Average",
                                                  "Good",
                                                  "Excellent",
                                                ].map((mark, index) => (
                                                  <span
                                                    key={index}
                                                    className={`slider-mark ${
                                                      sliderValue === index
                                                        ? "active-mark"
                                                        : ""
                                                    }`}
                                                    style={{
                                                      fontSize: "12px",
                                                      fontWeight:
                                                        sliderValue === index
                                                          ? "bold"
                                                          : "normal",
                                                      color:
                                                        sliderValue === index
                                                          ? "hsl(var(--primary))"
                                                          : "hsl(var(--foreground))",
                                                    }}
                                                  >
                                                    {mark}
                                                  </span>
                                                ))}
                                              </div>
                                              <p
                                                className="rating-text"
                                                style={{
                                                  fontSize: "14px",
                                                  marginTop: "10px",
                                                }}
                                              >
                                                {sliderValue !== undefined &&
                                                sliderValue !== null
                                                  ? `${sliderText} (${sliderValue} out of 5)`
                                                  : "No rating selected"}
                                              </p>
                                            </div>
                                          );
                                        })()
                                      ) : question.questionOptionType ===
                                        "emojiStars" ? (
                                        <div
                                          className="emoji-stars-container"
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "10px",
                                          }}
                                        >
                                          {question.options.map(
                                            (emoji, oIndex) => (
                                              <div
                                                key={oIndex}
                                                className={`emoji-stars-wrapper ${responses[questionId] === emoji ? 'selected' : ''}`}
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "10px",
                                                  border: "none",
                                                  padding: "5px 10px",
                                                  borderRadius: "5px",
                                                  backgroundColor:
                                                    responses[questionId] ===
                                                    emoji
                                                      ? "rgba(147, 197, 253, 0.8)"
                                                      : "transparent", // Light blue shade for selected emoji
                                                  cursor: "pointer",
                                                }}
                                                onClick={() => {
                                                  if (
                                                    !isSectionDisabled &&
                                                    !isSubsectionDisabled &&
                                                    !isDisabled &&
                                                    !isScoreQuestionDisabled
                                                  ) {
                                                    // Get the score associated with the emoji/star
                                                    handleResponseChange(
                                                      {
                                                        target: {
                                                          value: emoji,
                                                        },
                                                      },
                                                      questionId,
                                                      "emojiStars",
                                                    );
                                                  }
                                                }}
                                              >
                                                {/* Emoji */}
                                                <span
                                                  style={{
                                                    fontSize: "31px",
                                                    color:
                                                      responses[questionId] ===
                                                      question.scores[oIndex]
                                                        ? "hsl(var(--primary))"
                                                        : "hsl(var(--foreground))",
                                                  }}
                                                >
                                                  {emojiMap1[emoji] || emoji}
                                                  {/* {question.questionOptionType ==="emoji" && emojiMap1[emoji] ? emojiMap1[emoji] : emoji} */}
                                                </span>

                                                {/* Stars */}
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    gap: "13px",
                                                  }}
                                                >
                                                  {[...Array(5)].map(
                                                    (_, starIndex) => (
                                                      <span
                                                        key={starIndex}
                                                        className={`star-icon ${
                                                          starIndex + 1 <=
                                                          question.scores[
                                                            oIndex
                                                          ]
                                                            ? "selected"
                                                            : ""
                                                        }`}
                                                        style={{
                                                          fontSize: "1.5rem",
                                                          color:
                                                            starIndex + 1 <=
                                                            question.scores[
                                                              oIndex
                                                            ]
                                                              ? "hsl(var(--primary))"
                                                              : "hsl(var(--border))",
                                                        }}
                                                      >
                                                        ★
                                                      </span>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      ) : (
                                        question.options.map(
                                          (option, oIndex) => (
                                            <div
                                              key={oIndex}
                                              className="preview-option"
                                            >
                                              <input
                                                type="radio"
                                                id={`${questionId}-${oIndex}`}
                                                name={`sub-question-${sIndex}-${subIndex}-${qIndex}`}
                                                value={option}
                                                disabled={
                                                  isSectionDisabled ||
                                                  isSubsectionDisabled ||
                                                  isDisabled ||
                                                  isScoreQuestionDisabled
                                                }
                                                checked={
                                                  responses[
                                                    `${sIndex}-${subIndex}-${qIndex}`
                                                  ] === option
                                                }
                                                onChange={(e) =>
                                                  handleResponseChange(
                                                    e,
                                                    questionId,
                                                    "radio",
                                                  )
                                                }
                                              />
                                              <label
                                                htmlFor={`${questionId}-${oIndex}`}
                                              >
                                                {question.questionOptionType ===
                                                  "emojiStars" &&
                                                question.type ===
                                                  "fiveRankedList"
                                                  ? emojiMap1[option] || option
                                                  : option}
                                                {/* {emojiMap1[option] || option} */}
                                              </label>
                                            </div>
                                          ),
                                        )
                                      )}
                                    </div>
                                  )}

                                  {question.type === "twoRankedList" && (
                                    <div className="preview-options">
                                      {question.options.map(
                                        (option, oIndex) => (
                                          <div
                                            key={oIndex}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "10px",
                                            }}
                                            className={`preview-option ${
                                              question.questionOptionType ===
                                              "emoji"
                                                ? "emoji-preview"
                                                : ""
                                            }`}
                                          >
                                            <input
                                              type="radio"
                                              id={`${questionId}-${oIndex}`}
                                              name={`sub-question-${sIndex}-${subIndex}-${qIndex}`}
                                              value={option}
                                              disabled={
                                                isSectionDisabled ||
                                                isSubsectionDisabled ||
                                                isDisabled ||
                                                isScoreQuestionDisabled
                                              }
                                              checked={
                                                responses[
                                                  `${sIndex}-${subIndex}-${qIndex}`
                                                ] === option
                                              }
                                              onChange={(e) => {
                                                handleResponseChange(
                                                  e,
                                                  questionId,
                                                  "radio",
                                                );
                                                // Apply buzz animation only for emoji options
                                                if (
                                                  question.questionOptionType ===
                                                  "emoji"
                                                ) {
                                                  handleBuzzAnimation(); // Trigger animation on selection
                                                }
                                              }}
                                              style={{
                                                display:
                                                  question.questionOptionType ===
                                                  "emoji"
                                                    ? "none"
                                                    : "inline-block", // Hide radio button for emoji
                                              }}
                                            />
                                            <label
                                              htmlFor={`${questionId}-${oIndex}`}
                                              className={`${question.questionOptionType === "emoji" ? "emoji-label" : ""} ${
                                                responses[
                                                  `${sIndex}-${subIndex}-${qIndex}`
                                                ] === option
                                                  ? "selected"
                                                  : ""
                                              }`}
                                              style={{
                                                fontSize:
                                                  question.questionOptionType ===
                                                  "emoji"
                                                    ? "31px"
                                                    : "12px",
                                                transform:
                                                  question.questionOptionType ===
                                                  "emoji"
                                                    ? "scale(1)"
                                                    : responses[
                                                          `${sIndex}-${subIndex}-${qIndex}`
                                                        ] === option
                                                      ? "scale(1.35)"
                                                      : "scale(1)", // Apply scale only to non-emoji selected options
                                                transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s, box-shadow 0.25s, border-color 0.25s",
                                              }}
                                            >
                                              {/* Only use emojiMap for twoRankedList with emoji type */}
                                              {question.questionOptionType ===
                                                "emoji" &&
                                              question.type === "twoRankedList"
                                                ? emojiMap[option] || option
                                                : option}
                                            </label>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}

                                  {visibleComment[questionId] && (
                                    <div className="question-instruction-box">
                                      <textarea
                                        autoFocus
                                        type="text"
                                        maxLength={250}
                                        placeholder="Question Comment"
                                        className="preview-input"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          {!isSubsectionCollapsed && visibleComment[subId] && (
                            <div className="sub-section-instruction-box">
                              <textarea
                                autoFocus
                                type="text"
                                maxLength={250}
                                placeholder="Sub-Category Comment Box"
                                className="preview-input"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {!isSectionCollapsed && visibleComment[secId] && (
                    <div className="section-instruction-box">
                      <textarea
                        autoFocus
                        type="text"
                        placeholder="Category Comment Box"
                        maxLength={250}
                        className="preview-input"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </form>
          <div>
            {!showEditButton && (
              <button
                className="preview-buttons"
                type="button"
                onClick={handleCancel}
              >
                Cancel
              </button>
            )}
          </div>
          <div className="footer-section" id="footer">
            <h3>
              <div className="footer-container-footer">
                <span className="footer-details">
                  {footer?.name || "Summary"}
                </span>
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
                        collapsedFooter
                          ? "fa fa-plus-circle"
                          : "fa fa-minus-circle"
                      }
                    />
                  </div>
                </div>
              </div>
              {!collapsedFooter && (
                <>
                  {visibleInstructions[footer] && footer?.description && (
                    <div className="instruction-box">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: footer?.description,
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </h3>
            {!collapsedFooter && visibleComment[footer] && (
              <div className="footer-instruction-box">
                <textarea
                  autoFocus
                  type="text"
                  placeholder="footer Comment Box"
                  className="preview-input"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAuth(FormPreviewer);
