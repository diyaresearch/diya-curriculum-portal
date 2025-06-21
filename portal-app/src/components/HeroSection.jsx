import React from "react";
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate(); // <-- put this here inside component function body

  return (
    <section
      style={{
        width: "100%",
        minHeight: "520px",
        background: "#162040",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 0"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h1
          style={{
            color: "#fff",
            fontSize: "2.5rem",
            fontWeight: "700",
            fontFamily: "Open Sans, sans-serif",
            textAlign: "center",
            letterSpacing: "1.2px",
            margin: 0,
            lineHeight: "1.2"
          }}
        >
          Empower the Future with AI &amp; Data Science
        </h1>
        <p
          style={{
            color: "#fff",
            fontSize: "1.15rem",
            fontWeight: "400",
            fontFamily: "Open Sans, sans-serif",
            textAlign: "center",
            marginTop: "28px",
            lineHeight: "1.6"
          }}
        >
          Unlock potential through hands-on learning experiences for K12 educators and students.
        </p>
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "40px"
          }}
        >
          <button
            style={{
              background: "#FFC940",
              color: "#000",
              border: "1px solid #fff", // Thinner border
              borderRadius: "6px",
              padding: "14px 32px",
              fontSize: "1.08rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s, border 0.2s",
            }}
            onClick={() => navigate("/student-signup")}
          >
            Sign Up as Student
          </button>
          
          <button
            style={{
              background: "#FFC940",
              color: "#000",
              border: "1px solid #fff", // Thinner border
              borderRadius: "6px",
              padding: "14px 32px",
              fontSize: "1.08rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s, border 0.2s",
            }}
            onClick={() => navigate("/teacher-signup")}
          >
            Sign Up as Teacher
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
