import React, { useState } from "react";
import { Link } from "react-router-dom";
import barchartImg from "../assets/barchart.png";
import laptopImg from "../assets/laptop.png";
import teacherImg from "../assets/teacher.png";
import pencilImg from "../assets/finpencil.png";
import useUserRole from "../hooks/useUserRole";
import SignUpPrompt from "./SignUpPrompt";

// --- SquareSection Component ---
const SquareSection = ({ title, description, buttonText, buttonLink, children }) => (
  <section
    style={{
      width: "100%",
      background: "#F6F8FA",
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

// --- TeacherRectangles with role check ---
const TeacherRectangles = () => {
  const { user, role } = useUserRole();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = (e) => {
    if (
      !user ||
      !["teacherDefault", "teacherPlus", "admin"].includes(role)
    ) {
      e.preventDefault();
      setShowPrompt(true);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "40px",
        marginTop: "48px",
        marginBottom: "32px",
        width: "100%",
        maxWidth: "1100px"
      }}
    >
      {/* Rectangle 1 */}
      <Link to="/modules" style={{ textDecoration: "none" }} onClick={handleClick}>
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
              src={barchartImg}
              alt="Barchart"
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
              Ready-to-use Modules
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Access a library of pre-built modules.
            </div>
          </div>
        </div>
      </Link>
      {/* Rectangle 2 */}
      <Link to="/lesson-plans" style={{ textDecoration: "none" }} onClick={handleClick}>
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
              src={laptopImg}
              alt="Laptop"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Lesson Plan Builder
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Create and customize your lesson plans.
            </div>
          </div>
        </div>
      </Link>
      {/* Rectangle 3 */}
      <Link to="/classroom-management" style={{ textDecoration: "none" }} onClick={handleClick}>
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
              src={teacherImg}
              alt="Teacher"
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
              Classroom Management
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Control content visibility for students.
            </div>
          </div>
        </div>
      </Link>
      {/* Rectangle 4 */}
      <Link to="/community" style={{ textDecoration: "none" }} onClick={handleClick}>
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
              src={pencilImg}
              alt="Pencil"
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
              Share with Community
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Make the lesson plan public to the community.
            </div>
          </div>
        </div>
      </Link>
      <SignUpPrompt open={showPrompt} onClose={() => setShowPrompt(false)} type="teacher" />
    </div>
  );
};

const ForTeachersSection = () => {
  const { role } = useUserRole();
  const isTeacherDefault = role === "teacherDefault";

  // Only show For Teachers if NOT a student and NOT teacherDefault
  if (!isTeacherDefault && (!role || !["studentDefault", "consumer"].includes(role))) {
    return (
      <div style={{ width: "100%" }}>
        <SquareSection
          title="For Teachers"
          description="Unlock powerful tools to enhance your teaching."
        >
          <TeacherRectangles />
        </SquareSection>
      </div>
    );
  }

  return null;
};

export default ForTeachersSection;