import React from "react";

// Helper for required asterisks
const RequiredAsterisk = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

function MultiCheckboxDropdown({ label, options, selected, onChange, single = false, placeholder, showRequired = false }) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleCheckboxChange = (value) => {
    const isSelected = selected.includes(value);
  
    // SINGLE select (Level, Type)
    if (single) {
      if (isSelected) {
        // Unselect: keep dropdown open
        onChange(selected.filter((v) => v !== value));
      } else {
        // Select: replace and close
        onChange([value]);
        setOpen(false);
      }
      return;
    }
  
    // MULTI select (Category)
    if (isSelected) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Handle label - can be string or React element
  const labelContent = typeof label === "string" ? label : label;
  // Extract text from label for placeholder (if label is React element, use placeholder prop or default)
  const getLabelText = () => {
    if (typeof label === "string") return label;
    if (typeof label === "object" && label?.props?.children) {
      const children = label.props.children;
      if (Array.isArray(children)) {
        const firstChild = children.find(c => typeof c === "string");
        return firstChild || "option";
      }
      return typeof children === "string" ? children : "option";
    }
    return "option";
  };
  const displayPlaceholder = placeholder || `Select ${getLabelText().toLowerCase()}...`;

  return (
    <div ref={dropdownRef} style={{ position: "relative", marginBottom: 0 }}>
      <label style={{ fontWeight: 600, marginBottom: 6, display: "block", color: "#222" }}>
        {labelContent} {showRequired && <RequiredAsterisk />}
      </label>
      <div
        style={{
          border: "1.5px solid #bbb",
          borderRadius: 6,
          background: "#fafbfc",
          padding: "10px 14px",
          cursor: "pointer",
          minHeight: 40,
          fontFamily: "Open Sans, sans-serif",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {selected.length === 0 ? (
          <span style={{ color: "#888" }}>{displayPlaceholder}</span>
        ) : (
          selected.join(", ")
        )}
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #bbb",
            borderRadius: 6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            zIndex: 100,
            maxHeight: 180,
            overflowY: "auto",
            marginTop: 2,
          }}
        >
          {options.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => handleCheckboxChange(opt)}
                style={{ marginRight: 8 }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiCheckboxDropdown;
