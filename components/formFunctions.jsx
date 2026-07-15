/////////////////////////////////////SUB-SECTION FUNCTIONS///////////////////////////////////////////////////
import { v4 as uuidv4 } from "uuid";
import { nullable } from "zod";

export const handleAddSubsection = (sections, setSections, sectionIndex) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections.push({
    id: newSections[sectionIndex].subsections.length,
    subsectionDetails: "",
    subsectionDescription: "",
    questions: [],
    hideScore: false,
    scoringMethod: "None",
    basePercentage: 100,
    baselineScore: 0,
    enableComment: false,
    subsectionScore: 0,
    Subsectionuniqueid: uuidv4(),
  });
  setSections(newSections);
};

// Function to duplicate a subsection
export const handleDuplicateSubsection = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex
) => {
  const newSections = [...sections];
  const originalSubsection =
    newSections[sectionIndex].subsections[subsectionIndex];
  const insertionIndex = subsectionIndex + 1;

  let maxQuestionId = 0;
  newSections.forEach((section) => {
    section.subsections.forEach((subsection) => {
      subsection.questions.forEach((question) => {
        const numericQuestionId = Number(question.id);
        if (Number.isFinite(numericQuestionId)) {
          maxQuestionId = Math.max(maxQuestionId, numericQuestionId);
        }
      });
    });
  });

  // Create a deep copy of the original subsection
  const duplicatedSubsection = {
    ...originalSubsection,
    id: `${originalSubsection.id ?? "sub"}_copy_${Date.now()}`,
    subsectionDetails: originalSubsection.subsectionDetails,
    subsectionDescription: originalSubsection.subsectionDescription,
    questions: originalSubsection.questions.map((question, qIndex) => ({
      ...question,
      id: maxQuestionId + qIndex + 1,
      SubQustionUniqueid: uuidv4(),
    })),
    scoringMethod: originalSubsection.scoringMethod,
    basePercentage: originalSubsection.basePercentage,
    baselineScore: originalSubsection.baselineScore,
    enableComment: originalSubsection.enableComment,
    Subsectionuniqueid: uuidv4(),
  };

  // Insert the duplicate immediately after the source subsection.
  newSections[sectionIndex].subsections.splice(
    insertionIndex,
    0,
    duplicatedSubsection,
  );

  // Update the state with the new sections array
  setSections(newSections);
};

export const handleDeleteSubsection = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex
) => {
  const userConfirmed = window.confirm(
    "Are you sure you want to delete this Subcategory ?"
  );
  if (userConfirmed) {
    const newSections = [...sections];
    newSections[sectionIndex].subsections.splice(subsectionIndex, 1);
    setSections(newSections);
  }
};

// export const handleSubSectionDescriptionChange = (
//   sections,
//   setSections,
//   sectionIndex,
//   subsectionIndex,
//   event
// ) => {
//   const newSections = [...sections];
//   newSections[sectionIndex].subsections[subsectionIndex].subsectionDescription =
//     event.target.value;
//   setSections(newSections);
// };

export const handleSubSectionDescriptionChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  value
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].subsectionDescription =
    value;
  setSections(newSections);
};

export const handleSubSectionDetailsChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  event
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].subsectionDetails =
    event.target.value;
  setSections(newSections);
};

// export const handleSubQuestionInstructionChange = (
//   sections,
//   setSections,
//   sectionIndex,
//   subsectionIndex,
//   qIndex,
//   event
// ) => {
//   const newSections = [...sections];
//   newSections[sectionIndex].subsections[subsectionIndex].questions[
//     qIndex
//   ].SubQuestionInstructions = event.target.value;
//   setSections(newSections);
// };

export const handleSubQuestionInstructionChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  qIndex,
  value
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    qIndex
  ].SubQuestionInstructions = value;
  setSections(newSections);
};

