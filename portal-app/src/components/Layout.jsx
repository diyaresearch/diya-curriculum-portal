import React, { useEffect, useRef } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";
import { handleGoogleRedirectOnce } from "../auth/googleAuth";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const didHandleRedirectRef = useRef(false);

  useEffect(() => {
    if (didHandleRedirectRef.current) return;
    didHandleRedirectRef.current = true;

    (async () => {
      try {
        await handleGoogleRedirectOnce(navigate);
      } catch (err) {
        console.error("Layout: redirect handling failed", err);
      }
    })();
  }, [navigate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
