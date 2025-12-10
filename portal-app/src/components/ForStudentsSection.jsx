import React, { useState, useEffect } from "react";
import textbooksImg from "../assets/textbooks.png";
import microscopeImg from "../assets/microscope.png";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// --- Sign Up Prompt Modal ---
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
        <a href="/signup">
          <button style={{
            background: "#162040", color: "#fff", border: "none", borderRadius: 6,
            padding: "12px 32px", fontWeight: 600, fontSize: "1rem", cursor: "pointer"
          }}>
            {isTeacher ? "Sign Up as Teacher" : "Sign Up as Student"}
          </button>
        </a>
      </div>
    </div>
  );
};

// --- Custom Hook to get user and role from Firebase ---
function useUserRole() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    let unsubTeacher = null;
    let unsubStudent = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setRole(null);
      if (firebaseUser) {
        // Listen for changes in teachers doc
        unsubTeacher = onSnapshot(doc(db, "teachers", firebaseUser.uid), (teacherDoc) => {
          if (teacherDoc.exists()) {
            setRole(teacherDoc.data().role);
          } else {
            // If not a teacher, listen for student doc
            unsubStudent = onSnapshot(doc(db, "students", firebaseUser.uid), (studentDoc) => {
              if (studentDoc.exists()) {
                setRole(studentDoc.data().role);
              } else {
                setRole(null);
              }
            });
          }
        });
      }
    });

    return () => {
      unsubscribe();
      if (unsubTeacher) unsubTeacher();
      if (unsubStudent) unsubStudent();
    };
  }, []);

  return { user, role };
}

// --- SquareSection Component ---
const SquareSection = ({ title, description, buttonText, buttonLink, children }) => (
  <section
    style={{
      width: "100%",
      background: "#FFFFFF",
      padding: "60px 0 60px 0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start"
    }}
  >
    <h2
      style={{
        fontSize: "2.5rem",
        fontWeight: "700",
        color: "#111",
        fontFamily: "Open Sans, sans-serif",
        textAlign: "center",
        margin: 0,
        letterSpacing: "1px"
      }}
    >
      {title}
    </h2>
    {description && (
      <p
        style={{
          marginTop: "18px",
          fontSize: "1.15rem",
          color: "#222",
          textAlign: "center",
          maxWidth: "600px",
          fontWeight: 500,
        }}
      >
        {description}
      </p>
    )}
    {buttonText && (
      <button
        style={{
          marginTop: "32px",
          background: "#162040",
          color: "#fff",
          border: "2px solid #162040",
          borderRadius: "6px",
          padding: "14px 48px",
          fontSize: "1.08rem",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background 0.2s, color 0.2s, border 0.2s",
          minWidth: "260px",
        }}
        onClick={() => window.location.href = buttonLink || "#"}
      >
        {buttonText}
      </button>
    )}
    {children}
  </section>
);

// --- StudentRectangles with role check ---
const StudentRectangles = () => {
  const { user, role } = useUserRole();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = (e) => {
    if (
      !user ||
      !["student", "consumer"].includes(role)
    ) {
      e.preventDefault();
      setShowPrompt(true);
    }
  };

  return (
    <div
    style={{
      display: "flex",
      flexDirection: "column",     // stack vertically
      alignItems: "center",
      gap: "32px",
      marginTop: "48px",
      marginBottom: "32px",
      width: "100%",
      maxWidth: "600px",
      marginInline: "auto",
    }}
    >
      {/* Rectangle 1 */}
      <a href="/learning-modules" style={{ textDecoration: "none" }} onClick={handleClick}>
        <div
          style={{
            background: "#f3f3f1",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0dfdb",
            width: "480px",
            minHeight: "160px",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <div style={{
            width: "90px",
            height: "90px",
            marginLeft: "32px",
            marginRight: "24px",
            borderRadius: "8px",
            background: "#e0dfdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img
              src={textbooksImg}
              alt="Textbooks"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Learning Modules
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Interactive content to enhance your understanding.
            </div>
          </div>
        </div>
      </a>
      {/* Rectangle 2 */}
      <a href="/project-ideas" style={{ textDecoration: "none" }} onClick={handleClick}>
        <div
          style={{
            background: "#f3f3f1",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0dfdb",
            width: "480px",
            minHeight: "160px",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <div style={{
            width: "90px",
            height: "90px",
            marginLeft: "32px",
            marginRight: "24px",
            borderRadius: "8px",
            background: "#e0dfdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img
              src={microscopeImg}
              alt="Microscope"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Project Ideas for Science Fair
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Get inspired with creative project ideas.
            </div>
          </div>
        </div>
      </a>
      <SignUpPrompt open={showPrompt} onClose={() => setShowPrompt(false)} type="student" />
    </div>
  );
};

const ForStudentsSection = () => {
  const { role } = useUserRole();

  // Only show For Students if NOT a teacher
  if (!role || !["teacherDefault", "teacherPlus", "admin"].includes(role)) {
    return (
      <div style={{ width: "100%" }}>
        <SquareSection
          title="For Students"
          description="Discover engaging content tailored for your learning."
        >
          <StudentRectangles />
        </SquareSection>
      </div>
    );
  }

  return null;
};

export default ForStudentsSection;