export const handleAddSubQuestion = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  insertAfterIndex = -1 // Default: add at the end
) => {
  const newSections = [...sections];

  const generateQuestionId = () =>
    `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const questions =
    newSections[sectionIndex].subsections[subsectionIndex].questions;

  const newQuestion = {
    id: generateQuestionId(),
    SubQuestionInstructions: "",
    question: "",
    options: [],
    type: "shortAnswer",
    required: false,
    hidden: false,
    selectedOption: null,
    scorable: false,
    scores: [],
    hideScore: false,
    enableComment: false,
    defaultSelected: "",
    questionScore: 0,
    answer: "",
    SubQustionUniqueid: uuidv4(),
    questionOptionType: "",
    selectedCheckboxes: [],
  };

  if (insertAfterIndex === -1) {
    // Add at end
    questions.push(newQuestion);
  } else {
    // Insert after specific index
    questions.splice(insertAfterIndex + 1, 0, newQuestion);
  }

  setSections(newSections);
};

export const handleDeleteSubQuestion = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex
) => {
  const userConfirmed = window.confirm(
    "Are you sure you want to delete this Question?"
  );
  if (userConfirmed) {
    const newSections = [...sections];
    newSections[sectionIndex].subsections[subsectionIndex].questions.splice(
      questionIndex,
      1
    );
    setSections(newSections);
  }
};

export const handleSubQuestionChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex,
  event
) => {
  const newSections = [...sections];

  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].question = event.target.value;
  setSections(newSections);
};

export const handleAddSubOption = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].options.push(""); // Add an empty option
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].scores.push(0);
  setSections(newSections);
};

export const handleSubAnswerChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex,
  event
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].answer = event.target.value;
  setSections(newSections);
};

export const handleSubRequiredChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].required =
    !newSections[sectionIndex].subsections[subsectionIndex].questions[
      questionIndex
    ].required;
  setSections(newSections);
};

export const handleSubDuplicateQuestion = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  const questionToDuplicate =
    newSections[sectionIndex].subsections[subsectionIndex].questions[
      questionIndex
    ];

  const generateQuestionId = () =>
    `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Deep copy of the question, including a new copy of the scores array
  const duplicateQuestion = {
    ...questionToDuplicate,
    id: generateQuestionId(), // Assign a unique ID based on the highest existing ID
    options: [...questionToDuplicate.options],
    scores: [...questionToDuplicate.scores],
    SubQustionUniqueid: uuidv4(),
  };

  // Insert the duplicated question after the original
  newSections[sectionIndex].subsections[subsectionIndex].questions.splice(
    questionIndex + 1,
    0,
    duplicateQuestion
  );
  // Update the state with the new sections array
  setSections(newSections);
};

export const handleSubTypeChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex,
  event,
  isOptionTypeChange = false
) => {
  const type = event.target.value;
  const newSections = [...sections];
  const question =
    newSections[sectionIndex].subsections[subsectionIndex].questions[
      questionIndex
    ];

  if (isOptionTypeChange) {
    // If we're changing only `questionOptionType`, don't reset everything
    question.questionOptionType = type;
  } else {
    // Changing question type - reset only necessary fields
    question.scorable = false;
    question.type = type;
    question.options = [];
    question.scores = [];
    question.selectedOption = null;
    question.selectedCheckboxes = [];
    question.defaultSelected = "";
    // Preserve `questionOptionType` only if switching within `selectMultipleChoice`
    if (type !== "selectMultipleChoice") {
      question.questionOptionType = "";
    }
    if (type === "fiveRankedList" || type === "twoRankedList") {
      question.scorable = true;
      question.selectedOption = null;
      question.required = false;
      question.hidden = false;
      question.enableComment = false;
      question.hideScore = false;
      question.defaultSelected = "";
    }
    if (
      type === "multipleChoice" ||
      type === "selectMultipleChoice" ||
      type === "drpdwn"
    ) {
      question.options = defaultOptions.map((option) => option.label);
      question.scores = defaultOptions.map((option) => option.value);
      question.selectedOption = null; // Reset selection
      question.defaultSelected = "";
    }
  }
  question.selectedOption = null;
  question.selectedCheckboxes = [];
  setSections(newSections);
};

