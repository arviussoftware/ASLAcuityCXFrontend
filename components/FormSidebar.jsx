import React, { useState, useEffect } from "react";
import FormRule from "./FormRule";
import Tree from "./FormStructure";
import "./Styles/Formrule.css";
import "./Styles/media_query_form_builder.css";
import withAuth from "@/components/withAuth";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

const encryptData = (data) => {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error("Error encrypting data:", error);
    return null;
  }
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

const FormSidebar = ({
  sections,
  formName,
  formDescription,
  formId,
  visibilityRules: initialVisibilityRules,
  scoringRules: initialScoringRules,
  disabledOptions: initialdisabledOptions,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const [activeTab, setActiveTab] = useState("tree");
  const [visibilityRules, setVisibilityRules] = useState(initialVisibilityRules || []);
  const [scoringRules, setScoringRules] = useState(initialScoringRules || []);
  const [selectedOption, setSelectedOption] = useState("");
  // const [disabledOptions, setDisabledOptions] = useState(initialdisabledOptions || { first: new Set(), second: new Set() });

  const [disabledOptions, setDisabledOptions] = useState(() => ({
    first: new Set(initialdisabledOptions?.first || []),
    second: new Set(initialdisabledOptions?.second || [])
  }));
  const [prevQuestions, setPrevQuestions] = useState(getAllQuestions(sections));
  const [prevSections, setPrevSections] = useState(sections); // Store previous sections
  const [isCanceled, setIsCanceled] = useState(false);

  function getAllQuestions(sections) {
    return sections.flatMap(
      (section, sectionIndex) =>
        section.subsections?.flatMap((subsection, subsectionIndex) =>
          subsection.questions?.map((q, questionIndex) => ({
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
      .map((q) => q.unique_id); // Return only the changed question IDs
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
          const latestFirst = findIndexByUniqueId(rule.firstOptionUniqueId, sections);
          if (latestFirst) updatedRule.firstOption = latestFirst;
        }

        if (rule.secondOptionUniqueId) {
          const latestSecond = findIndexByUniqueId(rule.secondOptionUniqueId, sections);
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
                question.options = JSON.parse(prevQuestion.options)
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
      handleRulesUpdate(filteredVisibilityRules, filteredScoringRules);
      // Update previous questions and sections immediately after processing
      setPrevQuestions(newQuestions);
      setPrevSections(sections);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, isCanceled]);

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
          if (!section.firstOption && !section.secondOption && !section.selectedOptionValue) {
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

          if (firstOptionIndex || secondOptionIndex === formName || secondOptionIndex) {
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
                  : ["Increase Score", "Decrease Score", "Set Answer"].includes(section.thenAction)
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


  // Auto-Save Logic: Save rules whenever they change
  const saveRules = (visibilityRulesToSave, scoringRulesToSave) => {
    try {
      const resolveIndexFromId = (index) => {
        if (!isIndexFormat(index)) return index;
        const [sIdx, ssIdx, qIdx] = index.split("-").map(Number);
        const oldQuestion = sections?.[sIdx]?.subsections?.[ssIdx]?.questions?.[qIdx];
        if (!oldQuestion?.id) return index;

        for (let i = 0; i < sections.length; i++) {
          for (let j = 0; j < sections[i]?.subsections?.length; j++) {
            for (let k = 0; k < sections[i].subsections[j]?.questions?.length; k++) {
              if (sections[i].subsections[j].questions[k].id === oldQuestion.id) {
                return `${i}-${j}-${k}`;
              }
            }
          }
        }
        return index;
      };

      const updatedVisibilityRules = visibilityRulesToSave.map((rule) => ({
        ...rule,
        firstOption: resolveIndexFromId(rule.firstOption),
        secondOption: resolveIndexFromId(rule.secondOption),
      }));

      const updatedScoringRules = scoringRulesToSave.map((rule) => ({
        ...rule,
        firstOption: resolveIndexFromId(rule.firstOption),
        secondOption: resolveIndexFromId(rule.secondOption),
      }));

      const validVisibilityRules = validateRule(updatedVisibilityRules);
      const validScoringRules = validateRule(updatedScoringRules);

      const encryptedVisibilityRules = encryptData(validVisibilityRules);
      const encryptedScoringRules = encryptData(validScoringRules);

      const visibilityRulesHash = CryptoJS.SHA256(encryptedVisibilityRules).toString();
      const scoringRulesHash = CryptoJS.SHA256(encryptedScoringRules).toString();

      sessionStorage.setItem("visibilityRules", encryptedVisibilityRules);
      sessionStorage.setItem("visibilityRulesHash", visibilityRulesHash);
      sessionStorage.setItem("scoringRules", encryptedScoringRules);
      sessionStorage.setItem("scoringRulesHash", scoringRulesHash);
    } catch (error) {
      console.error("Error saving rules:", error);
    }
  };

  const saveDisabledOptions = (disabledOptionsToSave = { first: [], second: [] }) => {
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
  useEffect(() => {
    if (visibilityRules.length > 0 || scoringRules.length > 0) {
      saveRules(visibilityRules, scoringRules);
      saveDisabledOptions(disabledOptions);
    }
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibilityRules, scoringRules, disabledOptions]);

  // Handle tab switching
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Toggle sidebar collapse state
  const toggleSidebar = () => {
    onToggleSidebar && onToggleSidebar();
  };

  // Handle rule addition
  const handleRulesUpdate = (newVisibilityRules, newScoringRules, newDisabledOptions) => {
    if (newVisibilityRules) {
      setVisibilityRules(newVisibilityRules);
      saveRules(newVisibilityRules, scoringRules);
    }

    if (newScoringRules) {
      setScoringRules(newScoringRules);
      saveRules(visibilityRules, newScoringRules);
      setDisabledOptions(newDisabledOptions); // Assuming you have a state for disabledOptions
      saveDisabledOptions(newDisabledOptions); // Call your saveDisabledOptions function
    }

  };
  // Sync rules on switching to the "rules" tab
  useEffect(() => {
    if (activeTab === "rules") {
      try {
        setVisibilityRules(decryptData(sessionStorage.getItem("visibilityRules")) || []);
        setScoringRules(decryptData(sessionStorage.getItem("scoringRules")) || []);
        setDisabledOptions({
          first: new Set(decryptData(sessionStorage.getItem("disabledOptions"))?.first || []),
          second: new Set(decryptData(sessionStorage.getItem("disabledOptions"))?.second || []),
        });
      } catch (error) {
        console.error("Error loading rules:", error);
        setVisibilityRules([]);
        setScoringRules([]);
        setDisabledOptions({ first: new Set(), second: new Set() });
      }
    }
  }, [activeTab]);


  return (
      <div className={`form-sidebar-container ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className={`form-sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <nav className="navbar">
            <button
              className={`nav-button ${activeTab === "tree" ? "active" : ""}`}
              onClick={() => handleTabChange("tree")}
            >
              Form Structure
            </button>
            <button
              className={`nav-button ${activeTab === "rules" ? "active" : ""}`}
              onClick={() => handleTabChange("rules")}
            >
              Rules
            </button>
          </nav>

          {activeTab === "tree" && (
            <Tree
              formName={formName}
              sections={sections}
              onQuestionSelect={(selectedItem) => console.log("Selected Item:", selectedItem)}
              selectedOption={selectedOption}
              setSelectedOption={setSelectedOption}
              showHeaderFooter={false}
            />
          )}

          {activeTab === "rules" && (
            <FormRule
              formId={formId}
              formName={formName}
              formDescription={formDescription}
              sections={sections}
              visibilityRules={visibilityRules}
              scoringRules={scoringRules}
              onRulesUpdate={handleRulesUpdate}
              disabledOptions={disabledOptions}
            />
          )}
        </div>
      </div>
     
  );
};

export default withAuth(FormSidebar);
