import React from "react";
import { Link } from "react-router-dom";

// Prompts a signed-out visitor to sign up before continuing. Previously
// duplicated verbatim in ForTeachersSection.jsx and ForStudentsSection.jsx
// (#409).
const SignUpPrompt = ({ open, onClose, type }) => {
  if (!open) return null;
  const isTeacher = type === "teacher";
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.3)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 32, minWidth: 320,
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)", textAlign: "center", position: "relative"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 10, right: 16, background: "none", border: "none",
          fontSize: "1.5rem", cursor: "pointer", color: "#888"
        }}>×</button>
        <h3 style={{ marginBottom: 16 }}>
          {isTeacher ? "Sign Up for Teacher Account" : "Sign Up for Student Account"}
        </h3>
        <div style={{ marginBottom: 24 }}>
          Please sign up or log in to access this page.
        </div>
        <Link to={isTeacher ? "/teacher-signup" : "/student-signup"}>
          <button style={{
            background: "#162040", color: "#fff", border: "none", borderRadius: 6,
            padding: "12px 32px", fontWeight: 600, fontSize: "1rem", cursor: "pointer"
          }}>
            {isTeacher ? "Sign Up as Teacher" : "Sign Up as Student"}
          </button>
        </Link>
      </div>
    </div>
  );
};

export default SignUpPrompt;