export const handleSubOptionChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex,
  optionIndex,
  event
) => {
  const newSections = [...sections];
  const updatedOptions = newSections[sectionIndex].subsections[
    subsectionIndex
  ].questions[questionIndex].options.map((option, index) =>
    index === optionIndex ? event.target.value : option
  );

  // Update the question with the new options array
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ] = {
    ...newSections[sectionIndex].subsections[subsectionIndex].questions[
      questionIndex
    ],
    options: updatedOptions,
  };
  setSections(newSections);
};

export const handleSubScoreChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex,
  optionIndex,
  event
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].scores[optionIndex] = event.target.value;
  setSections(newSections);
};

//  export const handleSubScoreableChange = (
//    sections,
//    setSections,
//    sectionIndex,
//    subsectionIndex,
//    questionIndex
//  ) => {
//    const newSections = [...sections];
//    newSections[sectionIndex].subsections[subsectionIndex].questions[questionIndex].scorable = !newSections[sectionIndex].subsections[subsectionIndex].questions[questionIndex].scorable;
//    if (
//      !newSections[sectionIndex].subsections[subsectionIndex].questions[questionIndex].scorable) {
//      newSections[sectionIndex].subsections[subsectionIndex].questions[
//        questionIndex
//      ].scores = [];
//    } else {
//      newSections[sectionIndex].subsections[subsectionIndex].questions[questionIndex].scores = newSections[sectionIndex].subsections[subsectionIndex].questions[questionIndex].options.map(() => 0);
//    }
//    setSections(newSections);
//  };

// export const handleSubScoreableChange = (
//   sections,
//   setSections,
//   sectionIndex,
//   subsectionIndex,
//   questionIndex
// ) => {
//   const newSections = [...sections];
//   const question = newSections[sectionIndex].subsections[subsectionIndex].questions[questionIndex];
//   // Toggle scorable state
//   question.scorable = !question.scorable;
//   if (!question.scorable) {
//     //When scorable is off , set all option scores to null
//     question.scores = question.options.map(() => null);
//   } else {
//     // When scorable is ON, set all option scores to 0
//     question.scores = question.options.map(() => 0);
//   }
//   setSections(newSections);
// };

// export const handleSubScoreableChange= (
//   sections,
//   setSections,
//   sectionIndex,
//   subsectionIndex,
//   questionIndex
// ) =>{
//   const newSections = [...sections];
//   const question = newSections[sectionIndex].subsections[subsectionIndex].questions[questionIndex]

//   question.scorable = !question.scorable;
//   if(!question.scores || Array.isArray(question.scores)){
//     question.scores = question.scores.map(()=> null)
//   }

//   if(!question.scorable){
//     question.scores = question.scores.map(()=> null)
//   }else{
//     question.scores = question.scores.map((score) => (score === null ? 0 : null))
//   }

//   setSections(newSections);
// }

export const handleSubScoreableChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  const question =
    newSections[sectionIndex].subsections[subsectionIndex].questions[
      questionIndex
    ];
  question.scorable = !question.scorable;

  if (question.scorable) {
    question.scores = question.options.map((scores, index) =>
      question.scores[index] === null ? 0 : question.scores[index]
    );
  } else {
    question.scores = question.options.map(() => null);
  }
  setSections(newSections);
};

export const handleSubRadioChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex,
  event
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].selectedOption = event.target.value;
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].defaultSelected = event.target.value;
  setSections(newSections);
};

export const handleSubDefaultSelectionChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex,
  event
) => {
  const newSections = [...sections];
  const newDefault = event.target.value;

  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].defaultSelected = newDefault;
  setSections(newSections);
};

export const handleEnableSubSectionComment = (
  sections,
  setSections,
  sectionIndex,
  subSectionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subSectionIndex].enableComment =
    !newSections[sectionIndex].subsections[subSectionIndex].enableComment;
  setSections(newSections);
};

export const handleHiddenSubquestionChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].hidden =
    !newSections[sectionIndex].subsections[subsectionIndex].questions[
      questionIndex
    ].hidden;
  setSections(newSections);
};

export const handleEnableSubQuestionComment = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].enableComment =
    !newSections[sectionIndex].subsections[subsectionIndex].questions[
      questionIndex
    ].enableComment;
  setSections(newSections);
};

