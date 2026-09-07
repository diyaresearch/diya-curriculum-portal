import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: "#162040", // Navy blue to match hero section
        width: "100%",
        color: "white",
        textAlign: "center",
        padding: "80px 10px",
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
        <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Home</Link>
        <Link to="/about" style={{ color: "#fff", textDecoration: "none" }}>About</Link>
        <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none" }}>Twitter</a>
        <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none" }}>Facebook</a>
        <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none" }}>Instagram</a>
      </div>
    </footer>
  );
};

export default Footer;