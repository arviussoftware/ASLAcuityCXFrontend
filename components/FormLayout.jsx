import React, { useState } from 'react';
import "./Styles/FormLayout.css";

const FormLayout = ({ sections, formName }) => {
  const [focusedItem, setFocusedItem] = useState(null); // To track focused item

  const handleFocus = (itemId) => {
    setFocusedItem(itemId); // Set the focused item when clicked
  };

  const isFocused = (itemId) => focusedItem === itemId; // Check if item is focused

  return (
    <div className="form-tree">
      <h3>{formName}</h3>
      <ul>
        {sections.map((section, sIndex) => (
          <li 
            key={sIndex} 
            className={isFocused(`section-${sIndex}`) ? 'focused' : ''}
            onClick={() => handleFocus(`section-${sIndex}`)}
          >
            <span>{section.sectionDetails}</span>
            <ul>
              {section.subsections.map((subsection, ssIndex) => (
                <li 
                  key={ssIndex} 
                  className={isFocused(`subsection-${sIndex}-${ssIndex}`) ? 'focused' : ''}
                  onClick={() => handleFocus(`subsection-${sIndex}-${ssIndex}`)}
                >
                  <span>{subsection.subsectionDetails}</span>
                  <ul>
                    {subsection.questions.map((question, qIndex) => (
                      <li 
                        key={qIndex} 
                        className={isFocused(`question-${sIndex}-${ssIndex}-${qIndex}`) ? 'focused' : ''}
                        onClick={() => handleFocus(`question-${sIndex}-${ssIndex}-${qIndex}`)}
                      >
                        {question.question}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FormLayout;