export const handleHideSubQuestionScore = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].questions[
    questionIndex
  ].hideScore =
    !newSections[sectionIndex].subsections[subsectionIndex].questions[
      questionIndex
    ].hideScore;
  setSections(newSections);
};

export const handleHideSubSectionScoreChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].subsections[subsectionIndex].hideScore =
    !newSections[sectionIndex].subsections[subsectionIndex].hideScore;
  setSections(newSections);
};

//  export const handleDeleteSubOption = (
//    sections,
//    setSections,
//    sectionIndex,
//    subSectionIndex,
//    questionIndex,
//    optionIndex
//  ) => {
//    const newSections = [...sections];
//    newSections[sectionIndex].subsections[subSectionIndex].questions[
//      questionIndex
//    ].options.splice(optionIndex, 1);
//    setSections(newSections);
//  };

export const handleDeleteSubOption = (
  sections,
  setSections,
  sectionIndex,
  subSectionIndex,
  questionIndex,
  optionIndex
) => {
  const newSections = [...sections];

  const question =
    newSections[sectionIndex].subsections[subSectionIndex].questions[
      questionIndex
    ];

  // Ensure the question has an options array before modifying it
  if (question?.options) {
    question.options.splice(optionIndex, 1);
  }

  // Ensure the scores array exists and remove the corresponding score
  if (question?.scores) {
    question.scores.splice(optionIndex, 1);
  }

  setSections(newSections);
};

//added sub section scoring methods
export const SubsectionScoringMethodChange = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  event
) => {
  const updatedSubSections = [...sections];
  updatedSubSections[sectionIndex].subsections[subsectionIndex].scoringMethod =
    event.target.value;
  setSections(updatedSubSections);
};

export const setSubSectionBasePercentage = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  event
) => {
  const updatedSubSections = [...sections];
  updatedSubSections[sectionIndex].subsections[subsectionIndex].basePercentage =
    event.target.value;
  setSections(updatedSubSections);
};
export const setSubSectionBaselineScore = (
  sections,
  setSections,
  sectionIndex,
  subsectionIndex,
  event
) => {
  const updatedSubSections = [...sections];
  updatedSubSections[sectionIndex].subsections[subsectionIndex].baselineScore =
    event.target.value;
  setSections(updatedSubSections);
};

////////////////////////////////////////SECTIONS FUNCTIONS////////////////////////////////////////////////////////////

export const handleAddSection = (setSections) => {
  setSections((prevSections) => [
    ...prevSections,
    {
      id: prevSections.length,
      sectionDetails: "",
      sectionDescription: "",
      questions: [],
      subsections: [],
      hideScore: false,
      scoringMethod: "None",
      basePercentage: 100,
      baselineScore: 0,
      enableComment: false,
      sectionScore: 0,
      sectionuniqueid: uuidv4(),
    },
  ]);
};

