import React, { useEffect, useRef } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";
import { handleGoogleRedirectOnce } from "@/auth/googleAuth";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

// The chrome gets its own boundaries (#378). The route boundary sits inside
// <main>, so a throw in the navbar - which reads auth state and the user's
// plan, and so has plenty to throw about - escaped past it and blanked the
// whole app. Now the page survives its own navigation bar.
function ChromeUnavailable() {
  return (
    <div
      role="alert"
      className="border-b border-[#fed7aa] bg-[#fff7ed] px-4 py-2.5 text-[0.9rem] text-[#7c2d12]"
    >
      The navigation bar didn&apos;t load. <a href="/">Go to home</a> to get it back.
    </div>
  );
}

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
    <div className="flex min-h-screen flex-col">
      <ErrorBoundary name="navbar" fallback={() => <ChromeUnavailable />}>
        <Navbar />
      </ErrorBoundary>
      <main className="flex-1">{children}</main>
      {/* A footer that fails is worth logging but not worth telling the user
          about - there is nothing in it they need to finish what they came
          for, and an alert about it would only be noise. */}
      <ErrorBoundary name="footer" fallback={() => null}>
        <Footer />
      </ErrorBoundary>
    </div>
  );
};

export default Layout;
