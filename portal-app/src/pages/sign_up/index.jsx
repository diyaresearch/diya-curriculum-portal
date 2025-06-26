
import React, { useState, useRef, useEffect } from "react";

const SUBJECT_OPTIONS = [
  "CS",
  "AI & DS",
  "Math",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
];

const GRADE_OPTIONS = ["5 or lower", "6–8", "9–12"];

function MultiSelectDropdown({ options, selected, setSelected, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close dropdown on outside click
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
        tabIndex={0}
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
              className={`multi-select-option${
                selected.includes(option) ? " selected" : ""
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

export function TeacherSignup() {
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);

  return (
    <div className="teacher-signup-page">
      <div className="signup-hero">
        <h1>Sign Up as a Teacher</h1>
        <p>
          Join our platform to access AI and Data Science resources for your classrooms.
        </p>
        <div className="auth-buttons">
          <button>Already have an account? Log in</button>
        </div>
      </div>
      <div className="form-barrier">
        <main className="teacher-form-section">
          <div className="form-left">
            <h2>Teacher Profile Information</h2>
            <p>Please fill in the following information to create your teacher profile.</p>
          </div>
          <form className="form-right">
            <label>Full Name</label>
            <input type="text" placeholder="Enter your full name" />

            <label>Email</label>
            <input type="email" placeholder="Your email" />

            <label>School or Organization Name</label>
            <input type="text" placeholder="Enter your school or organization" />

            <label>What Subjects do you teach?</label>
            <MultiSelectDropdown
              options={SUBJECT_OPTIONS}
              selected={subjects}
              setSelected={setSubjects}
              label="Subjects"
            />

            <label>What Grade level do you teach?</label>
            <MultiSelectDropdown
              options={GRADE_OPTIONS}
              selected={grades}
              setSelected={setGrades}
              label="Grade Levels"
            />

            <div className="confirm">
              <input type="checkbox" />
              <label>I confirm that I am a teacher</label>
            </div>

            <button type="submit" className="register-btn">
              Register
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}


function SingleSelectDropdown({ options, selected, setSelected, label }) {
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
        tabIndex={0}
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
              onClick={() => setSelected(option)} // <-- DO NOT close dropdown here!
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

  return (
    <div className="multi-select" ref={ref}>
      <div
        className={`multi-select-label${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        tabIndex={0}
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
              onClick={() => {
                setSelected(option);
                setOpen(false);
              }}
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

export function StudentSignup() {
  const [grade, setGrade] = useState("");

  return (
    <div className="teacher-signup-page">
      <div className="signup-hero">
        <h1>Sign Up as a Student</h1>
        <p>
          Join our platform to access AI and Data Science resources. Connect with
          your teacher's class or learn on your own.
        </p>
        <div className="auth-buttons">
          <button>Already have an account? Log in</button>
        </div>
      </div>
      <div className="form-barrier">
        <main className="teacher-form-section">
          <div className="form-left">
            <h2>Student Profile Information</h2>
            <p>Please fill in the following information to create your student profile.</p>
          </div>
          <form className="form-right">
            <label>Full Name</label>
            <input type="text" placeholder="Enter your full name" />

            <label>Email</label>
            <input type="email" placeholder="Your email" />

            <label>Grade Level</label>
            <SingleSelectDropdown
              options={["6th", "7th", "8th", "9th", "10th", "11th", "12th"]}
              selected={grade}
              setSelected={setGrade}
              label="Grade Level"
            />
            <div className="confirm">
              <input type="checkbox" />
              <label>I confirm that I am a student</label>
            </div>

            <button type="submit" className="register-btn">Register</button>
          </form>
        </main>
      </div>
    </div>
  );
}