// Function to duplicate a section
export const handleDuplicateSection = (
  sections,
  setSections,
  sectionIndex,
  categoryNameRefs
) => {
  const newSections = [...sections];
  const originalSection = newSections[sectionIndex];

  // Calculate the highest question ID across all sections to ensure unique question IDs
  let maxQuestionId = 0;
  newSections.forEach((section) => {
    section.subsections.forEach((subsection) => {
      subsection.questions.forEach((question) => {
        maxQuestionId = Math.max(maxQuestionId, question.id);
      });
    });
  });

  const duplicateSubsection = originalSection.subsections.map(
    (subsection, subIndex) => ({
      ...subsection,
      id: newSections[sectionIndex].subsections.length,
      Subsectionuniqueid: uuidv4(), // Generate new unique ID for subsection
      questions: subsection.questions.map((question, qIndex) => ({
        ...question,
        id: maxQuestionId + qIndex + 1, // Increment IDs for new questions to avoid collision
        SubQustionUniqueid: uuidv4(), // Generate new unique ID for each question
      })),
    })
  );

  // Create a deep copy of the original section
  const duplicatedSection = {
    ...originalSection,
    id: newSections.length, // Set a new ID for the duplicated section
    sectionDetails: originalSection.sectionDetails,
    sectionDescription: originalSection.sectionDescription,
    subsections: duplicateSubsection,
    hideScore: originalSection.hideScore,
    scoringMethod: originalSection.scoringMethod,
    basePercentage: originalSection.basePercentage,
    enableComment: originalSection.enableComment,
    sectionuniqueid: uuidv4(), // Generate new unique ID for section
  };

  // Add the duplicated section to the array
  newSections.push(duplicatedSection);

  // Update the state with the new sections array
  setSections(newSections);
  setTimeout(() => {
    const lastIndex = newSections.length - 1;

    if (categoryNameRefs.current && categoryNameRefs.current[lastIndex]) {
      categoryNameRefs.current[lastIndex].focus();
    }
  }, 100);
};
export const handleAddQuestion = (sections, setSections, sectionIndex) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions.push({
    id: newSections[sectionIndex].questions.length,
    QuestionInstructions: "",
    type: "shortAnswer",
    question: "",
    answer: "",
    paragraph: "",
    options: [],
    required: false,
    hidden: false,
    selectedOption: null,
    selectedCheckboxes: [],
    subQuestions: [],
    scorable: false,
    scores: [],
    defaultSelected: "",
    QustonUniqueid: uuidv4(),
    questionOptionType: "",
  });
  setSections(newSections);
};

// export const handleSectionDescriptionChange = (index, event, setSections) => {
//   setSections((prevSections) => {
//     const newSections = [...prevSections];
//     newSections[index].sectionDescription = event.target.value;
//     return newSections;
//   });
// };

export const handleSectionDescriptionChange = (index, value, setSections) => {
  setSections((prevSections) => {
    const newSections = [...prevSections];
    newSections[index].sectionDescription = value;
    return newSections;
  });
};

export const handleSectionDetailsChange = (index, event, setSections) => {
  setSections((prevSections) => {
    const newSections = [...prevSections];
    newSections[index].sectionDetails = event.target.value;
    return newSections;
  });
};

export const handleDeleteSection = (sectionIndex, setSections) => {
  const userConfirmed = window.confirm(
    "Are you sure you want to delete this category?"
  );

  // If the user confirmed, delete the section
  if (userConfirmed) {
    setSections((prevSections) =>
      prevSections.filter((_, index) => index !== sectionIndex)
    );
  }
};

export const handleQuestionChange = (
  sectionIndex,
  questionIndex,
  event,
  setSections
) => {
  setSections((prevSections) => {
    const newSections = [...prevSections];
    newSections[sectionIndex].questions[questionIndex].question =
      event.target.value;
    return newSections;
  });
};

export const handleTypeChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex,
  event
) => {
  const type = event.target.value;
  const newSections = [...sections];
  const question = newSections[sectionIndex].questions[questionIndex];

  question.type = type;
  question.options = [];
  question.scores = [];

  // Clear options and scores if not multiple choice or checkboxes
  if (
    type !== "multipleChoice" &&
    type !== "checkboxes" &&
    type !== "fiveRankedList" &&
    type !== "twoRankedList" &&
    type !== "drpdwn"
  ) {
    question.options = [];
    question.scores = [];
  }

  // Specifically handle the 'fiveRankedList' type
  if (type === "fiveRankedList") {
    // Instead of adding a new question, modify the current one
    question.options = defaultFiveRankListOptions.map((option) => option.label);
    question.scores = defaultFiveRankListOptions.map((option) => option.value);
    question.scorable = true;
    question.selectedOption = null; // Reset selection
    question.required = false;
    question.hidden = false;
    question.enableComment = false;
    question.hideScore = false;
    question.defaultSelected = "";
  }

  if (type === "twoRankedList") {
    // Instead of adding a new question, modify the current one
    question.options = twoRankListOptions.map((option) => option.label);
    question.scores = twoRankListOptions.map((option) => option.value);
    question.scorable = true;
    question.selectedOption = null; // Reset selection
    question.required = false;
    question.hidden = false;
    question.enableComment = false;
    question.hideScore = false;
    question.defaultSelected = "";
  }

  if (
    type === "multipleChoice" ||
    type === "checkboxes" ||
    type === "dropdown" ||
    type === "drpdwn"
  ) {
    // Instead of adding a new question, modify the current one
    question.options = defaultOptions.map((option) => option.label);
    question.scores = defaultOptions.map((option) => option.value);
    question.selectedOption = null; // Reset selection
    question.defaultSelected = "";
  }

  // Reset selection states
  question.selectedOption = null;
  question.selectedCheckboxes = [];

  setSections(newSections);
};

