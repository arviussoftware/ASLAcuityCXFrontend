import React, { useState, useEffect } from "react";
import "./Styles/form_builder_2.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import withAuth from "@/components/withAuth";
import { PiNotebookBold } from "react-icons/pi";
import { Trash2, Copy } from "lucide-react";
import dynamic from "next/dynamic";
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css"; // Import styles

const SubSection = ({
  isSubSectionCollapsed,
  sectionIndex,
  subsectionIndex,
  subSection,
  onDeleteSubsection,
  onSubsectionDetailsChange,
  onSubsectionDescriptionChange,
  onAddSubsectionQuestion,
  onAddAfterSubQuestionWrapper,
  onSubQuestionChange,
  onDeleteSubQuestion,
  onAddSubOption,
  onSubAnswerChange,
  onSubRequiredChange,
  onSubTypeChange,
  onSubOptionChange,
  onSubScoreableChange,
  onSubScoreChange,
  onHandleDuplicate,
  onHandleSubQuestionInstruction,
  onHideSubsectionScore,
  onHideSubQuestionScore,
  onhandleHiddenSubquestionChange,
  onEnableSubQuestionComment,
  onSubDefaultSelectionChange,
  onSubRadioChange,
  onhandleEnableSubSectionComment,
  toggleSubsectionCollapse,
  onHandleSubOptionDelete,
  onSubsectionScoringMethodChange,
  onsetSubSectionBasePercentage,
  onHandleDuplicateSubSection,
  sectionRefs,
  focusData, // Focus data passed from parent
  focusElement,
}) => {
  useEffect(() => {
    // Check if we need to focus on this question
    if (
      focusData.sectionIndex === sectionIndex &&
      focusData.subsectionIndex !== null &&
      focusData.questionIndex !== null
    ) {
      const { subsectionIndex, questionIndex } = focusData;
      const questionId = `question-${sectionIndex}-${subsectionIndex}-${questionIndex}`; // Construct the ID

      const questionElement = document.getElementById(questionId); // Get the question element by ID

      if (questionElement) {
        questionElement.focus(); // Focus on the question
        questionElement.scrollIntoView({ behavior: "smooth" }); // Optional: scroll to the question
      }
    }
  }, [focusData, sectionIndex]);

  const handleAddOption = (questionIndex) => {
    onAddSubOption(sectionIndex, subsectionIndex, questionIndex); // Pass the indices to the function
  };

  const [collapsedSubQuestion, setCollapsedSubQuestion] = useState({});

  const toggleSubQuestionCollapse = (sIndex, subIndex, qIndex) => {
    setCollapsedSubQuestion((prevState) => ({
      ...prevState,
      [`${sIndex}-${subIndex}-${qIndex}`]:
        !prevState[`${sIndex}-${subIndex}-${qIndex}`],
    }));
  };
  const [sections, setSections] = useState("");
  const [hoverRating, setHoverRating] = useState("0");

  const emojiMap = {
    "\u{1F44D}": "Yes",
    "\u{1F44E}": "No",
    "\u{1F6AB}": "N/A",
  };

  const emojiMap1 = {
    "\u{1F60D}": "Excellent",
    "\u{1F60A}": "Good",
    "\u{1F610}": "Average",
    "\u{1F61F}": "Fair",
    "\u{1F621}": "Poor",
    "\u{1F6AB}": "N/A",
  };

  const starTextMapping = {
    0: "N/A",
    1: "Poor",
    2: "Fair",
    3: "Average",
    4: "Good",
    5: "Excellent",
  };

  const textToStarMapping = {
    "N/A": 0,
    Poor: 1,
    Fair: 2,
    Average: 3,
    Good: 4,
    Excellent: 5,
  };

  // ["\u{1F60D}", "\u{1F60A}", "\u{1F610}", "\u{1F61F}", "\u{1F621}", "\u{1F6AB}"];
  const reverseEmojiMap1 = Object.fromEntries(
    Object.entries(emojiMap1).map(([emoji, name]) => [name, emoji]),
  );

  const reverseEmojiMap = Object.fromEntries(
    Object.entries(emojiMap).map(([emoji, name]) => [name, emoji]),
  );

  return (
    <div
      className="sub-section-container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();

        const data = e.dataTransfer.getData("text/plain");
        if (!data) return;

        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          return;
        }

        if (parsed.type === "ADD_QUESTION") {
          onAddSubsectionQuestion(sectionIndex, subsectionIndex);
        }

        if (parsed.type === "ADD_QUESTION_AFTER") {
          onAddSubsectionQuestion(
            sectionIndex,
            subsectionIndex,
            subSection.questions.length - 1,
          );
        }

        if (parsed.type === "DUPLICATE_QUESTION") {
          onHandleDuplicate(
            parsed.sourceSectionIndex ?? parsed.sectionIndex,
            parsed.sourceSubsectionIndex ?? parsed.subsectionIndex,
            parsed.sourceQuestionIndex ?? parsed.questionIndex,
          );
        }

        if (parsed.type === "DUPLICATE_SUBCATEGORY") {
          onHandleDuplicateSubSection &&
            onHandleDuplicateSubSection(
              parsed.sectionIndex,
              parsed.subsectionIndex,
            );
        }
      }}
    >
      <div className="section-header">
        <h2 className="w-[700px] truncate overflow-hidden whitespace-nowrap">
          {subSection.subsectionDetails || "Sub-Category Details"}
        </h2>
        <div className="collapse-section-icons">
          <i
            type="button"
            onClick={() =>
              toggleSubsectionCollapse(sectionIndex, subsectionIndex)
            }
            className={
              isSubSectionCollapsed ? "fa fa-plus-circle" : "fa fa-minus-circle"
            }
          />
        </div>
      </div>
      {!isSubSectionCollapsed && (
        <div className="section-containers">
          <div className="subsection-content">
            <input
              type="text"
              autoFocus
              placeholder="Sub-Category Name"
              maxLength={150}
              value={subSection.subsectionDetails}
              onChange={(event) =>
                onSubsectionDetailsChange(sectionIndex, subsectionIndex, event)
              }
              id={`subsection-${sectionIndex}-${subsectionIndex}`}
              style={{ width: "100%" }}
            />
            <ReactQuill
              placeholder="Sub-Category Instructions"
              value={subSection.subsectionDescription}
              maxLength={250}
              onChange={(value) =>
                onSubsectionDescriptionChange(
                  sectionIndex,
                  subsectionIndex,
                  value, // Pass the value directly
                )
              }
              style={{
                width: "100%",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
              }}
              modules={{
                toolbar: [
                  ["bold", "italic", "underline"],
                  [{ list: "ordered" }, { list: "bullet" }],
                  // ["link", "image"], // Insert link and image
                  [{ align: [] }],
                  ["clean"], // Remove formatting
                ],
              }}
              formats={[
                "bold",
                "italic",
                "underline",
                "list",
                "bullet",
                "align",
              ]}
            />
            <div className="visibility-controls">
              <label className="toggle-switch">
                <span className="toggle-label">&nbsp; Hide Score</span>
                <input
                  type="checkbox"
                  checked={subSection.hideScore}
                  onChange={() =>
                    onHideSubsectionScore(sectionIndex, subsectionIndex)
                  }
                />
              </label>
              <label className="checkbox-label">
                <span className="toggle-label">&nbsp; Comment</span>
                <input
                  type="checkbox"
                  checked={subSection.enableComment}
                  onChange={() =>
                    onhandleEnableSubSectionComment(
                      sectionIndex,
                      subsectionIndex,
                    )
                  }
                />
              </label>
              <label className="toggle-switch">
                <span className="toggle-label">&nbsp; Scoring Method</span>
              </label>
              <div className="calculation-container">
                <div className="form-group">
                  <select
                    value={subSection.scoringMethod}
                    onChange={(event) =>
                      onSubsectionScoringMethodChange(
                        sectionIndex,
                        subsectionIndex,
                        event,
                      )
                    }
                    className="scoring-method-dropdown"
                  >
                    <option value="None">None</option>
                    <option value="Question Sum">Question Sum</option>
                    <option value="Question Average">Question Average</option>
                    <option value="Question Percentage">
                      Question Percentage
                    </option>
                  </select>

                  {subSection.scoringMethod === "Question Percentage" && (
                    <div className="form-group">
                      <label className="base-percent-label">
                        Base Percentage
                      </label>
                      <input
                        className="form-group"
                        value={subSection.basePercentage}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Regex to allow up to 5 digits before the decimal and 2 digits after
                          const validValue = /^\d{0,5}(\.\d{0,2})?$/.test(value)
                            ? value
                            : subSection.basePercentage;
                          // Set the valid value only if it matches the regex
                          if (validValue !== subSection.basePercentage) {
                            onsetSubSectionBasePercentage(
                              sectionIndex,
                              subsectionIndex,
                              e,
                              validValue,
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
          </div>
          <div className="fsubbuttons-containernew">
            <div className="fsubbuttons-container">
              <div className="add-question-top">
                <div className="tooltip-wrapper">
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({
                          type: "ADD_QUESTION",
                          sectionIndex,
                          subsectionIndex,
                        }),
                      );
                    }}
                  >
                    <span
                      className="addques-image cursor-pointer"
                      onClick={() =>
                        onAddSubsectionQuestion(sectionIndex, subsectionIndex)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "28px",
                        height: "28px",
                        fontSize: "13px",
                        fontWeight: "700",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      Q+
                    </span>
                  </span>

                  <span className="tooltip-scontainer-text">Add Question</span>
                </div>
              </div>

              <div className="tooltip-wrapper">
                <Trash2
                  className="deletesection-image"
                  size={20}
                  onClick={() =>
                    onDeleteSubsection(sectionIndex, subsectionIndex)
                  }
                />
                <span className="tooltip-scontainer-text">
                  Delete Subcategory
                </span>
              </div>

              <div className="tooltip-wrapper">
                <span
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({
                        type: "DUPLICATE_SUBCATEGORY",
                        sectionIndex,
                        subsectionIndex,
                      }),
                    );
                  }}
                >
                  <Copy
                    className="duplicate-image"
                    size={20}
                    onClick={() =>
                      onHandleDuplicateSubSection &&
                      onHandleDuplicateSubSection(sectionIndex, subsectionIndex)
                    }
                  />
                </span>
                <span className="tooltip-scontainer-text">
                  Duplicate SubCategory
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isSubSectionCollapsed &&
        subSection.questions.map((question, qIndex) => {
          const isSubQuestionCollapsed =
            collapsedSubQuestion[
              `${sectionIndex}-${subsectionIndex}-${qIndex}`
            ];

          return (
            <div
              key={question.id}
              id={`question-${sectionIndex}-${subsectionIndex}-${qIndex}`}
              className="sub-question-container"
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();

                const data = e.dataTransfer.getData("text/plain");
                if (!data) return;

                let parsed;
                try {
                  parsed = JSON.parse(data);
                } catch {
                  return;
                }

                // ✅ ADD QUESTION AFTER — stop bubbling
                if (parsed.type === "ADD_QUESTION_AFTER") {
                  e.stopPropagation(); // ⭐ IMPORTANT
                  onAddSubsectionQuestion(
                    sectionIndex,
                    subsectionIndex,
                    qIndex,
                  );
                  return;
                }

                // ✅ DUPLICATE QUESTION — stop bubbling
                if (parsed.type === "DUPLICATE_QUESTION") {
                  e.stopPropagation();

                  // 🚨 IGNORE qIndex COMPLETELY
                  onHandleDuplicate(
                    parsed.sourceSectionIndex,
                    parsed.sourceSubsectionIndex,
                    parsed.sourceQuestionIndex,
                  );
                }
              }}
            >
              <div className="subQuestion-collapse-button">
                <i
                  type="button"
                  onClick={() =>
                    toggleSubQuestionCollapse(
                      sectionIndex,
                      subsectionIndex,
                      qIndex,
                    )
                  }
                  className={
                    isSubQuestionCollapsed
                      ? "fa fa-plus-circle"
                      : "fa fa-minus-circle"
                  }
                ></i>
              </div>
              <div className="question-content">
                <input
                  type="text"
                  autoFocus
                  placeholder="Question"
                  maxLength={150}
                  value={question.question}
                  onChange={(event) =>
                    onSubQuestionChange(
                      sectionIndex,
                      subsectionIndex,
                      qIndex,
                      event,
                    )
                  }
                />
              </div>

              {!isSubQuestionCollapsed && (
                <div>
                  <select
                    value={question.type}
                    onChange={(event) =>
                      onSubTypeChange(
                        sectionIndex,
                        subsectionIndex,
                        qIndex,
                        event,
                      )
                    }
                    className="select-dropdown"
                  >
                    <option value="shortAnswer">Single Line</option>
                    <option value="paragraph">Multi Line</option>
                    <option value="multipleChoice">Radio Button</option>
                    <option value="drpdwn">Dropdown</option>
                    <option value="selectMultipleChoice">Multi-Select</option>
                    {/* <option value="rating">Rating System</option> */}
                    <option value="fiveRankedList">Five Ranked List</option>
                    <option value="twoRankedList">Yes/No</option>
                  </select>
                  {question.type === "selectMultipleChoice" && (
                    <select
                      value={question.questionOptionType || ""}
                      onChange={(event) =>
                        onSubTypeChange(
                          sectionIndex,
                          subsectionIndex,
                          qIndex,
                          event,
                          true,
                        )
                      }
                      className="select-dropdown"
                    >
                      <option value="">Select an Item</option>
                      <option value="checkboxes">Checkbox List</option>
                      <option value="dropdown">Multi-Select List</option>
                    </select>
                  )}
                  {/* Short Question type */}
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
                  {/* Paragraph Question type */}
                  {question.type === "paragraph" && (
                    <div className="question-content">
                      <textarea
                        rows={4}
                        placeholder="Paragraph"
                        maxLength={250}
                        readOnly
                        value={question.answer}
                        onChange={(event) =>
                          onSubAnswerChange(
                            sectionIndex,
                            subsectionIndex,
                            qIndex,
                            event,
                          )
                        }
                      />
                    </div>
                  )}
                  {/* Radio button Question type */}
                  {(question.type === "multipleChoice" ||
                    (question.type === "selectMultipleChoice" &&
                      question.questionOptionType)) && (
                    <div>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="option-container">
                          {question.type === "multipleChoice" ? (
                            <input
                              type="radio"
                              name={`sub-question-${sectionIndex}-${subsectionIndex}-${qIndex}`}
                              value={option}
                            />
                          ) : question.type === "selectMultipleChoice" &&
                            question.questionOptionType === "checkboxes" ? (
                            <input
                              type="checkbox"
                              name={`sub-question-${sectionIndex}-${subsectionIndex}-${qIndex}`}
                              value={option}
                            />
                          ) : null}
                          {/* Render option text input */}
                          <input
                            type="text"
                            value={option}
                            maxLength={150}
                            onChange={(event) =>
                              onSubOptionChange(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
                                oIndex,
                                event,
                              )
                            }
                          />
                          {/* Conditionally render score input */}
                          {question.type === "multipleChoice" &&
                            question.scorable && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <label>
                                  Null
                                  <input
                                    type="checkbox"
                                    checked={question.scores[oIndex] === null}
                                    onChange={(event) => {
                                      question.scores[oIndex] = event.target
                                        .checked
                                        ? null
                                        : 0;
                                      setSections([...sections]);
                                    }}
                                  />
                                </label>
                                <label>
                                  Score
                                  <input
                                    className="score-option"
                                    type="number"
                                    placeholder="Score"
                                    value={
                                      question.scores[oIndex] !== null
                                        ? question.scores[oIndex]
                                        : ""
                                    }
                                    min="0"
                                    onChange={(event) => {
                                      let value = event.target.value;
                                      if (
                                        value === "" ||
                                        /^\d{0,5}(\.\d{0,2})?$/.test(value)
                                      ) {
                                        onSubScoreChange(
                                          sectionIndex,
                                          subsectionIndex,
                                          qIndex,
                                          oIndex,
                                          { target: { value } },
                                        );
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          {/* Delete option */}
                          <i
                            className="fa-solid fa-delete-left cross-image"
                            onClick={() =>
                              onHandleSubOptionDelete(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
                                oIndex,
                              )
                            }
                          ></i>
                        </div>
                      ))}
                      <div className="options">
                        <span
                          className="add-option-span"
                          onClick={() => handleAddOption(qIndex)}
                        >
                          Add Option
                        </span>
                        <label className="toggle-switch">
                          <span className="toggle-label">&nbsp; Scoreable</span>
                          <input
                            type="checkbox"
                            checked={question.scorable}
                            onChange={() =>
                              onSubScoreableChange(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
                              )
                            }
                            disabled={
                              question.type === "selectMultipleChoice" &&
                              (question.questionOptionType === "checkboxes" ||
                                question.questionOptionType === "dropdown")
                            }
                            style={{ display: "none" }}
                          />
                          <span
                            className={`toggle-slider ${
                              question.type === "selectMultipleChoice" &&
                              (question.questionOptionType === "checkboxes" ||
                                question.questionOptionType === "dropdown")
                                ? "disabled"
                                : ""
                            } ${question.scorable ? "checked" : ""}`}
                          ></span>
                        </label>
                      </div>
                    </div>
                  )}
                  {question.type === "drpdwn" && (
                    <div>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="option-container">
                          <input
                            type="text"
                            value={option}
                            maxLength={150}
                            onChange={(event) =>
                              onSubOptionChange(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
                                oIndex,
                                event,
                              )
                            }
                          />
                          {/* Conditionally render score input */}
                          {question.scorable && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {/* Null Score */}
                              <label>
                                Null
                                <input
                                  type="checkbox"
                                  checked={question.scores[oIndex] === null}
                                  onChange={(event) => {
                                    // Set score to null when checkbox is checked; otherwise, set it to 0.
                                    question.scores[oIndex] = event.target
                                      .checked
                                      ? null
                                      : 0;
                                    setSections([...sections]); // Trigger re-render
                                  }}
                                />
                              </label>
                              {/* Question Score*/}
                              <label>
                                Score
                                <input
                                  className="score"
                                  type="number"
                                  placeholder="Score"
                                  value={
                                    question.scores[oIndex] !== null
                                      ? question.scores[oIndex]
                                      : ""
                                  }
                                  onChange={(event) => {
                                    let value = event.target.value;

                                    if (
                                      value === "" ||
                                      /^\d{0,5}(\.\d{0,2})?$/.test(value)
                                    ) {
                                      onSubScoreChange(
                                        sectionIndex,
                                        subsectionIndex,
                                        qIndex,
                                        oIndex,
                                        { target: { value } },
                                      );
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                          <i
                            className="fa-solid fa-delete-left cross-image"
                            onClick={() =>
                              onHandleSubOptionDelete(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
                                oIndex,
                              )
                            }
                          ></i>
                        </div>
                      ))}
                      <div className="options">
                        <span
                          className="add-option-span"
                          onClick={() => handleAddOption(qIndex)}
                        >
                          Add Option
                        </span>
                        <label className="toggle-switch">
                          <span className="toggle-label">&nbsp; Scoreable</span>
                          <input
                            type="checkbox"
                            checked={question.scorable}
                            onChange={() =>
                              onSubScoreableChange(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
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
                      <label>Select Option Type:</label>
                      <select
                        value={question.questionOptionType || ""}
                        onChange={(event) => {
                          const selectedType = event.target.value;
                          question.questionOptionType = selectedType;

                          if (selectedType === "fiveRank") {
                            question.options = [
                              "Excellent",
                              "Good",
                              "Average",
                              "Fair",
                              "Poor",
                              "N/A",
                            ];
                            question.scores = [5, 4, 3, 2, 1, 0];
                          } else if (selectedType === "fiveStar") {
                            question.options = [
                              "N/A",
                              "Poor",
                              "Fair",
                              "Average",
                              "Good",
                              "Excellent",
                            ];
                            // question.options = ["N/A", "Poor", "Fair", "Average", "Good", "Ex"]
                            question.scores = [0, 1, 2, 3, 4, 5];
                          } else if (selectedType === "slider") {
                            // Slider options (Discrete values)
                            question.options = [
                              "N/A",
                              "Poor",
                              "Fair",
                              "Average",
                              "Good",
                              "Excellent",
                            ];
                            question.scores = [0, 1, 2, 3, 4, 5];
                          } else if (selectedType === "emojiStars") {
                            // question.options = ["😍","😊","😐","😟","😡","🚫"];
                            // question.scores = [5, 4, 3, 2, 1, 0];
                            // question.options = ["\u{1F60D}", "\u{1F60A}", "\u{1F610}", "\u{1F61F}", "\u{1F621}", "\u{1F6AB}"];
                            question.options = [
                              "Excellent",
                              "Good",
                              "Average",
                              "Fair",
                              "Poor",
                              "N/A",
                            ];
                            question.scores = [5, 4, 3, 2, 1, 0];
                          }
                          // question.defaultSelected = "";
                          setSections([...sections]);
                        }}
                      >
                        <option value="">Select an Item</option>
                        <option value="fiveRank">Five Rank Rating</option>
                        <option value="fiveStar">Five Star Rating</option>
                        {/* <option value="slider">Slider</option> */}
                        <option value="emojiStars">Emoji Rating</option>
                      </select>
                      {/* Five-Star Feedback System */}
                      {question.questionOptionType === "fiveStar" && (
                        <div className="five-star-container">
                          <div
                            className="stars"
                            onMouseLeave={() => setHoverRating(0)} // Reset hover effect on mouse leave
                          >
                            {Object.keys(starTextMapping).map(
                              (star, oIndex) => (
                                <div
                                  key={oIndex}
                                  className="tooltip-container"
                                  onMouseEnter={() =>
                                    setHoverRating(parseInt(star, 10))
                                  } // Set hover effect
                                  onClick={() => {
                                    question.defaultSelected =
                                      starTextMapping[star]; // Save text label to backend
                                    setSections([...sections]);
                                  }}
                                >
                                  <span
                                    className={`star-icon ${
                                      hoverRating >= parseInt(star, 10) ||
                                      textToStarMapping[
                                        question.defaultSelected
                                      ] >= parseInt(star, 10)
                                        ? "selected"
                                        : ""
                                    }`}
                                  >
                                    ★
                                  </span>
                                  {hoverRating === parseInt(star, 10) && (
                                    <div className="tooltip-text">
                                      {starTextMapping[star]} ({star} Star)
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>

                          {/* Display Selected Rating */}
                          <p className="rating-text">
                            {question.defaultSelected
                              ? `${question.defaultSelected} (${
                                  textToStarMapping[question.defaultSelected]
                                } Star)`
                              : "No rating selected"}
                          </p>
                        </div>
                      )}

                      {/* Five-Rank System (Same logic as Five-Star, but showing options instead of stars) */}
                      {question.questionOptionType === "fiveRank" &&
                        question.options.map((option, oIndex) => (
                          <div key={oIndex} className="option-container">
                            <label className="labelspecial">{option}</label>

                            {/* Radio button for option selection */}
                            <input
                              type="radio"
                              name={`sub-question-${sectionIndex}-${subsectionIndex}-${qIndex}`}
                              value={option}
                              checked={question.defaultSelected === option}
                              onChange={(event) => {
                                question.defaultSelected = event.target.value;
                                setSections([...sections]);
                              }}
                            />

                            {/* Checkbox to disable score input and set score to null */}
                            {question.scorable && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <label>
                                  Null
                                  <input
                                    type="checkbox"
                                    checked={question.scores[oIndex] === null}
                                    onChange={(event) => {
                                      if (event.target.checked) {
                                        // Set score to null when checkbox is checked
                                        question.scores[oIndex] = null;
                                      } else {
                                        // Reset to default score when checkbox is unchecked
                                        question.scores[oIndex] = 0;
                                      }
                                      setSections([...sections]); // Trigger re-render
                                    }}
                                  />
                                </label>
                              </div>
                            )}

                            {/* Score input field, hidden if checkbox is checked */}
                            {question.scorable &&
                              question.scores[oIndex] !== null && (
                                <label>
                                  Score
                                  <input
                                    className="score"
                                    type="number"
                                    value={
                                      question.scores[oIndex] !== undefined
                                        ? question.scores[oIndex]
                                        : ""
                                    }
                                    min="0"
                                    step="0.01"
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      if (
                                        value === "" ||
                                        /^\d{0,5}(\.\d{0,2})?$/.test(value)
                                      ) {
                                        onSubScoreChange(
                                          sectionIndex,
                                          subsectionIndex,
                                          qIndex,
                                          oIndex,
                                          { target: { value } },
                                        );
                                      }
                                    }}
                                  />
                                </label>
                              )}
                          </div>
                        ))}
                      {/* Emoji Star Rating System */}
                      {question.questionOptionType === "emojiStars" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "15px",
                          }}
                        >
                          {/* Initialize Default Selected */}
                          {(() => {
                            if (
                              question.defaultSelected === null ||
                              question.defaultSelected === undefined
                            ) {
                              question.defaultSelected = 5; // Default to 5 stars for the first emoji "😍"
                            }
                          })()}

                          {/* Emoji and Stars Display */}
                          {question.options.map((option, oIndex) => (
                            <div
                              key={oIndex}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                border: "1px solid #ccc",
                                padding: "5px",
                                borderRadius: "5px",
                                width: "250px",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                backgroundColor:
                                  question.defaultSelected ===
                                  question.scores[oIndex]
                                    ? "#fffff"
                                    : "white",
                              }}
                            >
                              {/* Emoji Display */}
                              <span
                                style={{
                                  fontSize: "2rem",
                                  cursor: "pointer",
                                  transition: "transform 0.2s ease",
                                  color:
                                    question.defaultSelected ===
                                    question.scores[oIndex]
                                      ? "#ffcc00"
                                      : "hsl(var(--foreground))",
                                }}
                                onClick={() => {
                                  question.defaultSelected =
                                    question.scores[oIndex]; // Update selection to match the emoji's score
                                  question.selectedEmoji = option; // Save the name (e.g., "Excellent")
                                  setSections([...sections]); // Trigger re-render
                                }}
                              >
                                {reverseEmojiMap1[option] || option}{" "}
                                {/* Render the emoji */}
                              </span>

                              {/* Star Display */}

                              <div style={{ display: "flex", gap: "13px" }}>
                                {[...Array(5)].map((_, starIndex) => (
                                  <span
                                    key={starIndex}
                                    className={`star-icon ${
                                      starIndex + 1 <= question.scores[oIndex]
                                        ? "selected"
                                        : ""
                                    }`}
                                    style={{
                                      fontSize: "1.5rem",
                                      color:
                                        starIndex + 1 <= question.scores[oIndex]
                                          ? "#FFD700"
                                          : "#ccc",
                                    }}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="default-label">
                        <label>Default Value :</label>
                        <select
                          value={question.defaultSelected}
                          onChange={(event) =>
                            onSubDefaultSelectionChange(
                              sectionIndex,
                              subsectionIndex,
                              qIndex,
                              event,
                            )
                          }
                        >
                          <option value=""></option>
                          {question.options.map((option, index) => (
                            <option key={index} value={option}>
                              {question.questionOptionType === "emojiStars"
                                ? reverseEmojiMap1[option] || option
                                : option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {question.type === "twoRankedList" && (
                    <div>
                      <label>Select Option Type:</label>
                      <select
                        value={question.questionOptionType || ""}
                        onChange={(event) => {
                          const selectedType = event.target.value;
                          question.questionOptionType = selectedType;

                          if (selectedType === "yesNo") {
                            question.options = ["Yes", "No", "N/A"];
                            question.scores = [1, 0, 0];
                          } else if (selectedType === "emoji") {
                            question.options = ["Yes", "No", "N/A"];
                            question.scores = [1, 0, 0];
                          } else {
                            question.options = [];
                            question.scores = [];
                            question.defaultSelected = "";
                          }
                          setSections([...sections]); // Trigger re-render
                        }}
                      >
                        <option value="">Select an Item</option>
                        <option value="yesNo">Two Rank Rating</option>
                        <option value="emoji">Emoji Rating</option>
                      </select>
                      {question.options.map((option, oIndex) => (
                        <div
                          key={oIndex}
                          className={`option-container ${
                            question.questionOptionType === "emoji"
                              ? "emoji-option"
                              : ""
                          }`}
                        >
                          <label className="labelspecial-2">
                            {question.questionOptionType === "emoji"
                              ? reverseEmojiMap[option] || option // Show the emoji on the frontend
                              : option}
                          </label>

                          {/* Render radio button for the option */}
                          <input
                            type="radio"
                            name={`sub-question-${sectionIndex}-${subsectionIndex}-${qIndex}`}
                            value={option}
                            checked={question.defaultSelected === option}
                            onChange={(event) =>
                              onSubRadioChange(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
                                event,
                              )
                            }
                            style={{
                              display:
                                question.questionOptionType === "emoji"
                                  ? "none"
                                  : "inline-block",
                            }}
                          />

                          {/* Render checkbox for all options, including "N/A" */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <label>
                              Null
                              <input
                                type="checkbox"
                                checked={question.scores[oIndex] === null}
                                onChange={(event) => {
                                  question.scores[oIndex] = event.target.checked
                                    ? null
                                    : 0;
                                  setSections([...sections]); // Trigger re-render
                                }}
                              />
                            </label>
                          </div>

                          {/* Show the score input if the option is scorable and not null */}
                          {question.scorable &&
                            question.scores[oIndex] !== null && (
                              <label>
                                Score
                                <input
                                  className="score"
                                  type="number"
                                  value={
                                    question.scores[oIndex] !== undefined &&
                                    question.scores[oIndex] !== null
                                      ? question.scores[oIndex]
                                      : ""
                                  }
                                  min="0"
                                  step="0.01"
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    // Validate and apply score change
                                    if (
                                      value === "" ||
                                      /^\d{0,5}(\.\d{0,2})?$/.test(value)
                                    ) {
                                      onSubScoreChange(
                                        sectionIndex,
                                        subsectionIndex,
                                        qIndex,
                                        oIndex,
                                        { target: { value } },
                                      );
                                    }
                                  }}
                                />
                              </label>
                            )}
                        </div>
                      ))}
                      {/* Default Value Dropdown */}
                      <div className="default-label">
                        <label>Default Value :</label>
                        <select
                          value={question.defaultSelected}
                          onChange={(event) =>
                            onSubDefaultSelectionChange(
                              sectionIndex,
                              subsectionIndex,
                              qIndex,
                              event,
                            )
                          }
                        >
                          <option value=""></option>
                          {question.options.map((option, index) => (
                            <option key={index} value={option}>
                              {question.questionOptionType === "emoji"
                                ? reverseEmojiMap[option] || option
                                : option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <ReactQuill
                    placeholder="Question Instructions"
                    value={question.SubQuestionInstructions}
                    maxLength={250}
                    onChange={(value) =>
                      onHandleSubQuestionInstruction(
                        sectionIndex,
                        subsectionIndex,
                        qIndex,
                        value, // Pass the value directly
                      )
                    }
                    style={{
                      width: "97%",
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                    }}
                    modules={{
                      toolbar: [
                        ["bold", "italic", "underline"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        //  ["link", "image"], // Insert link and image
                        [{ align: [] }], // Text alignment
                        ["clean"], // Remove formatting
                      ],
                    }}
                    formats={[
                      "bold",
                      "italic",
                      "underline",
                      "list",
                      "bullet",
                      // "link",
                      // "image",
                      "align",
                    ]}
                  />
                  <div class="action-container">
                    <label className="checkbox-label">
                      <span className="toggle-label">&nbsp; Required</span>
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={() =>
                          onSubRequiredChange(
                            sectionIndex,
                            subsectionIndex,
                            qIndex,
                          )
                        }
                      />
                    </label>
                    <label className="checkbox-label">
                      <span className="toggle-label">&nbsp; Hide Question</span>
                      <input
                        type="checkbox"
                        checked={question.hidden}
                        onChange={() =>
                          onhandleHiddenSubquestionChange(
                            sectionIndex,
                            subsectionIndex,
                            qIndex,
                          )
                        }
                      />
                    </label>
                    <label className="checkbox-label">
                      <span className="toggle-label">&nbsp; Hide Score</span>
                      <input
                        type="checkbox"
                        checked={question.hideScore || false}
                        onChange={() =>
                          onHideSubQuestionScore(
                            sectionIndex,
                            subsectionIndex,
                            qIndex,
                          )
                        }
                        // style={{ display: "none" }}
                        // disabled={question.type === "checkboxes" || question.type === "dropdown"} // Disable for checkboxes and dropdowns
                      />
                      {/* <span className="toggle-slider"></span> */}
                    </label>

                    <label className="checkbox-label">
                      <span className="toggle-label">&nbsp; Comment</span>
                      <input
                        type="checkbox"
                        checked={question.enableComment}
                        onChange={() =>
                          onEnableSubQuestionComment(
                            sectionIndex,
                            subsectionIndex,
                            qIndex,
                          )
                        }
                        // style={{ display: "none" }}
                      />
                      {/* <span className="toggle-slider"></span> */}
                    </label>
                    <div className="question-container-button">
                      <div className="tooltip-wrapper">
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "text/plain",
                              JSON.stringify({
                                type: "ADD_QUESTION_AFTER",
                                sectionIndex,
                                subsectionIndex,
                                questionIndex: qIndex,
                              }),
                            );
                          }}
                        >
                          <span
                            className="addques-image cursor-pointer"
                            onClick={() =>
                              onAddAfterSubQuestionWrapper(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
                              )
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "28px",
                              height: "28px",
                              fontSize: "13px",
                              fontWeight: "700",
                              letterSpacing: "-0.5px",
                            }}
                          >
                            Q+
                          </span>
                        </span>

                        <span className="tooltip-scontainer-text">
                          Add Question
                        </span>
                      </div>

                      <div className="tooltip-wrapper">
                        <Trash2
                          className="delete-image"
                          size={18}
                          onClick={() =>
                            onDeleteSubQuestion(
                              sectionIndex,
                              subsectionIndex,
                              qIndex,
                            )
                          }
                        />
                        <span className="tooltip-scontainer-text">
                          Delete Question
                        </span>
                      </div>
                      <div className="tooltip-wrapper">
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "copy";
                            e.dataTransfer.setData(
                              "text/plain",
                              JSON.stringify({
                                type: "DUPLICATE_QUESTION",
                                sourceSectionIndex: sectionIndex,
                                sourceSubsectionIndex: subsectionIndex,
                                sourceQuestionIndex: qIndex,
                              }),
                            );
                          }}
                        >
                          <Copy
                            className="duplicate-image"
                            size={18}
                            onClick={() =>
                              onHandleDuplicate(
                                sectionIndex,
                                subsectionIndex,
                                qIndex,
                              )
                            }
                          />
                        </span>
                        <span className="tooltip-scontainer-text">
                          Duplicate Question
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

      <div className="line-above"></div>
    </div>
  );
};

export default withAuth(SubSection);
