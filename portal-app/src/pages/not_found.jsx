import React from "react";
import { Link, useLocation } from "react-router-dom";
import { TYPO } from "@/constants/typography";

/**
 * Catch-all route target (issue #421).
 *
 * Before this existed an unmatched path rendered an empty <main>, which was
 * indistinguishable from the blank page caused by the broken asset paths. A
 * real 404 makes a routing mistake obvious instead of looking like an outage.
 */
const NotFound = () => {
  const { pathname } = useLocation();

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <h1 style={{ ...TYPO.pageTitle, marginBottom: "16px" }}>Page not found</h1>

      <p style={{ ...TYPO.pageSubtitle, maxWidth: "480px", marginBottom: "8px" }}>
        We couldn't find a page at <code>{pathname}</code>.
      </p>
      <p style={{ ...TYPO.pageSubtitle, maxWidth: "480px", marginBottom: "32px" }}>
        The link may be out of date, or the address may have a typo.
      </p>

      <Link
        to="/"
        className="bg-ink-strong text-white py-3 px-7 rounded-lg no-underline font-sans font-semibold"
      >
        Back to home
      </Link>
    </div>
  );
};

export default NotFound;
