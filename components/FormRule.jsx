import React, { useState, useEffect } from "react";
import FormRuleTreeScore from "./FormRuleTreeScore";
import { useRouter } from "next/navigation"; // Add this for navigation
import withAuth from "@/components/withAuth";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

const encryptData = (data) => {
  try {
    return CryptoJS.AES.encrypt(
      JSON.stringify(data),
      ENCRYPTION_KEY
    ).toString();
  } catch (error) {
    console.error("Error encrypting data:", error);
    return null;
  }
};

const FormRule = ({
  formId,
  formName,
  sections,
  visibilityRules: initialvisibilityRules,
  scoringRules: initialscoringRules,
  disabledOptions: initialdisabledOptions,
  toggleRuleMode,
  onRulesUpdate,
}) => {
  const [visibilityRules, setVisibilityRules] = useState(
    initialvisibilityRules || []
  );
  const [scoringRules, setScoringRules] = useState(initialscoringRules || []);
  const [disabledOptions, setDisabledOptions] = useState(
    initialdisabledOptions || { first: new Set(), second: new Set() }
  );
  const [ruleType, setRuleType] = useState("visibility");
  const [prevQuestions, setPrevQuestions] = useState(getAllQuestions(sections));
  const [prevSections, setPrevSections] = useState(sections); // Store previous sections
  const [isCanceled, setIsCanceled] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    sessionStorage.removeItem("visibilityRules");
    sessionStorage.removeItem("scoringRules");
    sessionStorage.removeItem("disabledOptions");
  }, []);

  useEffect(() => {
    saveRules(visibilityRules, scoringRules);

    saveDisabledOptions(disabledOptions); //Save disabled options
    onRulesUpdate(visibilityRules, scoringRules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilityRules, scoringRules, disabledOptions]);

  function getAllQuestions(sections) {
    return sections.flatMap(
      (section, sectionIndex) =>
        section.subsections?.flatMap((subsection) =>
          subsection.questions?.map((q) => ({
            // id: `${sectionIndex}-${subsectionIndex}-${questionIndex}`,
            unique_id: q.id,
            options: JSON.stringify(q.options),
            questionOptionType: q.questionOptionType,
            type: q.type,
          }))
        ) || []
    );
  }

  function hasQuestionChanged(prevQuestions, newQuestions) {
    return prevQuestions
      .filter((prevQ) => {
        const newQ = newQuestions.find((q) => q.unique_id === prevQ.unique_id);
        return (
          newQ &&
          (prevQ.options !== newQ.options ||
            prevQ.questionOptionType !== newQ.questionOptionType ||
            prevQ.type !== newQ.type)
        );
      })
      .map((q) => q.unique_id);
  }

  const findIndexByUniqueId = (uniqueId, sections) => {
    for (let s = 0; s < sections.length; s++) {
      for (let ss = 0; ss < sections[s].subsections.length; ss++) {
        for (let q = 0; q < sections[s].subsections[ss].questions.length; q++) {
          if (sections[s].subsections[ss].questions[q]?.id === uniqueId) {
            return `${s}-${ss}-${q}`;
          }
        }
      }
    }
    return null;
  };

  useEffect(() => {
    const remapSelectedIndexes = () => {
      const updateRuleIndex = (rule) => {
        const updatedRule = { ...rule };

        if (rule.firstOptionUniqueId) {
          const latestFirst = findIndexByUniqueId(
            rule.firstOptionUniqueId,
            sections
          );
          if (latestFirst) updatedRule.firstOption = latestFirst;
        }

        if (rule.secondOptionUniqueId) {
          const latestSecond = findIndexByUniqueId(
            rule.secondOptionUniqueId,
            sections
          );
          if (latestSecond) updatedRule.secondOption = latestSecond;
        }
        return updatedRule;
      };

      setVisibilityRules((rules) => rules.map(updateRuleIndex));
      setScoringRules((rules) => rules.map(updateRuleIndex));
    };
    remapSelectedIndexes();
  }, [sections]);

  useEffect(() => {
    if (scoringRules.length > 0) {
      // Recalculate disabled options whenever rules change (visibility or scoring)
      const recalculateDisabledOptions = () => {
        const newDisabledFirst = new Set();
        const newDisabledSecond = new Set();

        // Iterate over all rules and add the latest firstOption and secondOption
        scoringRules.forEach((rule) => {
          if (rule.firstOption) newDisabledFirst.add(rule.firstOption);
          if (rule.secondOption) newDisabledSecond.add(rule.secondOption);
        });
        setDisabledOptions({
          first: newDisabledFirst,
          second: newDisabledSecond,
        });
        // Update state with only the valid disabled options
        setDisabledOptions({
          first: newDisabledFirst,
          second: newDisabledSecond,
        });
      };

      recalculateDisabledOptions();
    }
    // Call function to update disabled options
  }, [scoringRules]);

  useEffect(() => {
    if(isInitialLoad){
      setPrevSections(sections);
      setPrevQuestions(getAllQuestions(sections));
      setIsInitialLoad(false);
      return
    }
    if (isCanceled) {
      const updatedSections = [...sections];
      updatedSections.forEach((section, sectionIndex) => {
        section.subsections.forEach((subsection, subsectionIndex) => {
          subsection.questions.forEach((question, questionIndex) => {
            const prevQuestion = prevQuestions.find(
              (q) =>
                q.id === `${sectionIndex}-${subsectionIndex}-${questionIndex}`
            );
            if (prevQuestion) {
              if (question.type === prevQuestion.type) {
                question.options = JSON.parse(prevQuestion.options);
              }
            }
          });
        });
      });
      setPrevSections(sections);
      setPrevQuestions(getAllQuestions(sections));
      setIsCanceled(false);
      return;
    }

    const newQuestions = getAllQuestions(sections);
    const changedQuestionIds = hasQuestionChanged(prevQuestions, newQuestions);

    if (changedQuestionIds.length > 0) {
      const formattedChangedQuestionIds = changedQuestionIds
        .map((uniqueId) => findIndexByUniqueId(uniqueId, sections))
        .filter((id) => id !== null);

      const filteredVisibilityRules = visibilityRules.filter((rule) => {
        const firstOptionIndex = isIndexFormat(rule.firstOption)
          ? rule.firstOption
          : convertPathToIndexFormat(rule.firstSelectedOption, sections);
        const secondOptionIndex = isIndexFormat(rule.secondOption)
          ? rule.secondOption
          : convertPathToIndexFormat(rule.secondSelectedOption, sections);

        const shouldRemove =
          formattedChangedQuestionIds.includes(firstOptionIndex) ||
          formattedChangedQuestionIds.includes(secondOptionIndex);

        if (shouldRemove) {
          console.log(
            `Removing Rule ${rule.id} because it matches changed question ID: ${firstOptionIndex} or ${secondOptionIndex}`
          );
        }
        return !shouldRemove;
      });

      const filteredScoringRules = scoringRules.filter((rule) => {
        const firstOptionIndex = isIndexFormat(rule.firstOption)
          ? rule.firstOption
          : convertPathToIndexFormat(rule.firstSelectedOption, sections);
        const secondOptionIndex = isIndexFormat(rule.secondOption)
          ? rule.secondOption
          : convertPathToIndexFormat(rule.secondSelectedOption, sections);

        const shouldRemove =
          formattedChangedQuestionIds.includes(firstOptionIndex) ||
          formattedChangedQuestionIds.includes(secondOptionIndex);

        if (shouldRemove) {
          console.log(
            `Removing Rule ${rule.id} because it matches changed question ID: ${firstOptionIndex} or ${secondOptionIndex}`
          );
        }
        return !shouldRemove;
      });

      // Check if any rules were removed
      const hasRulesRemoved =
        filteredVisibilityRules.length < visibilityRules.length ||
        filteredScoringRules.length < scoringRules.length;

      // Show the alert only if rules are removed
      if (hasRulesRemoved) {
        const confirmRemove = window.confirm(
          "The Question has been changed and the Rules defined aren't legal anymore \nDo you wish to continue with the changes and Remove the rules?"
        );

        if (!confirmRemove) {
          setIsCanceled(true);
          return;
        }
      }
      // If user clicked Yes, apply the changes to the rules
      setVisibilityRules(filteredVisibilityRules);
      setScoringRules(filteredScoringRules);

      // Save updates
      saveRules(filteredVisibilityRules, filteredScoringRules);
      onRulesUpdate(filteredVisibilityRules, filteredScoringRules);
      // Update previous questions and sections immediately after processing
      setPrevQuestions(newQuestions);
      setPrevSections(sections);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, isCanceled]);

  const handleAddRule = () => {
    try {
      const newRuleSection = {
        id: Date.now(),
        firstSelectedOption: null,
        secondSelectedOption: null,
        comparison: "equals",
        checkedOptions: [],
        selectedOptionValue: "",
        thenAction: ruleType === "visibility" ? "enable" : "Set Value",
        dropdownEnabled: false,
        options: [],
        setvalue: "",
      };

      // Update rules and save them
      if (ruleType === "visibility") {
        const updatedVisibilityRules = [...visibilityRules, newRuleSection];
        setVisibilityRules(updatedVisibilityRules);
        saveRules(updatedVisibilityRules, scoringRules);
        onRulesUpdate(updatedVisibilityRules, scoringRules, disabledOptions);
      } else if (ruleType === "scoring") {
        const updatedScoringRules = [...scoringRules, newRuleSection];
        setScoringRules(updatedScoringRules);
        saveRules(visibilityRules, updatedScoringRules);
        onRulesUpdate(visibilityRules, updatedScoringRules, disabledOptions);
        saveDisabledOptions(disabledOptions); // Save updated disabledOptions
      }
    } catch (error) {
      console.error("Error adding rule:", error);
    }
  };

  const saveRules = (visibilityRulesToSave, scoringRulesToSave) => {
    try {
      const validVisibilityRules = validateRule(visibilityRulesToSave);
      const validScoringRules = validateRule(scoringRulesToSave);

      const encryptedVisibilityRules = encryptData(validVisibilityRules);
      const encryptedScoringRules = encryptData(validScoringRules);

      // Generate SHA-256 hashes
      const visibilityRulesHash = CryptoJS.SHA256(
        encryptedVisibilityRules
      ).toString();
      const scoringRulesHash = CryptoJS.SHA256(
        encryptedScoringRules
      ).toString();

      // Save encrypted rules and their hashes
      sessionStorage.setItem("visibilityRules", encryptedVisibilityRules);
      sessionStorage.setItem("visibilityRulesHash", visibilityRulesHash);
      sessionStorage.setItem("scoringRules", encryptedScoringRules);
      sessionStorage.setItem("scoringRulesHash", scoringRulesHash);

      // setLastValidVisibilityHash(visibilityRulesHash);
      // setLastValidScoringHash(scoringRulesHash);
    } catch (error) {
      console.error("Error saving rules:", error);
    }
  };

  const saveDisabledOptions = (
    disabledOptionsToSave = { first: [], second: [] }
  ) => {
    try {
      const convertedDisabledOptions = {
        first: Array.from(disabledOptionsToSave.first || []),
        second: Array.from(disabledOptionsToSave.second || []),
      };
      const encryptedDisabledOptions = encryptData(convertedDisabledOptions);
      sessionStorage.setItem("disabledOptions", encryptedDisabledOptions);
    } catch (error) {
      console.error("Error saving disabled options:", error);
    }
  };

  //Automatically Save When Rules Are Changed Using useEffect
  useEffect(() => {
    if (visibilityRules.length > 0 || scoringRules.length > 0) {
      saveRules(visibilityRules, scoringRules);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilityRules, scoringRules]);

  const handleRemoveRule = (id) => {
    try {
      let removedRule;
      if (ruleType === "visibility") {
        removedRule = visibilityRules.find((rule) => rule.id === id);
        const updatedVisibilityRules = visibilityRules.filter(
          (rule) => rule.id !== id
        );
        setVisibilityRules(updatedVisibilityRules);
        saveRules(updatedVisibilityRules, scoringRules);
        onRulesUpdate(updatedVisibilityRules, scoringRules);

        if (scoringRules.length === 0) {
          const resetOptions = { first: new Set(), second: new Set() };
          setDisabledOptions(resetOptions);
          saveDisabledOptions(resetOptions);
          return;
        }
      } else if (ruleType === "scoring") {
        removedRule = scoringRules.find((rule) => rule.id === id);
        const updatedScoringRules = scoringRules.filter(
          (rule) => rule.id !== id
        );
        setScoringRules(updatedScoringRules);
        saveRules(visibilityRules, updatedScoringRules);
        onRulesUpdate(visibilityRules, updatedScoringRules);

        if (updatedScoringRules.length === 0) {
          const resetOptions = { first: new Set(), second: new Set() };
          setDisabledOptions(resetOptions);
          saveDisabledOptions(resetOptions);
          return;
        }
      }

      if (removedRule) {
        setDisabledOptions((prev) => {
          const updatedFirst = new Set(prev.first);
          const updatedSecond = new Set(prev.second);

          // Collect all firstSelectedOptions and secondSelectedOptions from remaining rules
          const remainingFirstOptions = new Set(
            [...visibilityRules, ...scoringRules]
              .filter((rule) => rule.id !== id) // Exclude the removed rule
              .map((rule) =>
                convertPathToIndexFormat(rule.firstSelectedOption, sections)
              )
          );

          const remainingSecondOptions = new Set(
            [...visibilityRules, ...scoringRules]
              .filter((rule) => rule.id !== id) // Exclude the removed rule
              .map((rule) =>
                convertPathToIndexFormat(rule.secondSelectedOption, sections)
              )
          );

          // Remove only if no other rule references it
          if (removedRule.firstSelectedOption) {
            const firstOptionIndex = convertPathToIndexFormat(
              removedRule.firstSelectedOption,
              sections
            );
            if (!remainingFirstOptions.has(firstOptionIndex)) {
              updatedFirst.delete(firstOptionIndex);
            }
          }

          if (removedRule.secondSelectedOption) {
            const secondOptionIndex = convertPathToIndexFormat(
              removedRule.secondSelectedOption,
              sections
            );
            if (!remainingSecondOptions.has(secondOptionIndex)) {
              updatedSecond.delete(secondOptionIndex);
            }
          }

          const newDisabledOptions = {
            first: updatedFirst,
            second: updatedSecond,
          };
          saveDisabledOptions(newDisabledOptions);
          return newDisabledOptions;
        });
      }
    } catch (error) {
      console.error("Error removing rule:", error);
    }
  };

  const convertPathToIndexFormat = (path, sections) => {
    try {
      if (!path) {
        return null;
      }

      const parts = path.split(" > ");
      const indices = [];
      let currentLevel = sections;

      if (parts[0] === formName) {
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          if (i === 1) {
            // Handle sections
            const sectionIndex = currentLevel.findIndex(
              (section) => section.sectionDetails === part
            );
            if (sectionIndex !== -1) {
              indices.push(sectionIndex);
              currentLevel = currentLevel[sectionIndex];
            } else {
              console.error("Section not found:", part);
              return null;
            }
          } else if (i === 2 && currentLevel.subsections) {
            // Handle subsections
            const subsectionIndex = currentLevel.subsections.findIndex(
              (subsection) => subsection.subsectionDetails === part
            );
            if (subsectionIndex !== -1) {
              indices.push(subsectionIndex);
              currentLevel = currentLevel.subsections[subsectionIndex];
            } else {
              console.error("Subsection not found:", part);
              return null;
            }
          } else if (i === 3 && currentLevel.questions) {
            // Handle questions
            const questionIndex = currentLevel.questions.findIndex(
              (question) => question.question === part
            );
            if (questionIndex !== -1) {
              indices.push(questionIndex);
            } else {
              console.error("Question not found:", part);
              return null;
            }
          } else {
            console.error("Invalid path structure at part:", part);
            return null;
          }
        }
      } else {
        console.error("Form name mismatch:", parts[0]);
        return null;
      }
      return indices.join("-");
    } catch (error) {
      console.error("Error converting path to index format:", error);
      return null;
    }
  };

  const isIndexFormat = (value) => /^(\d+)(-\d+)?(-\d+)?$/.test(value);

  const validateRule = (ruleSections) => {
    return ruleSections
      .map((section) => {
        try {
          if (
            !section.firstOption &&
            !section.secondOption &&
            !section.selectedOptionValue
          ) {
            return { invalid: false, emptyRule: true };
          }

          // Get first and second question indexes
          const firstOptionIndex = isIndexFormat(section.firstOption)
            ? section.firstOption
            : convertPathToIndexFormat(section.firstSelectedOption, sections);

          const secondOptionIndex = isIndexFormat(section.secondOption)
            ? section.secondOption
            : section.secondSelectedOption === formName
            ? formName
            : convertPathToIndexFormat(section.secondSelectedOption, sections);

          if (
            firstOptionIndex ||
            secondOptionIndex === formName ||
            secondOptionIndex
          ) {
            const options =
              section.comparison === "is-either"
                ? section.checkedOptions
                : [section.selectedOptionValue];

            return {
              id: section.id,
              formName: section.formName,

              firstOption: firstOptionIndex || null,
              firstOptionUniqueId: section.firstOptionUniqueId || null, // ✅ PRESERVED
              firstSelectedOption: section.firstSelectedOption || "",

              comparison: section.comparison || null,
              options: options,
              thenAction: section.thenAction,

              secondOption: secondOptionIndex || null,
              secondOptionUniqueId: section.secondOptionUniqueId || null, // ✅ PRESERVED
              secondSelectedOption: section.secondSelectedOption || "",

              checkedOptions:
                section.comparison === "is-either"
                  ? section.checkedOptions
                  : [section.selectedOptionValue],

              selectedOptionValue:
                section.comparison === "is-either"
                  ? section.checkedOptions
                  : section.selectedOptionValue,

              setvalue:
                section.thenAction === "Set Value"
                  ? section.setvalue
                  : ["Increase Score", "Decrease Score", "Set Answer"].includes(
                      section.thenAction
                    )
                  ? section.setvalue
                  : null,
            };
          } else {
            console.error("Invalid selection for rule:", section);
            return { invalid: true };
          }
        } catch (error) {
          console.error("Error validating rule:", section, error);
          return { invalid: true };
        }
      })
      .filter((rule) => !rule.invalid);
  };

  const handleQuestionSelect = (
    selectedQuestion,
    sectionId,
    isSecondDropdown = false
  ) => {
    try {
      const selectedQuestionIndex =
        selectedQuestion.value === formName
          ? formName
          : convertPathToIndexFormat(selectedQuestion.value, sections);

      const selectedQuestionId = selectedQuestion.id; // ✅ Will now work after FormRuleTreeScore fix

      const updateRules = (rules) =>
        rules.map((section) => {
          if (section.id !== sectionId) return section;

          const isScoring = ruleType === "scoring";
          const isAfterFirstRule = isScoring && scoringRules.length > 0;

          const firstSelectedOptionIndex = section.firstOption;
          const secondSelectedOptionIndex = section.secondOption;

          const newFirstOption = isSecondDropdown
            ? section.firstOption
            : selectedQuestionIndex;
          const newSecondOption = isSecondDropdown
            ? selectedQuestionIndex
            : section.secondOption;

          const newFirstId = isSecondDropdown
            ? section.firstOptionUniqueId
            : selectedQuestionId;
          const newSecondId = isSecondDropdown
            ? selectedQuestionId
            : section.secondOptionUniqueId;

          const newDisabledOptions = {
            first: new Set(disabledOptions.first || []),
            second: new Set(disabledOptions.second || []),
          };

          // ❌ Same question selected on both dropdowns — not allowed
          if (
            newFirstOption === newSecondOption &&
            newFirstOption !== formName
          ) {
            alert(
              "You cannot select the same question for rule configuration."
            );
            return {
              ...section,
              firstOption: "",
              firstSelectedOption: "",
              firstOptionUniqueId: "",
              secondOption: "",
              secondSelectedOption: "",
              secondOptionUniqueId: "",
              secondSelectedOptions: [],
              options: [],
            };
          }

          if (isSecondDropdown) {
            // Disable logic for secondOption
            if (isScoring && isAfterFirstRule) {
              newDisabledOptions.second.add(selectedQuestionIndex);
              newDisabledOptions.first.delete(selectedQuestionIndex);
              newDisabledOptions.second.delete(firstSelectedOptionIndex);
              setDisabledOptions(newDisabledOptions);
            }

            return {
              ...section,
              secondOption: newSecondOption,
              secondSelectedOption: selectedQuestionIndex,
              secondOptionUniqueId: newSecondId,
              secondSelectedOptions: [
                ...(selectedQuestion.questionOptions || []),
              ],
              thenAction:
                section.thenAction === "Set Answer"
                  ? "Set Value"
                  : section.thenAction,
            };
          } else {
            // Disable logic for firstOption
            if (isScoring && isAfterFirstRule) {
              newDisabledOptions.first.add(selectedQuestionIndex);
              newDisabledOptions.second.delete(selectedQuestionIndex);
              newDisabledOptions.first.delete(secondSelectedOptionIndex);
              setDisabledOptions(newDisabledOptions);
            }

            return {
              ...section,
              firstOption: newFirstOption,
              firstSelectedOption: selectedQuestionIndex,
              firstOptionUniqueId: newFirstId,
              dropdownEnabled: true,
              options: selectedQuestion.questionOptions || [],
              secondOption: "",
              secondSelectedOption: "",
              secondOptionUniqueId: "",
              secondSelectedOptions: [],
              thenAction: section.thenAction,
            };
          }
        });

      if (ruleType === "visibility") {
        setVisibilityRules((prev) => updateRules(prev));
      } else if (ruleType === "scoring") {
        setScoringRules((prev) => updateRules(prev));
      }

      saveDisabledOptions(disabledOptions);
    } catch (error) {
      console.error("Error selecting question:", error);
    }
  };

  const handleThenActionChange = (event, sectionId) => {
    const { value } = event.target;
    try {
      if (ruleType === "visibility") {
        setVisibilityRules((prevRules) =>
          prevRules.map((rule) =>
            rule.id === sectionId
              ? {
                  ...rule,
                  thenAction: value,
                  setvalue: value === "Set Answer" ? "" : rule.setvalue,
                }
              : rule
          )
        );
      } else if (ruleType === "scoring") {
        setScoringRules((prevRules) =>
          prevRules.map((section) => {
            if (section.id === sectionId) {
              // Make sure to update secondSelectedOptions based on the thenAction change
              const updatedSection = {
                ...section,
                thenAction: value,
                // setvalue: "",
                // setvalue: section.thenAction === "Set Answer" && value !== "Set Answer" ? "" : section.setvalue,
                setvalue:
                  section.thenAction === "Set Answer" && value !== "Set Answer"
                    ? ""
                    : section.setvalue,
                selectedAnswerOption:
                  value === "Set Answer"
                    ? section.selectedAnswerOption || ""
                    : "",
                secondSelectedOptions:
                  value === "Set Answer"
                    ? [...(section.secondSelectedOptions || [])] // Ensure a new array is created for "Set Answer"
                    : section.secondSelectedOptions &&
                      section.secondSelectedOptions.length > 0
                    ? section.secondSelectedOptions
                    : [],
              };

              return updatedSection;
            }
            return section;
          })
        );
      }
    } catch (error) {
      console.error("Error changing the Action:", error);
    }
  };

  // const handleComparisonChange = (event, sectionId) => {
  //   try {
  //     const { value } = event.target;
  //     if (ruleType === "visibility") {
  //       setVisibilityRules((prevRules) =>
  //         prevRules.map((section) =>
  //           section.id === sectionId
  //             ? {
  //                 ...section,
  //                 comparison: value,
  //                 checkedOptions:
  //                   value !== "is-either"
  //                     ? ""
  //                     : Array.isArray(section.checkedOptions)
  //                     ? section.checkedOptions
  //                     : "", // Ensure it's an array
  //               }
  //             : section
  //         )
  //       );
  //     } else if (ruleType === "scoring") {
  //       setScoringRules((prevRules) =>
  //         prevRules.map((section) =>
  //           section.id === sectionId
  //             ? {
  //                 ...section,
  //                 comparison: value,
  //                 checkedOptions:
  //                   value !== "is-either"
  //                     ? ""
  //                     : Array.isArray(section.checkedOptions)
  //                     ? section.checkedOptions
  //                     : "", // Ensure it's an array
  //               }
  //             : section
  //         )
  //       );
  //     }
  //   } catch (error) {
  //     console.error("Error changing comparison type:", error);
  //   }
  // };
  
const handleComparisonChange = (event, sectionId) => {
  try {
    const { value } = event.target;

    const updateComparison = (prevRules) =>
      prevRules.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              comparison: value || "equals",  
              checkedOptions:
                value === "is-either"
                  ? Array.isArray(section.checkedOptions)
                    ? section.checkedOptions
                    : []
                  : [], 
            }
          : section
      );

    if (ruleType === "visibility") {
      setVisibilityRules(updateComparison);
    } else if (ruleType === "scoring") {
      setScoringRules(updateComparison);
    }
  } catch (error) {
    console.error("Error changing comparison type:", error);
  }
};

  const handleOptionChange = (event, sectionId) => {
    try {
      const { value } = event.target;
      if (ruleType === "visibility") {
        setVisibilityRules((prevRules) =>
          prevRules.map((section) =>
            section.id === sectionId
              ? { ...section, selectedOptionValue: value || [] }
              : section
          )
        );
      } else if (ruleType === "scoring") {
        setScoringRules((prevRules) =>
          prevRules.map((section) =>
            section.id === sectionId
              ? { ...section, selectedOptionValue: value || [] }
              : section
          )
        );
      }
    } catch (error) {
      console.error("Error changing action type:", error);
    }
  };

  const handleCheckboxChange = (option, sectionId) => {
    try {
      if (ruleType === "visibility") {
        setVisibilityRules((prevRules) =>
          prevRules.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  checkedOptions: section.checkedOptions.includes(option)
                    ? section.checkedOptions.filter((opt) => opt !== option)
                    : [...section.checkedOptions, option],
                }
              : section
          )
        );
      } else if (ruleType === "scoring") {
        setScoringRules((prevRules) =>
          prevRules.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  checkedOptions: section.checkedOptions.includes(option)
                    ? section.checkedOptions.filter((opt) => opt !== option)
                    : [...section.checkedOptions, option],
                }
              : section
          )
        );
      }
    } catch (error) {
      console.error("Error changing checked options:", error);
    }
  };

  const handleRuleTypeChange = (event) => {
    try {
      const selectedRuleType = event.target.value;
      setRuleType(selectedRuleType);

      if (selectedRuleType === "visibility") {
        // Default action for visibility rules is "enable"
        setVisibilityRules((prevRules) =>
          prevRules.map((rule) => ({
            ...rule,
            thenAction: rule.thenAction || "enable",
          }))
        );
      } else if (selectedRuleType === "scoring") {
        // Default action for scoring rules is "Set Value"
        setScoringRules((prevRules) =>
          prevRules.map((rule) => ({
            ...rule,
            thenAction: rule.thenAction || "Set Value", // Ensure "Set Value" is set as default if not already
          }))
        );
      }
    } catch (error) {
      console.error("Error Changing rule:", error);
    }
  };

  const handleSetValueChange = (event, sectionId) => {
    try {
      const { value } = event.target;
      if (ruleType === "visibility") {
        setVisibilityRules((prevRules) =>
          prevRules.map((section) =>
            section.id === sectionId ? { ...section, setvalue: value } : section
          )
        );
      } else if (ruleType === "scoring") {
        setScoringRules((prevRules) =>
          prevRules.map((section) => {
            if (section.id === sectionId) {
              if (section.thenAction === "Set Answer") {
                const updatedOptions = section.secondSelectedOptions.length
                  ? section.secondSelectedOptions
                  : [];
                return {
                  ...section,
                  selectedAnswerOption: value,
                  setvalue:
                    section.thenAction === "Set Answer" &&
                    value !== "Set Answer"
                      ? ""
                      : section.setvalue,
                  secondSelectedOptions: updatedOptions,
                };
              } else {
                return {
                  ...section,
                  setvalue: value,
                  selectedAnswerOption: "",
                };
              }
            }
            return section;
          })
        );
      }
    } catch (error) {
      console.error("Error changing set value:", error);
    }
  };

  return (
    <div className="form-rule">
      <div className="rule-type-selection">
        <label>
          <input
            type="radio"
            name="ruleType"
            value="visibility"
            checked={ruleType === "visibility"}
            onChange={handleRuleTypeChange}
          />
          Visibility Rules
        </label>
        <label>
          <input
            type="radio"
            name="ruleType"
            value="scoring"
            checked={ruleType === "scoring"}
            onChange={handleRuleTypeChange}
          />
          Scoring Rules
        </label>
        {ruleType && (
          <div className="button-form-rule">
            <button
              type="button"
              className="add-button"
              onClick={() => handleAddRule()}
            >
              <i className="fas fa-plus"></i>
              Add
            </button>
          </div>
        )}
      </div>
      {/* Conditional rendering based on selected rule type */}
      {ruleType === "visibility" &&
        visibilityRules.map((section) => (
          <div key={section.id} className="form-content">
            <button
              type="button"
              className="remove-button"
              onClick={() => handleRemoveRule(section.id)}
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="form-row">
              <label className="then-label">If</label>
              <div className="collapsible-box">
                <FormRuleTreeScore
                  formName={formName}
                  sections={sections}
                  onQuestionSelect={(question) => {
                    try {
                      handleQuestionSelect(question, section.id, false);
                    } catch (error) {
                      console.error("Error selecting question:", error);
                    }
                  }}
                  selectedOption={section.firstOption}
                  // setSelectedOption={(value) => setVisibilityRules(prev => prev.map(s => s.id === section.id ? { ...s, firstSelectedOption: value } : s))}
                  setSelectedOption={(value) => {
                    try {
                      setVisibilityRules((prev) =>
                        prev.map((s) =>
                          s.id === section.id ? { ...s, firstOption: value } : s
                        )
                      );
                    } catch (error) {
                      console.error("Error setting selected option:", error);
                    }
                  }}
                  disableFormName={true}
                  disableSectionsAndSubsections={true}
                  disableShortAnswerAndParagraph={true}
                  disableDropdownCheckBox={true}
                />
              </div>
              <div className="dropdown-container">
                <select
                  value={section.comparison}
                  onChange={(e) => handleComparisonChange(e, section.id)}
                  disabled={!section.options?.length}
                >
                  <option value="equals">Equals</option>
                  <option value="not-equals">Not Equals</option>
                  <option value="is-either">Is Either</option>
                </select>
              </div>
              <div className="question-options-dropdown">
                {section.comparison === "is-either" ? (
                  <div className="custom-dropdown">
                    <button className="dropdown-toggle">Select Options</button>
                    <div className="dropdown-menu">
                      {section.options.map((option, index) => (
                        <div key={index} className="checkbox-option">
                          <input
                            type="checkbox"
                            id={`option-${index}-${section.id}`}
                            // checked={section.checkedOptions.includes(option)}
                            checked={
                              section.checkedOptions &&
                              section.checkedOptions.includes(option)
                            }
                            onChange={() =>
                              handleCheckboxChange(option, section.id)
                            }
                          />
                          <label htmlFor={`option-${index}`}>{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <select
                    value={section.selectedOptionValue}
                    onChange={(e) => handleOptionChange(e, section.id)}
                    disabled={!section.dropdownEnabled}
                  >
                    <option value="">Select an option</option>
                    {section.options?.map((option, index) => (
                      <option key={`${section.id}-${index}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            {/* New Row for "Then" Dropdown */}
            <div className="form-row">
              <label className="then-label">Then</label>
              <div className="then-dropdown">
                <select
                  value={section.thenAction}
                  onChange={(e) => handleThenActionChange(e, section.id)}
                  // disabled={!section.secondSelectedOption}
                >
                  <option value="">Select An Option</option>
                  <option value="enable">Enable</option>
                  <option value="disable">Disable</option>
                  <option value="hide">Hide</option>
                  <option value="show">Show</option>
                </select>
              </div>
              <div className="collapsible-box">
                <FormRuleTreeScore
                  formName={formName}
                  sections={sections}
                  onQuestionSelect={(question) =>
                    handleQuestionSelect(question, section.id, true)
                  }
                  selectedOption={section.secondOption}
                  setSelectedOption={(value) =>
                    setVisibilityRules((prev) =>
                      prev.map((s) =>
                        s.id === section.id
                          ? {
                              ...s,
                              secondOption: value,
                              thenAction: s.thenAction || "",
                            }
                          : s
                      )
                    )
                  }
                  disableFormName={true}
                  disableSectionsAndSubsections={false}
                />
              </div>
            </div>
          </div>
        ))}
      {ruleType === "scoring" &&
        scoringRules.map((section) => (
          <div key={section.id} className="scoring-rules-content">
            <div className="form-content-scoring">
              <button
                type="button"
                className="remove-button"
                onClick={() => handleRemoveRule(section.id)}
              >
                <i className="fas fa-times"></i>
              </button>
              <div className="form-row-scoring">
                <label
                  className="then-labe-scoringl"
                  style={{ fontWeight: 600 }}
                >
                  If
                </label>
                <div className="collapsible-box-scoring">
                  <FormRuleTreeScore
                    formName={formName}
                    sections={sections}
                    onQuestionSelect={(question) =>
                      handleQuestionSelect(question, section.id, false)
                    }
                    selectedOption={section.firstOption}
                    setSelectedOption={(value) =>
                      setScoringRules((prev) =>
                        prev.map((s) =>
                          s.id === section.id ? { ...s, firstOption: value } : s
                        )
                      )
                    }
                    disableFormName={true}
                    disableSectionsAndSubsections={true}
                    disableShortAnswerAndParagraph={true}
                    disableDropdownCheckBox={true}
                    disableOptions={(option) => {
                      const formattedOption = convertPathToIndexFormat(
                        option,
                        sections
                      );
                      return disabledOptions.second.has(formattedOption);
                    }}
                    // disableOptions={(option) => disabledOptions.second.has(convertPathToIndexFormat(option, sections))}
                  />
                </div>
                <div className="dropdown-container-scoring">
                  <select
                    value={section.comparison}
                    onChange={(e) => handleComparisonChange(e, section.id)}
                    disabled={!section.options.length}
                  >
                    <option value="equals">Equals</option>
                    <option value="not-equals">Not Equals</option>
                    <option value="is-either">Is Either</option>
                  </select>
                </div>
                <div className="question-options-dropdown-scoring">
                  {section.comparison === "is-either" ? (
                    <div className="custom-dropdown-scoring">
                      <button className="dropdown-toggle-scoring">
                        Select Options
                      </button>
                      <div className="dropdown-menu-scoring">
                        {section.options.map((option, index) => (
                          <div key={index} className="checkbox-option-scoring">
                            <input
                              type="checkbox"
                              id={`option-${index}-${section.id}`}
                              // checked={section.checkedOptions.includes(option)}
                              checked={
                                section.checkedOptions &&
                                section.checkedOptions.includes(option)
                              }
                              onChange={() =>
                                handleCheckboxChange(option, section.id)
                              }
                            />
                            <label htmlFor={`option-${index}-${section.id}`}>
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <select
                      value={section.selectedOptionValue}
                      onChange={(e) => handleOptionChange(e, section.id)}
                      disabled={!section.dropdownEnabled}
                    >
                      <option value="">Select an option</option>
                      {section.options.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="form-row-scoring">
                <label className="then-label-scoring">Then</label>
                <div className="then-dropdown-scoring">
                  <select
                    value={section.thenAction}
                    onChange={(e) => handleThenActionChange(e, section.id)}
                  >
                    <option value="">Select An Option</option>
                    <option value="Set Value">Set value</option>
                    <option value="Increase Score">Increase Score</option>
                    <option value="Decrease Score">Decrease Score</option>
                    <option value="Set Answer">Set Answer</option>
                  </select>
                </div>
                <div className="collapsible-box-scoring">
                  <FormRuleTreeScore
                    formName={formName}
                    sections={sections}
                    onQuestionSelect={(question) =>
                      handleQuestionSelect(question, section.id, true)
                    }
                    selectedOption={section.secondOption}
                    setSelectedOption={(value) =>
                      setScoringRules((prev) =>
                        prev.map((s) =>
                          s.id === section.id
                            ? { ...s, secondOption: value }
                            : s
                        )
                      )
                    }
                    disableShortAnswerAndParagraph={true}
                    disableDropdownCheckBox={true}
                    disableOptions={(option) =>
                      disabledOptions.first.has(
                        convertPathToIndexFormat(option, sections)
                      )
                    }
                    // disableFormName = {section.thenAction === "Set Answer"}
                    // disableSectionsAndSubsections={section.thenAction === "Set Answer"}
                  />
                </div>
                <div className="form-row-scoring">
                  <label
                    className={
                      section.thenAction === "Increase Score" ||
                      section.thenAction === "Decrease Score"
                        ? "by-label"
                        : "to-label"
                    }
                  >
                    {section.thenAction === "Increase Score" ||
                    section.thenAction === "Decrease Score"
                      ? "By"
                      : "To"}
                  </label>
                  {section.thenAction === "Set Answer" ? (
                    <select
                      className="then-value-input-scoring"
                      value={section.selectedAnswerOption || ""}
                      onChange={(e) => handleSetValueChange(e, section.id)}
                      disabled={
                        !section.secondSelectedOptions ||
                        section.secondSelectedOptions.length === 0
                      }
                    >
                      <option value="">Select an option</option>
                      {section.secondSelectedOptions &&
                      section.secondSelectedOptions.length > 0 ? (
                        section.secondSelectedOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))
                      ) : (
                        <option value="">No options available</option>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="then-value-input-scoring"
                      placeholder={
                        section.thenAction === "Set Answer"
                          ? "Select an answer"
                          : "Enter a score"
                      }
                      value={section.setvalue || ""}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (!isNaN(inputValue) && Number(inputValue) >= 0) {
                          handleSetValueChange(e, section.id);
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default withAuth(FormRule);
