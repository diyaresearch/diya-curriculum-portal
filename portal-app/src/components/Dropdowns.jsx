import React, { useState, useRef, useEffect } from "react";

export function MultiSelectDropdown({ options, selected, setSelected, label }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const toggleOption = (option) => {
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

export function SingleSelectDropdown({ options, selected, setSelected, label }) {
    const [open, setOpen] = useState(false);
    const ref = useRef();

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
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