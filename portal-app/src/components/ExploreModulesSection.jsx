import React, { useRef, useState, useEffect } from "react";
import aiExploreImg from "../assets/ChatGPT Image Jun 13, 2025, 02_04_24 PM.png";
import aiExploreImg2 from "../assets/ChatGPT Image Jun 13, 2025, 02_17_05 PM.png"; // <-- Import your other image
import aiExploreImg3 from "../assets/ChatGPT Image Jun 13, 2025, 02_25_51 PM.png"; // <-- Import your new image
import barchartImg from "../assets/barchart.png"; // <-- Import your barchart image
import laptopImg from "../assets/laptop.png";
import teacherImg from "../assets/teacher.png";
import physicsImg from "../assets/finphysics.png"; // Add this import at the top
import textbooksImg from "../assets/textbooks.png";
import microscopeImg from "../assets/microscope.png";
import pencilImg from "../assets/finpencil.png"; // Add this import at the top
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import { db } from "../firebase/firebaseConfig";


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
          marginTop: "32px", // Match View All Modules button
          background: "#162040",
          color: "#fff",
          border: "2px solid #162040",
          borderRadius: "6px",
          padding: "14px 48px",
          fontSize: "1.08rem",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background 0.2s, color 0.2s, border 0.2s",
          minWidth: "260px", // Ensures same width as View All Modules
        }}
        onClick={() => window.location.href = buttonLink || "#"}
      >
        {buttonText}
      </button>
    )}
    {/* Custom children for extra content below button */}
    {children}
    {/* Only show the three-square grid for the main section and For Students (if no children) */}
    {(!description || title === "For Students") && !children && (
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
        {[1, 2, 3].map((_, idx) => (
          <div
            key={idx}
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              width: "300px",
              height: "300px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              overflow: "hidden"
            }}
          >
            {/* Space for image */}
            <div style={{ width: "100%", height: "60%" }} />
            <div style={{ width: "100%", padding: "18px 0 0 0", textAlign: "center" }}>
              <span
                style={{
                  display: "block",
                  fontWeight: "600",
                  fontSize: "1.15rem",
                  color: "#162040",
                  letterSpacing: "1px"
                }}
              >
                Title
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
                Subtitle
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

const TeacherRectangles = () => (
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
        alignItems: "center"
      }}
    >
      {/* Barchart image */}
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
        <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#162040" }}>
          Ready-to-use Modules
        </span>
        <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
          Access a library of pre-built modules.
        </div>
      </div>
    </div>
    {/* Rectangle 2 */}
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
        alignItems: "center"
      }}
    >
      {/* Laptop image */}
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
        <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#162040" }}>
          Lesson Plan Builder
        </span>
        <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
          Create and customize your lesson plans.
        </div>
      </div>
    </div>
    {/* Rectangle 3 */}
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
        alignItems: "center"
      }}
    >
      {/* Teacher image */}
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
        <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#162040" }}>
          Classroom Management
        </span>
        <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
          Control content visibility for students.
        </div>
      </div>
    </div>
    {/* Rectangle 4 */}
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
        alignItems: "center"
      }}
    >
      {/* Pencil image */}
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
        <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#162040" }}>
          Share with Community
        </span>
        <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
          Make the lesson plan public to the community.
        </div>
      </div>
    </div>
  </div>
);

const StudentRectangles = () => (
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
        alignItems: "center"
      }}
    >
      {/* Textbooks image */}
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
        <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#162040" }}>
          Learning Modules
        </span>
        <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
          Interactive content to enhance your understanding.
        </div>
      </div>
    </div>
    {/* Rectangle 2 */}
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
        alignItems: "center"
      }}
    >
      {/* Microscope image */}
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
        <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#162040" }}>
          Project Ideas for Science Fair
        </span>
        <div style={{ marginTop: "10px", color: "#222", fontSize: "1.08rem", maxWidth: "280px" }}>
          Get inspired with creative project ideas.
        </div>
      </div>
    </div>
  </div>
);


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
          // Remove any fixed height or minHeight here!
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
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

const ExploreModulesSection = () => {
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
          Explore Learning Modules
        </h2>
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
          }}
          onClick={() => window.location.href = "/modules"}
        >
          View All Modules
        </button>
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
          <div style={{
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
            padding: 0
          }}>
            {/* Image fills all except bottom text area */}
            <div style={{
              width: "100%",
              height: "calc(100% - 90px)", // Reserve 90px for the text area
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
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            width: "340px", // Match first subsection
            height: "340px", // Match first subsection
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            overflow: "hidden"
          }}>
            {/* Image fills all except bottom text area */}
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
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            width: "340px",
            height: "340px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            overflow: "hidden"
          }}>
            {/* Image fills all except bottom text area, just like the other subsections */}
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
                  objectFit: "cover", // Ensures the image covers the top area like the other subsections
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
        </div>
      </section>
      <div style={{ width: "100%", marginTop: "-40px" }}>
        {/* Negative margin removes extra space above For Teachers */}
        <SquareSection
          title="For Teachers"
          description="Unlock powerful tools to enhance your teaching."
          buttonText="Learn More"
          buttonLink="/teachers"
        >
          <TeacherRectangles />
        </SquareSection>
      </div>
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
      {/* Add spacing between For Students and Reviews section */}
      <div style={{ height: "60px" }} />
      {/* Testimonials Section */}
      <section
        style={{
          width: "100%",
          background: "#F6F8FA",
          padding: "0",
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: "80px", // Increase gap for more space between left and right
          maxWidth: "1100px",
          margin: "0 auto 60px auto"
        }}
      >
        {/* Left: Title and Description */}
        <div style={{
          flex: "0 0 260px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center", // <-- Center title and description horizontally
          justifyContent: "flex-start",
          minWidth: "220px",
          maxWidth: "300px",
          marginLeft: "-24px"
        }}>
          <h2 style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#162040",
            marginBottom: "18px",
            textAlign: "center", // <-- Center text
            fontFamily: "Open Sans, sans-serif",
            letterSpacing: "1px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
             Testimonials
          </h2>
          <div style={{
            color: "#222",
            fontSize: "1.15rem",
            fontWeight: 500,
            lineHeight: 1.5,
            textAlign: "center", // <-- Center text
            maxWidth: "600px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
            Hear from those who have experienced DIYA's impact.
          </div>
        </div>
        {/* Right: Testimonials Carousel */}
        <div style={{ marginRight: "-150px" }}>
          <TestimonialsCarousel />
        </div>
      </section>
    </div>
  );
};

export default ExploreModulesSection;