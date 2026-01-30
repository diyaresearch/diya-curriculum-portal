import React from "react";
import { TYPO } from "../constants/typography";

const SectionCard = ({ title, children, style, titleStyle }) => {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "22px 24px",
        background: "#fff",
        marginTop: 22,
        ...style,
      }}
    >
      {title ? (
        <div style={{ ...TYPO.sectionTitle, color: "#222", marginBottom: 10, ...titleStyle }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
};

export default SectionCard;

