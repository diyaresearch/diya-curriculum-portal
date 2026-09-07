import React, { useState } from "react";
import ForTeachersSection from "./ForTeachersSection";
import ForStudentsSection from "./ForStudentsSection";


const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};

const modalStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "24px 32px",
  maxWidth: "900px",
  width: "95%",
  maxHeight: "80vh",
  overflowY: "auto",          // allow scroll if content is tall
  boxShadow: "0 18px 45px rgba(0,0,0,0.15)",
};

const AudienceModal = ({ type, onClose }) => {
  const isTeacher = type === "teacher";
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "1.2rem",
            float: "right",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        {isTeacher ? <ForTeachersSection /> : <ForStudentsSection />}
      </div>
    </div>
  );
};

const AudienceOverviewSection = () => {
  const [open, setOpen] = useState(null); // "teacher" | "student" | null

  return (
    <section
      style={{
        padding: "56px 10%",
        background: "#f5f7fb",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 8 }}>
        Who is this portal for?
      </h2>
      <p style={{ marginBottom: 32, color: "#555" }}>
        Explore what we offer for teachers and students.
      </p>

      <div
        style={{
          display: "flex",
          gap: 48,
          justifyContent: "center",
          flexWrap: "wrap",
          maxWidth: "1200px",
          margin: "40px auto 0", 
        }}
      >
        {/* Teachers card – navy + gold */}
        <div
          onClick={() => setOpen("teacher")}
          style={{
            flex: "1 1 260px",
            maxWidth: 500,
            minHeight: 280,
            borderRadius: 20,
            padding: 24,
            cursor: "pointer",
            color: "#ffffff",
            background:
              "linear-gradient(135deg,rgb(70, 156, 159) 0%,rgb(28, 124, 119) 100%)",
              //"linear-gradient(135deg,rgb(81, 224, 228) 0%,rgb(44, 160, 154) 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <h3 style={{ fontSize: "2.1rem", fontWeight: 700 }}>
              For Teachers
            </h3>
            <p style={{ marginTop: 8, fontSize: "1.28rem" }}>
              Planning tools
            </p>
            <p style={{ marginTop: 8, fontSize: "1.28rem" }}>
              Classroom management
            </p>
            <p style={{ marginTop: 8, fontSize: "1.28rem" }}>
              Ready-made modules.
            </p>
          </div>
          <span style={{ marginTop: 16, textAlign: "left" }}>
            Learn More →
          </span>
        </div>

        {/* Students card – blue + soft gold */}
        <div
          onClick={() => setOpen("student")}
          style={{
            flex: "1 1 260px",
            maxWidth: 500,
            minHeight: 280,
            borderRadius: 20,
            padding: 24,
            cursor: "pointer",
            color: "#000000",
            background:
              "linear-gradient(135deg,rgb(243, 230, 113) 0%, #ffd56b 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <h3 style={{ fontSize: "2.1rem", fontWeight: 700 }}>
              For Students
            </h3>
            <p style={{ marginTop: 8, fontSize: "1.28rem" }}>
              Interactive modules
            </p>
            <p style={{ marginTop: 8, fontSize: "1.28rem" }}>
              Projects
            </p>
            <p style={{ marginTop: 8, fontSize: "1.28rem" }}>
              Science fair ideas
            </p>
          </div>
          <span style={{ marginTop: 16, textAlign: "left" }}>
            Learn More →
          </span>
        </div>
      </div>

      {open && <AudienceModal type={open} onClose={() => setOpen(null)} />}
    </section>
  );
};

export default AudienceOverviewSection;

