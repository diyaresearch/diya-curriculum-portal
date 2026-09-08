import React from "react";

// Helper for required asterisks
const RequiredAsterisk = () => <span className="ml-1 text-red-600">*</span>;

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
    <div ref={dropdownRef} className="relative mb-0">
      <label className="mb-1.5 block font-semibold text-ink">
        {labelContent} {showRequired && <RequiredAsterisk />}
      </label>
      <div
        className="min-h-10 cursor-pointer rounded-md border-[1.5px] border-[#bbb] bg-[#fafbfc] px-3.5 py-2.5 font-sans"
        onClick={() => setOpen((o) => !o)}
      >
        {selected.length === 0 ? (
          <span className="text-ink-faint">{displayPlaceholder}</span>
        ) : (
          selected.join(", ")
        )}
      </div>
      {open && (
        <div className="absolute top-full right-0 left-0 z-[100] mt-0.5 max-h-[180px] overflow-y-auto rounded-md border-[1.5px] border-[#bbb] bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center px-3 py-2 font-sans"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => handleCheckboxChange(opt)}
                className="mr-2"
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
