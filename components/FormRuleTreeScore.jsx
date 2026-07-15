import React, { useEffect, useMemo, useState } from "react";
import "./Styles/Formrule.css";
import "./Styles/media_query_form_builder.css";
import withAuth from "@/components/withAuth";

// Function to convert the index format (0-0-0) into a readable path
const convertIndexToPathFormat = (indexFormat, sections, formName) => {
  const indices = indexFormat.split("-").map(Number);
  let currentLevel = sections;
  let path = [formName];

  indices.forEach((index, i) => {
    if (i === 0) {
      path.push(currentLevel[index].sectionDetails || `Section ${index + 1}`);
      currentLevel = currentLevel[index];
    } else if (i === 1) {
      path.push(currentLevel.subsections[index].subsectionDetails || `Subsection ${index + 1}`);
      currentLevel = currentLevel.subsections[index];
    } else if (i === 2) {
      // path.push(currentLevel.questions[index].question || `Question ${index + 1}`);
      if(!currentLevel.questions || !currentLevel.questions[index]) return;
      path.push(currentLevel.questions[index].question || `Question ${index + 1}`);
    } else {
      return null;
    }
  });
  return path.join(" > ");
};


 

const renderTreeOptions = (sections, formName, path = [], level = 0, disableFormName = false, disableSectionsAndSubsections = false, disableShortAnswerAndParagraph = false, disableDropdownCheckBox = false) => {
  const options = [];
  try {
    const traverseTree = (nodes, currentPath = [], currentLevel = 0) => {
      nodes.forEach((node, sIndex) => {
        const sectionName = node.sectionDetails;
        const isSectionDisabled = !sectionName || sectionName.trim() === "";
        const updatedPath = [...currentPath, sectionName];
        const indent = '\u00A0'.repeat(currentLevel * 2);

        options.push({
          label: `${indent}${sectionName}`,
          value: `${updatedPath.join(' > ')}`,
          disabled: isSectionDisabled || disableSectionsAndSubsections,
        });

        if (node.questions && node.questions.length > 0) {
          node.questions.forEach((question, qIndex) => {
            const isQuestionDisabled =
              disableShortAnswerAndParagraph &&
              (question.type === "shortAnswer" || question.type === "paragraph" || question.questionOptionType === "checkboxes" || question.questionOptionType === "dropdown");
            options.push({
              label: `${indent}\u00A0\u00A0${question.question}`,
              value: `${updatedPath.join(' > ')} > ${question.question}`,
              questionOptions: question.options || [],
              disabled: isQuestionDisabled,
            });
          });
        }

        if (node.subsections && node.subsections.length > 0) {
          node.subsections.forEach((subsection, subIndex) => {
            const subsectionName = subsection.subsectionDetails;
            const updatedSubPath = [...updatedPath, subsectionName];
            const subIndent = '\u00A0'.repeat((currentLevel + 1) * 3);
            options.push({
              label: `${subIndent}${subsectionName}`,
              value: `${updatedSubPath.join(' > ')}`,
              disabled: !subsectionName || subsectionName.trim() === "" || disableSectionsAndSubsections,
            });

            if (subsection.questions && subsection.questions.length > 0) {
              subsection.questions.forEach((subQuestion, subQIndex) => {
                const isSubDropdownCheckBox = disableDropdownCheckBox && (subQuestion.questionOptionType === "checkboxes" || subQuestion.questionOptionType === "dropdown");
                const isSubQuestionDisabled =
                  disableShortAnswerAndParagraph &&
                  (subQuestion.type === "shortAnswer" || subQuestion.type === "paragraph");
                options.push({
                  label: `${subIndent}\u00A0\u00A0${subQuestion.question}`,
                  value: `${updatedSubPath.join(' > ')} > ${subQuestion.question}`,
                  questionOptions: subQuestion.options || [],
                  id: subQuestion.id,
                  disabled: isSubQuestionDisabled || isSubDropdownCheckBox,
                });
              });
            }

            if (subsection.subsections && subsection.subsections.length > 0) {
              traverseTree(subsection.subsections, updatedSubPath, currentLevel + 2);
            }
          });
        }
      });
    };

    options.push({
      label: `${formName}`,
      value: `${formName}`,
      disabled: disableFormName,
    });

    traverseTree(sections, [formName], level + 1);
  } catch (error) {
    console.error("Error rendering tree options:", error);
  }
  return options;
};

const FormRuleTreeScore = ({ formName, sections, onQuestionSelect, selectedOption, setSelectedOption, disableFormName = false, disableSectionsAndSubsections = false, disableShortAnswerAndParagraph = false, disableDropdownCheckBox = false,disableOptions }) => {
  
  const [currentSelectedOption, setCurrentSelectedOption] = useState(selectedOption);
  const [currentOptions, setCurrentOptions] = useState([]);
  const treeOptions = React.useMemo(() => {
    try {
      const options = renderTreeOptions(sections, formName, [], 0, disableFormName, disableSectionsAndSubsections, disableShortAnswerAndParagraph, disableDropdownCheckBox);
      setCurrentOptions(options);  // Set the options dynamically
      return options;
    } catch (error) {
      console.error("Error generating tree options:", error);
      return [];
    }
  }, [sections, formName, disableFormName, disableSectionsAndSubsections, disableShortAnswerAndParagraph, disableDropdownCheckBox]);

  useEffect(() => {
    if (selectedOption !== currentSelectedOption) {
      setCurrentSelectedOption(selectedOption);
    }
  }, [selectedOption, currentSelectedOption]);

  const handleChange = (event) => {
    try {
      const selectedValue = event.target.value;
      const selectedItem = treeOptions.find(option => option.value === selectedValue);
      setCurrentSelectedOption(selectedValue);
      setSelectedOption(selectedValue);
      if (selectedItem) {
        onQuestionSelect(selectedItem);
      } else {
        console.error("Selected item not found");
      }
    } catch (error) {
      console.error("Error handling dropdown change:", error);
    }
  };

  const isIndexFormat = (value) => /^(\d+)(-\d+)?(-\d+)?$/.test(value);
  1
  const convertedPath = isIndexFormat(currentSelectedOption)
    ? convertIndexToPathFormat(currentSelectedOption, sections, formName)
    : currentSelectedOption;

  const lastPart = convertedPath ? convertedPath.split(' > ').pop() : '';

  return (<select className="form-rule-tree-dropdown" value={selectedOption || ''} onChange={handleChange}>
    <option value="">
      {isIndexFormat(selectedOption) ? lastPart : 'Select an item'}
    </option>
    {treeOptions.map((option, index) => {
      // 🔹 Ensure `disableOptions` is used
      const isDisabled = option.disabled || (disableOptions && disableOptions(option.value));
      const isRedDisabled = 
        isDisabled && 
        (disableFormName ||
          disableSectionsAndSubsections ||
          disableShortAnswerAndParagraph ||
          disableDropdownCheckBox
        );
      return (
        <option
          key={index}
          value={option.value}
          disabled={isDisabled}
          style={{ color: isRedDisabled ? "#e01313cf" : "black" }}
        >
          {option.label}
        </option>
      );
    })}
  </select>
  );
};

export default withAuth(FormRuleTreeScore);
