import React, { useState, useEffect } from "react";
import { getFirestore, collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import { db } from "../firebase/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
          {`"${previewText}"`}
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
          maxHeight: "80vh",
          overflowY: "auto"
        }}
      >
        {/* Popup navigation arrows at the top, but lower so they don't cover the exit button */}
        {showPopupNav && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "absolute",
            top: 40,
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
          {`"${testimonial.Text}"`}
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

const TestimonialsSection = () => {
  const { role } = useUserRole();
  const isTeacherDefault = role === "teacherDefault";

  // Only show Testimonials if NOT teacherDefault
  if (!isTeacherDefault) {
    return (
      <div style={{ width: "100%" }}>
        <section
          style={{
            width: "100%",
            background: "#FFFFFF",
            padding: "60px 0 60px 0",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "80px",
            maxWidth: "1100px",
            margin: "0 auto"
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
      </div>
    );
  }

  return null;
};

export default TestimonialsSection;