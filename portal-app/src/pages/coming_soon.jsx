import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TYPO } from "@/constants/typography";

/**
 * Honest destination for a link whose feature is not built yet (#442).
 *
 * Classroom Management and Community are advertised on the home page and in the
 * TeacherPlus dashboard but have no implementation. Those links pointed at
 * routes that did not exist, so they rendered a blank page, and later a 404 -
 * which reads as "this is broken" rather than "this is not built yet".
 *
 * `?feature=` names what the reader clicked, so one page serves all of them.
 */
const ComingSoon = () => {
  const [params] = useSearchParams();
  const feature = params.get("feature");

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ ...TYPO.pageTitle, marginBottom: "16px" }}>
        {feature ? `${feature} is coming soon` : "Coming soon"}
      </h1>

      <p style={{ ...TYPO.pageSubtitle, maxWidth: "480px", marginBottom: "32px" }}>
        We're still building this one. Everything else in the portal is ready for
        you in the meantime.
      </p>

      <Link
        to="/"
        style={{
          background: "#111",
          color: "#fff",
          padding: "12px 28px",
          borderRadius: "8px",
          textDecoration: "none",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
        }}
      >
        Back to home
      </Link>
    </div>
  );
};

export default ComingSoon;