export const handleParagraphChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex,
  event
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].paragraph =
    event.target.value;
  setSections(newSections);
};

export const handleOptionChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex,
  optionIndex,
  event
) => {
  const newSections = [...sections];

  // Create a new options array for the specific question
  const updatedOptions = newSections[sectionIndex].questions[
    questionIndex
  ].options.map((option, index) =>
    index === optionIndex ? event.target.value : option
  );

  // Update the question with the new options array
  newSections[sectionIndex].questions[questionIndex] = {
    ...newSections[sectionIndex].questions[questionIndex],
    options: updatedOptions,
  };
  setSections(newSections);
};

export const handleAddOption = (
  sections,
  setSections,
  sectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].options.push(""); // Add an empty option
  newSections[sectionIndex].questions[questionIndex].scores.push(0); // Add a score for the new option
  setSections(newSections);
};

export const handleDeleteOption = (
  sections,
  setSections,
  sectionIndex,
  questionIndex,
  optionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].options.splice(
    optionIndex,
    1
  );
  setSections(newSections);
};

export const handleCheckboxChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex,
  option
) => {
  const newSections = [...sections];
  const selectedCheckboxes =
    newSections[sectionIndex].questions[questionIndex].selectedCheckboxes;
  const indexOfOption = selectedCheckboxes.indexOf(option);

  if (indexOfOption === -1) {
    newSections[sectionIndex].questions[questionIndex].selectedCheckboxes = [
      ...selectedCheckboxes,
      option,
    ];
  } else {
    newSections[sectionIndex].questions[
      questionIndex
    ].selectedCheckboxes.splice(indexOfOption, 1);
  }
  setSections(newSections);
};

export const handleScoreChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex,
  optionIndex,
  event
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].scores[optionIndex] =
    event.target.value;
  setSections(newSections);
};

export const handleDuplicateQuestion = (
  sections,
  setSections,
  sectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  const questionToDuplicate =
    newSections[sectionIndex].questions[questionIndex];

  // Create a deep copy of the question to avoid shared references
  const duplicateQuestion = {
    ...questionToDuplicate,
    id: newSections[sectionIndex].questions.length, // Ensure a unique ID or generate one if you have a specific ID system
    options: [...questionToDuplicate.options], // Create a copy of options
    scores: [...questionToDuplicate.scores], // Create a copy of scores
  };

  // Insert the duplicated question after the original
  newSections[sectionIndex].questions.splice(
    questionIndex + 1,
    0,
    duplicateQuestion
  );
  setSections(newSections);
};

export const handleHiddenquestionChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].hidden =
    !newSections[sectionIndex].questions[questionIndex].hidden;
  setSections(newSections);
};

export const handleDeleteQuestion = (
  sections,
  setSections,
  sectionIndex,
  questionIndex
) => {
  const userConfirmed = window.confirm(
    "Are you sure you want to delete this Question?"
  );
  if (userConfirmed) {
    const newSections = [...sections];
    newSections[sectionIndex].questions.splice(questionIndex, 1);
    setSections(newSections);
  }
};

export const handleScoreableChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].scorable =
    !newSections[sectionIndex].questions[questionIndex].scorable;
  if (!newSections[sectionIndex].questions[questionIndex].scorable) {
    newSections[sectionIndex].questions[questionIndex].scores = [];
  } else {
    newSections[sectionIndex].questions[questionIndex].scores = newSections[
      sectionIndex
    ].questions[questionIndex].options.map(() => 0);
  }
  setSections(newSections);
};

