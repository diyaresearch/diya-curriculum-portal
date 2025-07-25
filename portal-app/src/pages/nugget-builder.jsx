import React from "react";
import UploadContent from "./upload-content"; // adjust path if needed

const NuggetBuilderPage = () => (
  <div
    style={{
      minHeight: "100vh",
      background: "#F6F8FA",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "40px",
      paddingBottom: "64px", // Add space below the section and the footer
      fontFamily: "Open Sans, sans-serif"
    }}
  >
    <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "2.8rem",
          fontWeight: 700,
          color: "#111",
          textAlign: "center",
          margin: 0,
          letterSpacing: "1px"
        }}
      >
        Nugget Builder
      </h1>
      <p
        style={{
          marginTop: "12px",
          fontSize: "1.18rem",
          color: "#222",
          textAlign: "center",
          maxWidth: "600px",
          fontWeight: 500,
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >
        Create and manage your nuggets of content easily.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "48px",
          marginTop: "40px",
          alignItems: "flex-start",
          justifyContent: "center"
        }}
      >
        {/* Left side: Nugget Info */}
        <div
          style={{
            flex: "0 0 260px",
            minWidth: "220px",
            maxWidth: "300px",
            padding: "32px 0 0 0"
          }}
        >
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#111",
              marginBottom: "16px"
            }}
          >
            Nugget Info
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              color: "#444",
              lineHeight: 1.6
            }}
          >
            Fill in the details for your new nugget.
          </p>
        </div>
        {/* Right side: UploadContent form */}
        <div
          style={{
            flex: "1 1 500px",
            maxWidth: "600px",
            background: "#fff",
            borderRadius: "18px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e0dfdb",
            padding: "40px 32px",
            minWidth: "320px"
          }}
        >
          <UploadContent title="Nugget Builder" />
        </div>
      </div>
    </div>
  </div>
);

export default NuggetBuilderPage;