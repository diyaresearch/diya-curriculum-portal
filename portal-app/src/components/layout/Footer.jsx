import React from "react";
import { Link } from "react-router-dom";

// Every link in the row is identical apart from its target (#360).
const FOOTER_LINK = "text-white no-underline";

const Footer = () => {
  return (
    <footer className="w-full bg-navy px-2.5 py-20 text-center font-sans text-base text-white">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <span>© 2023 DIYA Ed Portal</span>
        <Link to="/" className={FOOTER_LINK}>
          Home
        </Link>
        {/* "About" is about DIYA the organisation, and that page is on the
            organisation's own site - /about never existed here (#442). */}
        <a
          href={import.meta.env.VITE_DIYA_BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={FOOTER_LINK}
        >
          About
        </a>
        <a
          href="https://twitter.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={FOOTER_LINK}
        >
          Twitter
        </a>
        <a
          href="https://facebook.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={FOOTER_LINK}
        >
          Facebook
        </a>
        <a
          href="https://instagram.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={FOOTER_LINK}
        >
          Instagram
        </a>
      </div>
    </footer>
  );
};

export default Footer;
