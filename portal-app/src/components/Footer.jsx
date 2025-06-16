import React from "react";

const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: "#1f2937",
        width: "100%",
        color: "white",
        textAlign: "center",
        padding: "80px 10px", // Even thicker footer
        fontFamily: "Open Sans, sans-serif",
        fontSize: "16px",
      }}
    >
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "24px"
      }}>
        <span>© 2023 DIYA Ed Portal</span>
        <a href="/" style={{ color: "#fff", textDecoration: "none" }}>Home</a>
        <a href="/about" style={{ color: "#fff", textDecoration: "none" }}>About</a>
        <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none" }}>Twitter</a>
        <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none" }}>Facebook</a>
        <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none" }}>Instagram</a>
      </div>
    </footer>
  );
};

export default Footer;