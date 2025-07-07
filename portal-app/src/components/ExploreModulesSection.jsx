import React, { useRef, useState, useEffect } from "react";
import aiExploreImg from "../assets/ChatGPT Image Jun 13, 2025, 02_04_24 PM.png";
import aiExploreImg2 from "../assets/ChatGPT Image Jun 13, 2025, 02_17_05 PM.png";
import aiExploreImg3 from "../assets/ChatGPT Image Jun 13, 2025, 02_25_51 PM.png";
import barchartImg from "../assets/barchart.png";
import laptopImg from "../assets/laptop.png";
import teacherImg from "../assets/teacher.png";
import physicsImg from "../assets/finphysics.png";
import textbooksImg from "../assets/textbooks.png";
import microscopeImg from "../assets/microscope.png";
import pencilImg from "../assets/finpencil.png";
import { getFirestore, collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import { db } from "../firebase/firebaseConfig";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Add this helper function near the top of your file, outside the ExploreModulesSection component:
function capitalizeWords(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Place these SVGs near the top of your file, outside the component:
const OpenLockIcon = (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <rect x="4" y="10" width="14" height="8" rx="2" stroke="#1a7f37" strokeWidth="2" fill="#e8f5e9" />
    <path d="M7 10V7a4 4 0 1 1 8 0" stroke="#1a7f37" strokeWidth="2" fill="none" />
    <circle cx="11" cy="14" r="1.2" fill="#1a7f37" />
    {/* Open lock: no vertical bar connecting the shackle to the body */}
  </svg>
);

const ClosedLockIcon = (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <rect x="4" y="10" width="14" height="8" rx="2" stroke="#a00" strokeWidth="2" fill="#ffe0e0" />
    <path d="M7 10V7a4 4 0 1 1 8 0v3" stroke="#a00" strokeWidth="2" fill="none" />
    <rect x="10" y="14" width="2" height="3" rx="1" fill="#a00" />
    <circle cx="11" cy="14" r="1.2" fill="#a00" />
  </svg>
);
// --- Sign Up Prompt Modal ---
const SignUpPrompt = ({ open, onClose, type }) => {
  if (!open) return null;
  const isTeacher = type === "teacher";
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.3)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 32, minWidth: 320,
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)", textAlign: "center", position: "relative"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 10, right: 16, background: "none", border: "none",
          fontSize: "1.5rem", cursor: "pointer", color: "#888"
        }}>×</button>
        <h3 style={{ marginBottom: 16 }}>
          {isTeacher ? "Sign Up for Teacher Account" : "Sign Up for Student Account"}
        </h3>
        <div style={{ marginBottom: 24 }}>
          Please sign up or log in to access this page.
        </div>
        <a href="/signup">
          <button style={{
            background: "#162040", color: "#fff", border: "none", borderRadius: 6,
            padding: "12px 32px", fontWeight: 600, fontSize: "1rem", cursor: "pointer"
          }}>
            {isTeacher ? "Sign Up as Teacher" : "Sign Up as Student"}
          </button>
        </a>
      </div>
    </div>
  );
};

// --- Custom Hook to get user and role from Firebase ---
function useUserRole() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    let unsubTeacher = null;
    let unsubStudent = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setRole(null);
      if (firebaseUser) {
        // Listen for changes in teachers doc
        unsubTeacher = onSnapshot(doc(db, "teachers", firebaseUser.uid), (teacherDoc) => {
          if (teacherDoc.exists()) {
            setRole(teacherDoc.data().role);
          } else {
            // If not a teacher, listen for student doc
            unsubStudent = onSnapshot(doc(db, "students", firebaseUser.uid), (studentDoc) => {
              if (studentDoc.exists()) {
                setRole(studentDoc.data().role);
              } else {
                setRole(null);
              }
            });
          }
        });
      }
    });

    return () => {
      unsubscribe();
      if (unsubTeacher) unsubTeacher();
      if (unsubStudent) unsubStudent();
    };
  }, []);

  return { user, role };
}

// --- SquareSection Component ---
const SquareSection = ({ title, description, buttonText, buttonLink, children }) => (
  <section
    style={{
      width: "100%",
      background: "#F6F8FA",
      padding: "60px 0 0 0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start"
    }}
  >
    <h2
      style={{
        fontSize: "2.5rem",
        fontWeight: "700",
        color: "#111",
        fontFamily: "Open Sans, sans-serif",
        textAlign: "center",
        margin: 0,
        letterSpacing: "1px"
      }}
    >
      {title}
    </h2>
    {description && (
      <p
        style={{
          marginTop: "18px",
          fontSize: "1.15rem",
          color: "#222",
          textAlign: "center",
          maxWidth: "600px",
          fontWeight: 500,
        }}
      >
        {description}
      </p>
    )}
    {buttonText && (
      <button
        style={{
          marginTop: "32px",
          background: "#162040",
          color: "#fff",
          border: "2px solid #162040",
          borderRadius: "6px",
          padding: "14px 48px",
          fontSize: "1.08rem",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background 0.2s, color 0.2s, border 0.2s",
          minWidth: "260px",
        }}
        onClick={() => window.location.href = buttonLink || "#"}
      >
        {buttonText}
      </button>
    )}
    {children}
  </section>
);

