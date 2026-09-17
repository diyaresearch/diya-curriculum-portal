import { isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";

// Helper for required asterisks
const RequiredAsterisk = () => <span className="ml-1 text-red-600">*</span>;

export interface MultiCheckboxDropdownProps {
  /** A plain string, or an element when the caller styles the label itself. */
  label: ReactNode;
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** Level and Type pick one; Category picks many. */
  single?: boolean;
  placeholder?: string;
  showRequired?: boolean;
}

/**
 * Pull display text out of a label that may be an element, for the default
 * placeholder. Narrowed rather than asserted: `label` is a ReactNode, so
 * `.props` only exists once isValidElement has vouched for it.
 */
function labelText(label: ReactNode): string {
  if (typeof label === "string") return label;
  if (isValidElement(label)) {
    const { children } = (label as ReactElement<{ children?: ReactNode }>).props;
    if (Array.isArray(children)) {
      const firstChild = children.find((c) => typeof c === "string");
      return typeof firstChild === "string" ? firstChild : "option";
    }
    return typeof children === "string" ? children : "option";
  }
  return "option";
}

function MultiCheckboxDropdown({
  label,
  options,
  selected,
  onChange,
  single = false,
  placeholder,
  showRequired = false,
}: MultiCheckboxDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const handleCheckboxChange = (value: string) => {
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

  const displayPlaceholder = placeholder || `Select ${labelText(label).toLowerCase()}...`;

  return (
    <div ref={dropdownRef} className="relative mb-0">
      <label className="mb-1.5 block font-semibold text-ink">
        {label} {showRequired && <RequiredAsterisk />}
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