export const handleRequiredChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].required =
    !newSections[sectionIndex].questions[questionIndex].required;
  setSections(newSections);
};

export const handleQuestionInstructionChange = (
  setSections,
  sectionIndex,
  qIndex,
  event
) => {
  setSections((prevSections) => {
    const newSections = [...prevSections];
    newSections[sectionIndex].questions[qIndex].QuestionInstructions = event;
    return newSections;
  });
};

export const handleRadioChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex,
  event
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].selectedOption =
    event.target.value;
  newSections[sectionIndex].questions[questionIndex].defaultSelected =
    event.target.value;
  setSections(newSections);
};

export const handleHideQuestionScore = (
  sections,
  setSections,
  sectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].hideScore =
    !newSections[sectionIndex].questions[questionIndex].hideScore;
  setSections(newSections);
};

export const handleEnableSectionComment = (
  sections,
  setSections,
  sectionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].enableComment =
    !newSections[sectionIndex].enableComment;
  setSections(newSections);
};

export const handleHideSectionScoreChange = (
  sections,
  setSections,
  sectionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].hideScore = !newSections[sectionIndex].hideScore;
  setSections(newSections);
};

export const handleDuplicateForm = (form) => {
  const newForm = JSON.parse(JSON.stringify(form));
  const originalName = newForm.formName;
  const match = originalName.match(/\((\d+)\)$/);
  const duplicateName = match
    ? originalName.replace(/\((\d+)\)$/, `(${parseInt(match[1], 10) + 1})`)
    : `${originalName} (1)`;
  newForm.formName = duplicateName;
  newForm.formId = uuidv4();

  const duplicatedSections = (newForm.formJson.sections || []).map(
    (section) => {
      const duplicatedSubsections = (section.subsections || []).map(
        (subsection) => ({
          ...subsection,
          Subsectionuniqueid: uuidv4(),
          questions: (subsection.questions || []).map((question) => ({
            ...question,
            SubQustionUniqueid: uuidv4(),
          })),
        })
      );

      return {
        ...section,
        sectionuniqueid: uuidv4(),
        subsections: duplicatedSubsections,
      };
    }
  );

  newForm.formJson.sections = duplicatedSections;
  return newForm;
};

export const handleEnableQuestionComment = (
  sections,
  setSections,
  sectionIndex,
  questionIndex
) => {
  const newSections = [...sections];
  newSections[sectionIndex].questions[questionIndex].enableComment =
    !newSections[sectionIndex].questions[questionIndex].enableComment;
  setSections(newSections);
};

export const handleDefaultSelectionChange = (
  sections,
  setSections,
  sectionIndex,
  questionIndex,
  event
) => {
  const newSections = [...sections];
  const newDefault = event.target.value;
  newSections[sectionIndex].questions[questionIndex].defaultSelected =
    newDefault;
  setSections(newSections);
};

//added section scoring methods
export const sectionScoringMethodChange = (
  sections,
  setSections,
  sectionIndex,
  event
) => {
  const updatedSections = [...sections];
  updatedSections[sectionIndex].scoringMethod = event.target.value;
  setSections(updatedSections);
};

export const setSectionBasePercentage = (
  sections,
  setSections,
  sectionIndex,
  event
) => {
  const updatedSections = [...sections];
  updatedSections[sectionIndex].basePercentage = event.target.value;
  setSections(updatedSections);
};
export const setSectionBaselineScore = (
  sections,
  setSections,
  sectionIndex,
  event
) => {
  const updatedSections = [...sections];
  updatedSections[sectionIndex].baselineScore = event.target.value;
  setSections(updatedSections);
};

const defaultFiveRankListOptions = [
  { label: "Excellent", value: 5 },
  { label: "Good", value: 4 },
  { label: "Average", value: 3 },
  { label: "Fair", value: 2 },
  { label: "Poor", value: 1 },
  { label: "N/A", value: 0 },
];

const twoRankListOptions = [
  { label: "Yes", value: 1 },
  { label: "No", value: 0 },
  { label: "N/A", value: 0 },
];

const defaultOptions = [{ label: "N/A", value: 0 }];
