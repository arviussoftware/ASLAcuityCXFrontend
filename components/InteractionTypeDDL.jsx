import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

const InteractionTypeDDL = ({ options, selectedValues, onChange, placeholder = "Select Interaction Type" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);  // ✅ ref for the portal dropdown

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideTrigger = wrapperRef.current?.contains(e.target);
      const clickedInsideDropdown = dropdownRef.current?.contains(e.target); // ✅ check portal too
      if (!clickedInsideTrigger && !clickedInsideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
        maxHeight: "200px",
        overflowY: "auto",
        background: "#fff",
        border: "1px solid #ced4da",
        borderRadius: "4px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 99999,
        fontFamily: "inherit",
        fontSize: "14px",
      });
    }
    setIsOpen((prev) => !prev);
  };

  const toggleOption = (id) => {
    const updated = selectedValues.includes(id)
      ? selectedValues.filter((i) => i !== id)
      : [...selectedValues, id];
    onChange(updated);
  };

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : options
        .filter((item) => selectedValues.includes(item.Id))
        .map((item) => item.InteractionType)
        .join(", ");

  const dropdownList = isOpen
    ? ReactDOM.createPortal(
      <div ref={dropdownRef} style={dropdownStyle}>  {/* ✅ attach ref here */}
        {options?.map((item) => (
          <label
            key={item.Id}
            onMouseDown={(e) => e.stopPropagation()} // ✅ prevent outside click from firing
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 12px",
              cursor: "pointer",
              color: "#212529",
              background: selectedValues.includes(item.Id) ? "#e8f0fe" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!selectedValues.includes(item.Id))
                e.currentTarget.style.background = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = selectedValues.includes(item.Id)
                ? "#e8f0fe"
                : "transparent";
            }}
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(item.Id)}
              onChange={() => toggleOption(item.Id)}
              style={{ accentColor: "#0d6efd", cursor: "pointer", margin: 0 }}
            />
            {item.InteractionType}
          </label>
        ))}
      </div>,
      document.body
    )
    : null;

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "inline-block" }}>
      <div
        ref={triggerRef}
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "4px 10px",
          border: "1px solid #ced4da",
          borderRadius: "4px",
          background: "#fff",
          cursor: "pointer",
          fontSize: "12px",
          fontFamily: "inherit",
          color: selectedValues.length === 0 ? "#6c757d" : "#212529",
          minWidth: "160px",
          maxWidth: "260px",
          height: "34px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          userSelect: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {displayText}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "#555",
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </div>

      {dropdownList}
    </div>
  );
};

export default InteractionTypeDDL;