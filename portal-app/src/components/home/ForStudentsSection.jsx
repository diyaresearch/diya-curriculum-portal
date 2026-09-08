import React, { useState } from "react";
import textbooksImg from "@/assets/textbooks.png";
import microscopeImg from "@/assets/microscope.png";
import useUserRole from "@/hooks/useUserRole";
import SignUpPrompt from "@/components/ui/SignUpPrompt";
import { ROLES } from "@/constants/roles";

// --- SquareSection Component ---
// buttonText/buttonLink were never passed by any caller, and the button they
// rendered navigated with window.location.href (#442). Both removed.
const SquareSection = ({ title, description, children }) => (
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
      ![ROLES.STUDENT_DEFAULT, ROLES.CONSUMER].includes(role)
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
      <a href="#explore-modules" style={{ textDecoration: "none" }} onClick={handleClick}>
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
      <a href="#explore-modules" style={{ textDecoration: "none" }} onClick={handleClick}>
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
  if (!role || ![ROLES.TEACHER_DEFAULT, ROLES.TEACHER_PLUS, ROLES.ADMIN].includes(role)) {
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