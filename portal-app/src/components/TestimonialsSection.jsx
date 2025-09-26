import React, { useState, useEffect, useRef } from "react";
import { getFirestore, collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import { db } from "../firebase/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { CAROUSEL_CONFIG, SAMPLE_TESTIMONIALS } from "../constants/testimonialData";

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

// Helper function to truncate text to approximately 5 lines
const truncateToLines = (text, maxCharactersPerLine = CAROUSEL_CONFIG.TEXT_TRUNCATION.MAX_CHARS_PER_LINE, maxLines = CAROUSEL_CONFIG.TEXT_TRUNCATION.MAX_LINES) => {
  const maxLength = maxCharactersPerLine * maxLines;
  if (text.length <= maxLength) {
    return { truncated: text, isTruncated: false };
  }

  // Find a good place to cut off (preferably at word boundary)
  let cutOff = maxLength;
  while (cutOff > maxLength - 20 && text[cutOff] !== ' ') {
    cutOff--;
  }

  return {
    truncated: text.substring(0, cutOff).trim(),
    isTruncated: true
  };
};

// Dot Indicators Component
const DotIndicators = ({ total, current, onDotClick, maxDots = CAROUSEL_CONFIG.MAX_DOTS }) => {
  // Determine which dots to show (max 5)
  const showDots = Math.min(total, maxDots);
  const startDot = Math.max(0, Math.min(current - Math.floor(maxDots / 2), total - maxDots));

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "8px",
      marginTop: "20px"
    }}>
      {Array.from({ length: showDots }, (_, index) => {
        const dotIndex = startDot + index;
        const isActive = dotIndex === current;

        return (
          <div
            key={dotIndex}
            onClick={() => onDotClick(dotIndex)}
            style={{
              width: isActive ? "12px" : "8px",
              height: isActive ? "12px" : "8px",
              borderRadius: "50%",
              backgroundColor: isActive ? "#4a90e2" : "#d0d0d0",
              cursor: "pointer",
              transition: "all 0.3s ease",
              transform: isActive ? "scale(1.2)" : "scale(1)",
              opacity: isActive ? 1 : 0.6
            }}
          />
        );
      })}
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
  const textTruncation = truncateToLines(testimonial.Text);
  const previewText = forcePreview || textTruncation.truncated;

  // Only render the preview card if onClick is provided (carousel preview)
  if (!open && onClick) {
    return (
      <div
        onClick={onClick}
        style={{
          background: "#f8f9fa",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "520px",
          minWidth: "480px",
          minHeight: "280px",
          height: "320px",
          boxSizing: "border-box",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #e9ecef",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          position: "relative",
          zIndex: 1,
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        }}
      >
        <div
          style={{
            color: "#343a40",
            fontSize: "1.1rem",
            marginBottom: "24px",
            flex: 1,
            overflow: "hidden",
            lineHeight: 1.6,
            maxHeight: "160px",
            minHeight: "80px",
            textAlign: "center",
            fontStyle: "italic",
            padding: "0 16px",
            position: "relative"
          }}
        >
          "{previewText}"
          {textTruncation.isTruncated && (
            <span style={{
              color: "#4a90e2",
              fontSize: "0.9rem",
              fontStyle: "normal",
              fontWeight: "500",
              marginLeft: "8px",
              cursor: "pointer",
              display: "block",
              marginTop: "8px"
            }}>
              ... Click to read more
            </span>
          )}
        </div>

        {/* Profile Image and Name Section at Bottom */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          marginTop: "auto"
        }}>
          {/* Profile Image */}
          <div style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            backgroundColor: "#e9ecef",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            {testimonial.profileImage ? (
              <img
                src={testimonial.profileImage}
                alt={`${testimonial.Name} profile`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div style={{
              display: testimonial.profileImage ? "none" : "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              color: "#6c757d",
              backgroundColor: "#f1f3f4"
            }}>
              👤
            </div>
          </div>

          {/* Name and Institution */}
          <div style={{
            textAlign: "left",
            flex: 1
          }}>
            <div style={{
              color: "#162040",
              fontSize: "1rem",
              fontWeight: "600",
              lineHeight: 1.2
            }}>
              {testimonial.Name}
            </div>
            {testimonial.Role && (
              <div style={{
                fontSize: "0.9rem",
                fontWeight: "400",
                color: "#6c757d",
                marginTop: "2px"
              }}>
                {testimonial.Role}
              </div>
            )}
            {testimonial.institutionName && (
              <div style={{
                fontSize: "0.85rem",
                fontWeight: "500",
                color: "#4a90e2",
                marginTop: "2px"
              }}>
                {testimonial.institutionName}
              </div>
            )}
          </div>
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
          maxWidth: "600px",
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

        {/* Profile Image in Popup */}
        <div style={{
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          overflow: "hidden",
          marginBottom: "24px",
          marginTop: showPopupNav ? "48px" : "12px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          backgroundColor: "#e9ecef",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {testimonial.profileImage ? (
            <img
              src={testimonial.profileImage}
              alt={`${testimonial.Name} profile`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div style={{
            display: testimonial.profileImage ? "none" : "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            color: "#6c757d",
            backgroundColor: "#f1f3f4"
          }}>
            👤
          </div>
        </div>

        <div style={{ color: "#343a40", fontSize: "1.1rem", marginBottom: "20px", textAlign: "center", lineHeight: 1.6, fontStyle: "italic" }}>
          "{testimonial.Text}"
        </div>
        {/* Profile and Name Section in Popup */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          marginTop: "8px"
        }}>
          {/* Name and Institution Info */}
          <div style={{
            textAlign: "center"
          }}>
            <div style={{
              color: "#162040",
              fontSize: "1.1rem",
              fontWeight: 600,
              lineHeight: 1.2
            }}>
              {testimonial.Name}
            </div>
            {testimonial.Role && (
              <div style={{
                fontSize: "1rem",
                fontWeight: "400",
                color: "#6c757d",
                marginTop: "4px"
              }}>
                {testimonial.Role}
              </div>
            )}
            {testimonial.institutionName && (
              <div style={{
                fontSize: "0.95rem",
                fontWeight: "500",
                color: "#4a90e2",
                marginTop: "4px"
              }}>
                {testimonial.institutionName}
              </div>
            )}
          </div>
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Use ref for timer to prevent memory leaks
  const timerRef = useRef(null);

  // Fetch testimonials from Firestore on mount
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const db = getFirestore(firebaseApp);
        const querySnapshot = await getDocs(collection(db, "testimonials"));
        const data = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });

        // Sort: Teachers first, then others
        data.sort((a, b) => {
          // Use standardized Role field (supporting legacy lowercase for backwards compatibility)
          const roleA = (a.Role || a.role || "").toLowerCase();
          const roleB = (b.Role || b.role || "").toLowerCase();
          if (roleA === "teacher" && roleB !== "teacher") return -1;
          if (roleA !== "teacher" && roleB === "teacher") return 1;
          return 0;
        });

        // If no data from Firebase, use externalized sample data
        if (data.length === 0) {
          setTestimonials(SAMPLE_TESTIMONIALS);
        } else {
          setTestimonials(data);
        }
      } catch (error) {
        console.log("Firebase error, using sample testimonials:", error);
        // Use externalized sample data on Firebase error
        setTestimonials(SAMPLE_TESTIMONIALS);
      }
    };
    fetchTestimonials();
  }, []);

  // Auto-advance functionality with proper timer management
  useEffect(() => {
    // Clear existing timer to prevent memory leaks
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Don't start timer if conditions aren't met
    if (testimonials.length === 0 || isPaused || openIndex !== null) {
      return;
    }

    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setStartIndex(prevIndex => {
        const nextIndex = prevIndex + 1 >= testimonials.length ? 0 : prevIndex + 1;
        return nextIndex;
      });
      setTimeout(() => setIsTransitioning(false), CAROUSEL_CONFIG.TRANSITION_DURATION);
    }, CAROUSEL_CONFIG.AUTO_ADVANCE_INTERVAL);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [testimonials.length, isPaused, openIndex]); // Removed startIndex to prevent recreation on every advance

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Show 1 testimonial at a time
  const testimonialsPerPage = 1;
  const maxIndex = Math.max(0, testimonials.length - testimonialsPerPage);

  const handlePrev = () => {
    if (isTransitioning) return;

    // Clear existing timer to prevent interference with manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTransitioning(true);
    setStartIndex(prevIndex => {
      const newIndex = prevIndex - 1 < 0 ? testimonials.length - 1 : prevIndex - 1;
      return newIndex;
    });
    setTimeout(() => setIsTransitioning(false), CAROUSEL_CONFIG.TRANSITION_DURATION);
  };

  const handleNext = () => {
    if (isTransitioning) return;

    // Clear existing timer to prevent interference with manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTransitioning(true);
    setStartIndex(prevIndex => {
      const newIndex = prevIndex + 1 >= testimonials.length ? 0 : prevIndex + 1;
      return newIndex;
    });
    setTimeout(() => setIsTransitioning(false), CAROUSEL_CONFIG.TRANSITION_DURATION);
  };

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

  // Dot click handler
  const handleDotClick = (index) => {
    if (isTransitioning || index === startIndex) return;

    // Clear existing timer to prevent interference with manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsTransitioning(true);
    setStartIndex(index);
    setTimeout(() => setIsTransitioning(false), CAROUSEL_CONFIG.TRANSITION_DURATION);
  };

  // Hover handlers for pause/resume
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 0,
      marginLeft: "40px",
      gap: "24px"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px"
      }}>
        <button
          onClick={handlePrev}
          style={{
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "50%",
            width: 36,
            height: 36,
            marginRight: 12,
            fontSize: "1.5rem",
            color: "#162040",
            cursor: "pointer",
            opacity: 1,
            transition: "opacity 0.2s",
            zIndex: 10
          }}
          aria-label="Previous testimonials"
        >
          &#8592;
        </button>
        {/* Testimonial container with fade animation and hover functionality */}
        <div
          style={{
            position: "relative",
            width: "520px",
            height: "320px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {visibleTestimonials.map((testimonial, idx) => {
            const globalIdx = startIndex + idx;
            return (
              <div
                key={testimonial.id || globalIdx}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  opacity: isTransitioning ? 0 : 1,
                  transform: `translateX(${isTransitioning ? '20px' : '0px'})`,
                  transition: "opacity 0.3s ease, transform 0.3s ease"
                }}
              >
                <PopupTestimonialCard
                  testimonial={testimonial}
                  open={false}
                  onClick={() => setOpenIndex(globalIdx)}
                  forcePreview={previews[idx]}
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          style={{
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "50%",
            width: 36,
            height: 36,
            marginLeft: 12,
            fontSize: "1.5rem",
            color: "#162040",
            cursor: "pointer",
            opacity: 1,
            transition: "opacity 0.2s",
            zIndex: 10
          }}
          aria-label="Next testimonials"
        >
          &#8594;
        </button>
      </div>

      {/* Dot Indicators */}
      <DotIndicators
        total={testimonials.length}
        current={startIndex}
        onDotClick={handleDotClick}
        maxDots={CAROUSEL_CONFIG.MAX_DOTS}
      />

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