// --- TeacherRectangles with role check ---
const TeacherRectangles = () => {
  const { user, role } = useUserRole();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = (e) => {
    if (
      !user ||
      !["teacherDefault", "teacherPlus", "admin"].includes(role)
    ) {
      e.preventDefault();
      setShowPrompt(true);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "40px",
        marginTop: "48px",
        marginBottom: "32px",
        width: "100%",
        maxWidth: "1100px"
      }}
    >
      {/* Rectangle 1 */}
      <a href="/modules" style={{ textDecoration: "none" }} onClick={handleClick}>
        <div
          style={{
            background: "#f3f3f1",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0dfdb",
            width: "480px",
            minHeight: "160px",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <div style={{
            width: "90px",
            height: "90px",
            marginLeft: "32px",
            marginRight: "24px",
            borderRadius: "8px",
            background: "#e0dfdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img
              src={barchartImg}
              alt="Barchart"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Ready-to-use Modules
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Access a library of pre-built modules.
            </div>
          </div>
        </div>
      </a>
      {/* Rectangle 2 */}
      <a href="/lesson-plans" style={{ textDecoration: "none" }} onClick={handleClick}>
        <div
          style={{
            background: "#f3f3f1",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0dfdb",
            width: "480px",
            minHeight: "160px",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <div style={{
            width: "90px",
            height: "90px",
            marginLeft: "32px",
            marginRight: "24px",
            borderRadius: "8px",
            background: "#e0dfdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img
              src={laptopImg}
              alt="Laptop"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Lesson Plan Builder
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Create and customize your lesson plans.
            </div>
          </div>
        </div>
      </a>
      {/* Rectangle 3 */}
      <a href="/classroom-management" style={{ textDecoration: "none" }} onClick={handleClick}>
        <div
          style={{
            background: "#f3f3f1",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0dfdb",
            width: "480px",
            minHeight: "160px",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <div style={{
            width: "90px",
            height: "90px",
            marginLeft: "32px",
            marginRight: "24px",
            borderRadius: "8px",
            background: "#e0dfdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img
              src={teacherImg}
              alt="Teacher"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Classroom Management
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Control content visibility for students.
            </div>
          </div>
        </div>
      </a>
      {/* Rectangle 4 */}
      <a href="/community" style={{ textDecoration: "none" }} onClick={handleClick}>
        <div
          style={{
            background: "#f3f3f1",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0dfdb",
            width: "480px",
            minHeight: "160px",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <div style={{
            width: "90px",
            height: "90px",
            marginLeft: "32px",
            marginRight: "24px",
            borderRadius: "8px",
            background: "#e0dfdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img
              src={pencilImg}
              alt="Pencil"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Share with Community
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Make the lesson plan public to the community.
            </div>
          </div>
        </div>
      </a>
      <SignUpPrompt open={showPrompt} onClose={() => setShowPrompt(false)} type="teacher" />
    </div>
  );
};

// --- StudentRectangles with role check ---
const StudentRectangles = () => {
  const { user, role } = useUserRole();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = (e) => {
    if (
      !user ||
      !["student", "consumer"].includes(role)
    ) {
      e.preventDefault();
      setShowPrompt(true);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "nowrap",
        justifyContent: "center",
        gap: "40px",
        marginTop: "48px",
        marginBottom: "32px",
        width: "100%",
        maxWidth: "1100px"
      }}
    >
      {/* Rectangle 1 */}
      <a href="/learning-modules" style={{ textDecoration: "none" }} onClick={handleClick}>
        <div
          style={{
            background: "#f3f3f1",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0dfdb",
            width: "480px",
            minHeight: "160px",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <div style={{
            width: "90px",
            height: "90px",
            marginLeft: "32px",
            marginRight: "24px",
            borderRadius: "8px",
            background: "#e0dfdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img
              src={textbooksImg}
              alt="Textbooks"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Learning Modules
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Interactive content to enhance your understanding.
            </div>
          </div>
        </div>
      </a>
      {/* Rectangle 2 */}
      <a href="/project-ideas" style={{ textDecoration: "none" }} onClick={handleClick}>
        <div
          style={{
            background: "#f3f3f1",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e0dfdb",
            width: "480px",
            minHeight: "160px",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            cursor: "pointer"
          }}
        >
          <div style={{
            width: "90px",
            height: "90px",
            marginLeft: "32px",
            marginRight: "24px",
            borderRadius: "8px",
            background: "#e0dfdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img
              src={microscopeImg}
              alt="Microscope"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                display: "block"
              }}
            />
          </div>
          <div>
            <span style={{ fontWeight: "700", fontSize: "1.25rem", color: "#162040" }}>
              Project Ideas for Science Fair
            </span>
            <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
              Get inspired with creative project ideas.
            </div>
          </div>
        </div>
      </a>
      <SignUpPrompt open={showPrompt} onClose={() => setShowPrompt(false)} type="student" />
    </div>
  );
};


const PopupTestimonialCard = ({
  testimonial,
  open,
  onClick,
  onClose,
  forcePreview,
  onPopupPrev,
  onPopupNext,
  showPopupNav,
  isFirst,
  isLast
}) => {
  const previewText = forcePreview || testimonial.Text;

  // Only render the preview card if onClick is provided (carousel preview)
  if (!open && onClick) {
    return (
      <div
        onClick={onClick}
        style={{
          background: "#f3f3f1",
          borderRadius: "10px",
          padding: "24px 28px",
          maxWidth: "260px",
          minWidth: "220px",
          minHeight: "250px",
          height: "300px",
          boxSizing: "border-box",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          border: "1px solid #e0dfdb",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: "pointer",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            color: "#222",
            fontSize: "1.05rem",
            marginBottom: "12px",
            flex: 1,
            overflow: "hidden",
            lineHeight: 1.5,
            maxHeight: "200px",
            minHeight: "60px",
            transition: "opacity 0.2s"
          }}
        >
          {`“${previewText}”`}
        </div>
        <div style={{
          color: "#111",
          fontSize: "0.98rem",
          fontWeight: "600",
          marginTop: "8px"
        }}>
          – {testimonial.Name}
        </div>
      </div>
    );
  }

  // Only render the popup if open
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.3)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "14px",
          padding: "32px 36px 24px 36px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxHeight: "80vh",         // <-- Add this
          overflowY: "auto"          // <-- And this
        }}
      >
        {/* Popup navigation arrows at the top, but lower so they don't cover the exit button */}
        {showPopupNav && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "absolute",
            top: 40, // Slightly higher than before (was 54)
            left: 0,
            right: 0,
            width: "100%",
            padding: "0 16px",
            zIndex: 2
          }}>
            <button
              onClick={onPopupPrev}
              disabled={isFirst}
              style={{
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: "50%",
                width: 32,
                height: 32,
                fontSize: "1.3rem",
                color: "#162040",
                cursor: isFirst ? "not-allowed" : "pointer",
                opacity: isFirst ? 0.4 : 1,
                transition: "opacity 0.2s"
              }}
              aria-label="Previous testimonial"
            >
              &#8592;
            </button>
            <button
              onClick={onPopupNext}
              disabled={isLast}
              style={{
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: "50%",
                width: 32,
                height: 32,
                fontSize: "1.3rem",
                color: "#162040",
                cursor: isLast ? "not-allowed" : "pointer",
                opacity: isLast ? 0.4 : 1,
                transition: "opacity 0.2s"
              }}
              aria-label="Next testimonial"
            >
              &#8594;
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 18,
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "#888",
            zIndex: 3
          }}
          aria-label="Close"
        >
          ×
        </button>
        <div style={{ color: "#222", fontSize: "1.08rem", marginBottom: "18px", marginTop: showPopupNav ? "38px" : "0", textAlign: "center" }}>
          {`“${testimonial.Text}”`}
        </div>
        <div style={{ color: "#111", fontSize: "1rem", fontWeight: 600, textAlign: "center" }}>
          – {testimonial.Name}
        </div>
      </div>
    </div>
  );
};

// In TestimonialsCarousel, pass popup navigation handlers and state
const TestimonialsCarousel = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [startIndex, setStartIndex] = useState(0);

  // Fetch testimonials from Firestore on mount
  useEffect(() => {
    const fetchTestimonials = async () => {
      const db = getFirestore(firebaseApp);
      const querySnapshot = await getDocs(collection(db, "testimonials"));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Sort: Teachers first, then others
      data.sort((a, b) => {
        const roleA = (a.Role || a.role || "").toLowerCase();
        const roleB = (b.Role || b.role || "").toLowerCase();
        if (roleA === "teacher" && roleB !== "teacher") return -1;
        if (roleA !== "teacher" && roleB === "teacher") return 1;
        return 0;
      });
      setTestimonials(data);
    };
    fetchTestimonials();
  }, []);

  // Show 2 testimonials at a time
  const testimonialsPerPage = 2;
  const maxIndex = Math.max(0, testimonials.length - testimonialsPerPage);

  const handlePrev = () => setStartIndex(i => (i > 0 ? Math.max(0, i - testimonialsPerPage) : i));
  const handleNext = () => setStartIndex(i => (i < maxIndex ? Math.min(maxIndex, i + testimonialsPerPage) : i));

  const visibleTestimonials = testimonials.slice(startIndex, startIndex + testimonialsPerPage);

  // Optionally, you can generate previews if you want to keep the preview logic
  const previews = visibleTestimonials.map(t =>
    t.Text.length > 120 ? t.Text.slice(0, 120) + "..." : t.Text
  );

  // Popup navigation handlers
  const handlePopupPrev = () => {
    if (openIndex > 0) setOpenIndex(openIndex - 1);
  };
  const handlePopupNext = () => {
    if (openIndex < testimonials.length - 1) setOpenIndex(openIndex + 1);
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      minWidth: 0,
      marginLeft: "40px",
      gap: "24px"
    }}>
      <button
        onClick={handlePrev}
        disabled={startIndex === 0}
        style={{
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "50%",
          width: 36,
          height: 36,
          marginRight: 12,
          fontSize: "1.5rem",
          color: "#162040",
          cursor: startIndex === 0 ? "not-allowed" : "pointer",
          opacity: startIndex === 0 ? 0.4 : 1,
          transition: "opacity 0.2s"
        }}
        aria-label="Previous testimonials"
      >
        &#8592;
      </button>
      {/* Only render preview cards for visibleTestimonials */}
      {visibleTestimonials.map((testimonial, idx) => {
        const globalIdx = startIndex + idx;
        return (
          <PopupTestimonialCard
            key={testimonial.id || globalIdx}
            testimonial={testimonial}
            open={false}
            onClick={() => setOpenIndex(globalIdx)}
            forcePreview={previews[idx]}
          />
        );
      })}
      <button
        onClick={handleNext}
        disabled={startIndex >= maxIndex}
        style={{
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "50%",
          width: 36,
          height: 36,
          marginLeft: 12,
          fontSize: "1.5rem",
          color: "#162040",
          cursor: startIndex >= maxIndex ? "not-allowed" : "pointer",
          opacity: startIndex >= maxIndex ? 0.4 : 1,
          transition: "opacity 0.2s"
        }}
        aria-label="Next testimonials"
      >
        &#8594;
      </button>

      {/* Popups for all testimonials, only one is open at a time */}
      {testimonials.map((testimonial, idx) => (
        <PopupTestimonialCard
          key={testimonial.id || idx}
          testimonial={testimonial}
          open={openIndex === idx}
          onClose={() => setOpenIndex(null)}
          onPopupPrev={handlePopupPrev}
          onPopupNext={handlePopupNext}
          showPopupNav={openIndex !== null}
          isFirst={openIndex === 0}
          isLast={openIndex === testimonials.length - 1}
        />
      ))}
    </div>
  );
};

function ModuleLoginPrompt({ open, onClose, moduleTitle, summary }) {
  if (!open) return null;

  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // After login, go to homepage ("/") so the dashboard logic runs
      window.location.href = "/";
    } catch (error) {
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.3)", zIndex: 3000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 32, minWidth: 100, maxWidth: 400, width: "90%",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)", textAlign: "center", position: "relative"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 10, right: 16, background: "none", border: "none",
          fontSize: "1.5rem", cursor: "pointer", color: "#888"
        }}>×</button>
        <div style={{ fontWeight: "700", fontSize: "1.4rem", marginBottom: 16 }}>
          {moduleTitle}
        </div>
        <div style={{ marginBottom: 24, fontSize: "1.05rem", color: "#222" }}>
          {summary}
        </div>
        <div style={{ marginBottom: 24, fontWeight: 500 }}>
          Sign up or login to see more!
        </div>
        <button
          onClick={handleGoogleLogin}
          style={{
            background: "#162040", color: "#fff", border: "none", borderRadius: 6,
            padding: "12px 32px", fontWeight: 600, fontSize: "1rem", cursor: "pointer"
          }}
        >
          Login with Google
        </button>
      </div>
    </div>
  );
}

const MODULE_CONTENT_TYPES = ["Module", "Lesson Plan", "Nuggets"];
const MODULE_CATEGORIES = [
  "All",
  "Python for AI",
  "AI Insights",
  "AI Forge",
  "Physics & AI",
  "Chemistry"
];
const MODULE_LEVELS = ["All", "Basic", "Intermediate", "Advanced"];

// Add this constant outside the component, near the top of the file:
const MODULE_POPUP_INFO = [
  {
    key: "ai-exploration",
    title: "AI Exploration",
    summary:
      "Dive into the basics of Artificial Intelligence. This module introduces students to foundational AI concepts, real-world applications, and hands-on activities. Perfect for beginners, it builds curiosity and critical thinking about how AI shapes our world and daily life.",
  },
  {
    key: "ai-insights",
    title: "AI Insights",
    summary:
      "Explore deeper into AI with practical examples and interactive lessons. This module covers data, algorithms, and ethical considerations, helping learners understand how AI systems are built and used. Ideal for those ready to move beyond the basics.",
  },
  {
    key: "ai-physics",
    title: "AI & Physics",
    summary:
      "Discover the intersection of Artificial Intelligence and Physics. This module demonstrates how AI can solve physics problems, analyze data, and simulate experiments, making science learning more engaging and insightful for students.",
  },
];

const CARD_IMAGES = [
  aiExploreImg,
  aiExploreImg2,
  aiExploreImg3,
  barchartImg,
  laptopImg,
  teacherImg,
  physicsImg,
  textbooksImg,
  microscopeImg,
  pencilImg,
];

const ExploreModulesSection = () => {
  const { user, role } = useUserRole();
  const navigate = useNavigate();
  const isTeacherDefault = role === "teacherDefault";
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupModule, setPopupModule] = useState(null);
  // Filter state
  const [contentType, setContentType] = useState("All");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");
  const [keyword, setKeyword] = useState("");
  const [lockStatus, setLockStatus] = useState("All");

  // Data state
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [nuggets, setNuggets] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Pagination state - dynamic based on window size
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // Will be calculated dynamically

  // Update items per page based on screen size - flexible rows
  useEffect(() => {
    const updateItemsPerPage = () => {
      const screenWidth = window.innerWidth;
      let itemsPerRow, maxRows;

      if (screenWidth >= 1200) {
        itemsPerRow = 4; // 4 items per row on large screens
        maxRows = 3; // Up to 3 rows
      } else if (screenWidth >= 900) {
        itemsPerRow = 3; // 3 items per row on medium-large screens
        maxRows = 3; // Up to 3 rows
      } else if (screenWidth >= 600) {
        itemsPerRow = 2; // 2 items per row on medium screens
        maxRows = 4; // Up to 4 rows
      } else {
        itemsPerRow = 1; // 1 item per row on small screens
        maxRows = 6; // Up to 6 rows
      }

      setItemsPerPage(itemsPerRow * maxRows);
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);

    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredItems, itemsPerPage]);



  // Fetch all data on mount
  useEffect(() => {
    const db = getFirestore(firebaseApp);

    // Fetch modules
    getDocs(collection(db, "module")).then(snapshot => {
      setModules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _type: "Module" })));
    });

    // Fetch lessons
    getDocs(collection(db, "lesson")).then(snapshot => {
      setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _type: "Lesson Plan" })));
    });

    // Fetch nuggets/content
    getDocs(collection(db, "content")).then(snapshot => {
      setNuggets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _type: "Nuggets" })));
    });
  }, []);

  useEffect(() => {
    // Show all cards by default when data is loaded and no filters have been applied
    if (!filtersApplied && (modules.length > 0 || lessons.length > 0 || nuggets.length > 0)) {
      setFilteredItems([...modules, ...lessons, ...nuggets]);
    }
    // eslint-disable-next-line
  }, [modules, lessons, nuggets, filtersApplied]);

  // Filtering logic, only runs when Apply Filters is clicked
  const handleApplyFilters = () => {
    let items = [];
    if (contentType === "All") {
      items = [
        ...modules,
        ...lessons,
        ...nuggets,
      ];
    } else if (contentType === "Module") {
      items = modules;
    } else if (contentType === "Lesson Plan") {
      items = lessons;
    } else if (contentType === "Nuggets") {
      items = nuggets;
    }

    // Filter by category if not "All"
    if (category !== "All") {
      items = items.filter(item =>
        ((item.category || item.Category || "").toLowerCase() === category.toLowerCase())
      );
    }

    // Filter by level if not "All"
    if (level !== "All") {
      items = items.filter(item =>
        ((item.level || item.Level || "").toLowerCase() === level.toLowerCase())
      );
    }

    // Filter by keyword if not empty
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      items = items.filter(item =>
        (item.title || item.Title || "").toLowerCase().includes(kw)
      );
    }

    // Filter by lock status if not "All" (only for teacherDefault)
    if (isTeacherDefault && lockStatus !== "All") {
      items = items.filter(item => {
        const isLocked = (item.role || item.Role) === "teacherPlus";
        return lockStatus === "Locked" ? isLocked : !isLocked;
      });
    }

    setFilteredItems(items);
    setFiltersApplied(true);
  };

  // Reset filters and filtered results
  const handleResetFilters = () => {
    setContentType("All");
    setCategory("All");
    setLevel("All");
    setKeyword("");
    setLockStatus("All");
    setFilteredItems([]);
    setFiltersApplied(false);
  };

  // Add this UpgradePrompt component near the top of your file (outside ExploreModulesSection):

  function UpgradePrompt({ open, onClose }) {
    if (!open) return null;
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.3)", zIndex: 4000,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          background: "#fff", borderRadius: 12, padding: 32, minWidth: 100, maxWidth: 400, width: "90%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)", textAlign: "center", position: "relative"
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 10, right: 16, background: "none", border: "none",
            fontSize: "1.5rem", cursor: "pointer", color: "#888"
          }}>×</button>
          <div style={{ fontWeight: "700", fontSize: "1.4rem", marginBottom: 16 }}>
            Upgrade Required
          </div>
          <div style={{ marginBottom: 24, fontSize: "1.05rem", color: "#222" }}>
            You need to upgrade to Teacher Plus to access this course.
          </div>
          <button
            onClick={() => window.location.href = "/upgrade"}
            style={{
              background: "#162040", color: "#fff", border: "none", borderRadius: 6,
              padding: "12px 32px", fontWeight: 600, fontSize: "1rem", cursor: "pointer"
            }}
          >
            Go to Upgrade Page
          </button>
        </div>
      </div>
    );
  }

  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);

  return (
    <div
      style={{
        width: "100%",
        background: "#F6F8FA",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "40px"
      }}
    >
      <section
        style={{
          width: "100%",
          padding: "100px 0 0 0",
          minHeight: "700px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start"
        }}
      >
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "#111",
            fontFamily: "Open Sans, sans-serif",
            textAlign: "center",
            margin: 0,
            letterSpacing: "1px"
          }}
        >
          Featured Modules
        </h2>
        <p
          style={{
            marginTop: "18px",
            fontSize: "1.15rem",
            color: "#222",
            textAlign: "center",
            maxWidth: "600px",
            fontWeight: 500,
          }}
        >
          Explore the latest modules available for your class.
        </p>

        {/* Three square subsections */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "40px",
            marginTop: "60px",
            width: "100%",
            maxWidth: "1100px"
          }}
        >
          {/* First subsection */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              width: "340px",
              height: "340px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              overflow: "hidden",
              padding: 0,
              cursor: "pointer"
            }}
            onClick={() => {
              if (!user) {
                setPopupModule(MODULE_POPUP_INFO[0]);
                setPopupOpen(true);
              } else if (["teacherDefault", "student", "admin"].includes(role)) {
                navigate("/modules/ai-exploration");
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Go to AI Exploration"
            onKeyPress={e => {
              if (e.key === "Enter" || e.key === " ") {
                if (
                  user &&
                  ["teacherDefault", "student", "admin"].includes(role)
                ) {
                  navigate("/modules/ai-exploration");
                }
              }
            }}
          >
            <div style={{
              width: "100%",
              height: "calc(100% - 90px)",
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center"
            }}>
              <img
                src={aiExploreImg}
                alt="AI Exploration"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block"
                }}
              />
            </div>
            <div style={{
              width: "100%",
              height: "90px",
              padding: "18px 0 0 0",
              textAlign: "center",
              background: "#fff"
            }}>
              <span
                style={{
                  display: "block",
                  fontWeight: "600",
                  fontSize: "1.15rem",
                  color: "#162040",
                  letterSpacing: "1px"
                }}
              >
                Basics
              </span>
              <span
                style={{
                  display: "block",
                  fontWeight: "700",
                  fontSize: "1.35rem",
                  color: "#222",
                  marginTop: "8px",
                  textAlign: "center"
                }}
              >
                AI Exploration
              </span>
            </div>
          </div>
          {/* Second subsection */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              width: "340px",
              height: "340px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              overflow: "hidden",
              cursor: "pointer"
            }}
            onClick={() => {
              if (!user) {
                setPopupModule(MODULE_POPUP_INFO[1]);
                setPopupOpen(true);
              } else if (["teacherDefault", "student", "admin"].includes(role)) {
                navigate("/modules/ai-insights");
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Go to AI Insights"
            onKeyPress={e => { if (e.key === "Enter" || e.key === " ") { if (user) navigate("/modules/ai-insights"); else navigate("/login"); } }}
          >
            <div style={{
              width: "100%",
              height: "calc(100% - 90px)",
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center"
            }}>
              <img
                src={aiExploreImg2}
                alt="AI Insights"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block"
                }}
              />
            </div>
            <div style={{ width: "100%", height: "90px", padding: "18px 0 0 0", textAlign: "center", background: "#fff" }}>
              <span
                style={{
                  display: "block",
                  fontWeight: "600",
                  fontSize: "1.15rem",
                  color: "#162040",
                  letterSpacing: "1px"
                }}
              >
                Intermediary
              </span>
              <span
                style={{
                  display: "block",
                  fontWeight: "700",
                  fontSize: "1.35rem",
                  color: "#222",
                  marginTop: "8px",
                  textAlign: "center"
                }}
              >
                AI Insights
              </span>
            </div>
          </div>
          {/* Third subsection */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              width: "340px",
              height: "340px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              overflow: "hidden",
              cursor: "pointer"
            }}
            onClick={() => {
              if (!user) {
                setPopupModule(MODULE_POPUP_INFO[2]);
                setPopupOpen(true);
              } else if (["teacherDefault", "student", "admin"].includes(role)) {
                navigate("/modules/ai-physics");
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Go to AI & Physics"
            onKeyPress={e => { if (e.key === "Enter" || e.key === " ") { if (user) navigate("/modules/ai-physics"); else navigate("/login"); } }}
          >
            <div style={{
              width: "100%",
              height: "calc(100% - 90px)",
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center"
            }}>
              <img
                src={physicsImg}
                alt="AI & Physics"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block"
                }}
              />
            </div>
            <div style={{ width: "100%", height: "90px", padding: "18px 0 0 0", textAlign: "center", background: "#fff" }}>
              <span
                style={{
                  display: "block",
                  fontWeight: "600",
                  fontSize: "1.15rem",
                  color: "#162040",
                  letterSpacing: "1px"
                }}
              >
                Basic
              </span>
              <span
                style={{
                  display: "block",
                  fontWeight: "700",
                  fontSize: "1.35rem",
                  color: "#222",
                  marginTop: "8px",
                  textAlign: "center"
                }}
              >
                AI & Physics
              </span>
            </div>
          </div>
          <ModuleLoginPrompt
            open={popupOpen}
            onClose={() => setPopupOpen(false)}
            moduleTitle={popupModule?.title}
            summary={popupModule?.summary}
          />
        </div>

        {/* --- Filter and Search Section for teacherDefault --- */}
        {isTeacherDefault && (
          <>
            <div style={{ height: "100px" }} />
            <h2
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                color: "#111",
                fontFamily: "Open Sans, sans-serif",
                textAlign: "center",
                margin: 0,
                letterSpacing: "1px"
              }}
            >
              Filter and Search
            </h2>
            <p
              style={{
                marginTop: "18px",
                fontSize: "1.15rem",
                color: "#222",
                textAlign: "center",
                maxWidth: "600px",
                fontWeight: 500,
                marginBottom: 24
              }}
            >
              Select your preferences to filter available modules.
            </p>
            <div style={{
              display: "flex",
              gap: "32px",
              flexWrap: "wrap",
              marginBottom: "18px"
            }}>
              {/* Content Type Filter */}
              <div>
                <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>Content Type</label>
                <select
                  value={contentType}
                  onChange={e => setContentType(e.target.value)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    fontSize: "1rem"
                  }}
                >
                  {["All", ...MODULE_CONTENT_TYPES].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {/* Category Filter */}
              <div>
                <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    fontSize: "1rem"
                  }}
                >
                  {MODULE_CATEGORIES.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {/* Level Filter */}
              <div>
                <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>Level</label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    fontSize: "1rem"
                  }}
                >
                  {MODULE_LEVELS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {/* Lock Status Filter */}
              <div>
                <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>Lock Status</label>
                <select
                  value={lockStatus}
                  onChange={e => setLockStatus(e.target.value)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    fontSize: "1rem"
                  }}
                >
                  <option value="All">All</option>
                  <option value="Unlocked">Unlocked</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>
            </div>
            {/* Keyword Filter */}
            <div style={{ marginBottom: "18px", width: "100%", maxWidth: 400 }}>
              <label style={{ fontWeight: "600", color: "#162040", marginRight: 8 }}>
                Keyword
              </label>
              <input
                type="text"
                value={keyword || ""}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Type a keyword to search..."
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #bbb",
                  fontSize: "1rem",
                  marginTop: 8
                }}
              />
            </div>
            {/* Filter Actions */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  padding: "8px 28px",
                  borderRadius: 6,
                  border: "1px solid #bbb",
                  background: "#fff",
                  color: "#222",
                  fontWeight: "600",
                  fontSize: "1rem",
                  cursor: "pointer"
                }}
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                style={{
                  padding: "8px 28px",
                  borderRadius: 6,
                  border: "none",
                  background: "#162040",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "1rem",
                  cursor: "pointer"
                }}
              >
                Apply Filters
              </button>
            </div>
            <div
              style={{
                width: "100%",
                minHeight: "60px",
                background: "#f6f8fa",
                borderRadius: "8px",
                border: "1px dashed #bbb",
                display: "flex",
                flexWrap: "wrap",
                gap: "40px",
                padding: "40px",
                justifyContent: "center",
                alignItems: "start",
                color: "#888",
                fontSize: "1.05rem",
                fontStyle: "italic",
                marginBottom: "16px",
                boxSizing: "border-box"
              }}
            >
              {paginatedItems.length === 0 ? (
                <div style={{ width: "100%", textAlign: "center" }}>
                  No modules found.
                </div>
              ) : (
                paginatedItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      aspectRatio: "1 / 1",
                      width: "100%",
                      maxWidth: "300px",
                      minWidth: "260px",
                      background: "#fff",
                      borderRadius: "24px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      border: "1px solid #e0dfdb",
                      padding: "32px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "flex-start",
                      transition: "box-shadow 0.2s",
                      textAlign: "left",
                      overflow: "hidden",
                      cursor: "default",
                      flex: "0 0 auto"
                    }}
                  >
                    <div style={{
                      fontWeight: "700",
                      fontSize: "1.35rem",
                      color: "#162040",
                      marginBottom: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%"
                    }}>
                      {item.title || item.Title}
                    </div>
                    <div style={{ color: "#555", fontSize: "1.15rem", marginBottom: 8 }}>
                      Level: {capitalizeWords(item.level || item.Level || "N/A")}
                    </div>
                    <div style={{ color: "#888", fontSize: "1.1rem" }}>
                      Type: {capitalizeWords(item._type || "")}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "32px" }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "10px 28px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    background: currentPage === 1 ? "#eee" : "#fff",
                    color: "#222",
                    fontWeight: "600",
                    fontSize: "1rem",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer"
                  }}
                >
                  Back
                </button>
                <span style={{ alignSelf: "center", fontWeight: "600", color: "#162040" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "10px 28px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    background: currentPage === totalPages ? "#eee" : "#fff",
                    color: "#222",
                    fontWeight: "600",
                    fontSize: "1rem",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer"
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Only show For Teachers if NOT a student and NOT teacherDefault */}
      {!isTeacherDefault && (!role || !["student", "consumer"].includes(role)) && (
        <div style={{ width: "100%", marginTop: "-40px" }}>
          <SquareSection
            title="For Teachers"
            description="Unlock powerful tools to enhance your teaching."
            buttonText="Learn More"
            buttonLink="/teachers"
          >
            <TeacherRectangles />
          </SquareSection>
        </div>
      )}

      {/* Only show For Students if NOT a teacher */}
      {(!role || !["teacherDefault", "teacherPlus", "admin"].includes(role)) && (
        <div style={{ width: "100%" }}>
          <SquareSection
            title="For Students"
            description="Discover engaging content tailored for your learning."
            buttonText="Browse Content"
            buttonLink="/students"
          >
            <StudentRectangles />
          </SquareSection>
        </div>
      )}

      {/* Add spacing between For Students and Reviews section */}
      <div style={{ height: "60px" }} />

      {/* Only show Testimonials if NOT teacherDefault */}
      {!isTeacherDefault && (
        <section
          style={{
            width: "100%",
            background: "#F6F8FA",
            padding: "0",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "80px",
            maxWidth: "1100px",
            margin: "0 auto 60px auto"
          }}
        >
          {/* Left: Title and Description */}
          <div style={{
            flex: "0 0 260px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "16px",
            maxWidth: "100%"
          }}>
            <h2 style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#162040",
              marginBottom: "18px",
              textAlign: "center",
              fontFamily: "Open Sans, sans-serif",
              letterSpacing: "1px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              Testimonials
            </h2>
            <p
              style={{
                fontSize: "1.15rem",
                color: "#222",
                maxWidth: "1000px",
                lineHeight: 1.6,
                margin: 0,
                textAlign: "center"
              }}
            >
              Discover how our platform has transformed the teaching and learning experience for educators and students alike.
            </p>
          </div>

          {/* Right: Testimonials Carousel */}
          <div style={{ flex: "1 1 300px", position: "relative", width: "100%" }}>
            <TestimonialsCarousel />
          </div>
        </section>
      )}
      <UpgradePrompt open={upgradePromptOpen} onClose={() => setUpgradePromptOpen(false)} />
    </div>
  );
};

export default ExploreModulesSection;

