import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * The `.multi-select*` class names come from src/App.css - one of the two
 * kinds of rule that file still holds, because they are descendant and state
 * selectors over a shared block rather than a utility list (#360).
 */

export interface MultiSelectDropdownProps {
    options: readonly string[];
    selected: string[];
    /** Takes the updater form, so it is React's setter, not a plain callback. */
    setSelected: Dispatch<SetStateAction<string[]>>;
    /** Used in the "Select {label}" placeholder. */
    label: string;
}

export function MultiSelectDropdown({ options, selected, setSelected, label }: MultiSelectDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const toggleOption = (option: string) => {
        setSelected((prev) =>
            prev.includes(option)
                ? prev.filter((v) => v !== option)
                : [...prev, option]
        );
    };

    return (
        <div className="multi-select" ref={ref}>
            <div
                className={`multi-select-label${open ? " open" : ""}`}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen((o) => !o);
                    }
                }}
                tabIndex={0}
                role="button"
                aria-expanded={open}
            >
                {selected.length === 0
                    ? `Select ${label}`
                    : selected.join(", ")}
                <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
            </div>
            {open && (
                <div className="multi-select-dropdown">
                    {options.map((option) => (
                        <div
                            key={option}
                            className={`multi-select-option${selected.includes(option) ? " selected" : ""
                                }`}
                            onClick={() => toggleOption(option)}
                        >
                            <span className="checkbox">
                                {selected.includes(option) ? "✔" : ""}
                            </span>
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export interface SingleSelectDropdownProps {
    options: readonly string[];
    selected: string;
    setSelected: (option: string) => void;
    label: string;
}

export function SingleSelectDropdown({ options, selected, setSelected, label }: SingleSelectDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div className="multi-select" ref={ref}>
            <div
                className={`multi-select-label${open ? " open" : ""}`}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen((o) => !o);
                    }
                }}
                tabIndex={0}
                role="button"
                aria-expanded={open}
            >
                {selected ? selected : `Select ${label}`}
                <span className="dropdown-arrow">{open ? "▲" : "▼"}</span>
            </div>
            {open && (
                <div className="multi-select-dropdown">
                    {options.map((option) => (
                        <div
                            key={option}
                            className={`multi-select-option${selected === option ? " selected" : ""}`}
                            onClick={() => setSelected(option)}
                        >
                            <span className="checkbox">
                                {selected === option ? "✔" : ""}
                            </span>
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
