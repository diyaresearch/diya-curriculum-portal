import React from "react";
import UploadContent from "./upload-content"; // adjust path if needed

const NuggetBuilderPage = (props) => (
  <div
    style={{
      minHeight: "100vh",
      background: "#F6F8FA",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "40px",
      paddingBottom: "64px",
      fontFamily: "Open Sans, sans-serif",
      position: "relative"
    }}
  >
    {/* X button fixed to top right of popup/modal */}
    <button
      onClick={props.onCancel}
      style={{
        position: "fixed",
        top: 32,
        right: 32,
        background: "none",
        border: "none",
        fontSize: "2.2rem",
        color: "#888",
        cursor: "pointer",
        zIndex: 2000,
        fontWeight: 700,
        lineHeight: 1,
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)"
      }}
      aria-label="Close"
      type="button"
    >
      &times;
    </button>
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginTop: "40px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            background: "#fff",
            borderRadius: "18px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e0dfdb",
            padding: "40px 32px",
            minWidth: "320px"
          }}
        >
          <UploadContent
            title="Nugget Builder"
            fromLesson={props.onCancel}
            onNuggetCreated={props.onSave}
          />
        </div>
      </div>
    </div>
  </div>
);

export default NuggetBuilderPage;