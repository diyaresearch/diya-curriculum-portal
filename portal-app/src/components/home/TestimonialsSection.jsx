import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { CAROUSEL_CONFIG } from "@/constants/testimonialData";
import { COLLECTIONS } from "@/firebase/collectionNames";
import useUserRole from "@/hooks/useUserRole";
import useSafeTimeout from "@/hooks/useSafeTimeout";
import { ROLES } from "@/constants/roles";
import Modal from "@/components/ui/Modal";

const { LAYOUT } = CAROUSEL_CONFIG;

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

/**
 * A testimonial's avatar, or a placeholder when there is no usable image.
 *
 * The preview card and the detail dialog rendered this twice, identical apart
 * from two sizes (#411). Both copies also swapped in the placeholder by
 * reaching through the DOM from onError - `e.target.nextSibling.style.display`
 * - which mutates nodes React owns and breaks the moment the markup shifts.
 * The fallback is state now.
 */
const ProfileImage = ({ src, alt, size = LAYOUT.AVATAR_SIZE }) => {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        backgroundColor: "#e9ecef",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}
    >
      {showPlaceholder ? (
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${size / 40}rem`,
            color: "#6c757d",
            backgroundColor: "#f1f3f4"
          }}
        >
          👤
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          // Avatars sit below the fold on most screens and are never the thing
          // a visitor is waiting for, so they must not compete with the page.
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
    </div>
  );
};

/** Name, role and institution, shared by the preview card and the dialog. */
const TestimonialAttribution = ({ testimonial, align = "left", scale = 1 }) => (
  <div style={{ textAlign: align, flex: align === "left" ? 1 : undefined }}>
    <div style={{
      color: "#162040",
      fontSize: `${1 * scale}rem`,
      fontWeight: 600,
      lineHeight: 1.2
    }}>
      {testimonial.Name}
    </div>
    {testimonial.Role && (
      <div style={{
        fontSize: `${0.9 * scale}rem`,
        fontWeight: "400",
        color: "#6c757d",
        marginTop: "2px"
      }}>
        {testimonial.Role}
      </div>
    )}
    {testimonial.institutionName && (
      <div style={{
        fontSize: `${0.85 * scale}rem`,
        fontWeight: "500",
        color: "#4a90e2",
        marginTop: "2px"
      }}>
        {testimonial.institutionName}
      </div>
    )}
  </div>
);

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

        // A <div onClick> here was unreachable by keyboard and announced as
        // nothing at all (#411).
        return (
          <button
            key={dotIndex}
            type="button"
            onClick={() => onDotClick(dotIndex)}
            aria-label={`Go to testimonial ${dotIndex + 1} of ${total}`}
            aria-current={isActive ? "true" : undefined}
            style={{
              width: isActive ? "12px" : "8px",
              height: isActive ? "12px" : "8px",
              padding: 0,
              border: "none",
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

/** The card shown in the carousel frame. Opens the full text when activated. */
const TestimonialPreviewCard = ({ testimonial, onClick }) => {
  const { truncated, isTruncated } = truncateToLines(testimonial.Text);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#f8f9fa",
        borderRadius: "16px",
        padding: "32px",
        width: "100%",
        height: "100%",
        maxWidth: `${LAYOUT.CARD_WIDTH}px`,
        minWidth: `${LAYOUT.CARD_MIN_WIDTH}px`,
        minHeight: `${LAYOUT.CARD_MIN_HEIGHT}px`,
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
        font: "inherit",
        textAlign: "center",
        transition: "all 0.3s ease"
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
          maxHeight: `${LAYOUT.CARD_TEXT_MAX_HEIGHT}px`,
          minHeight: `${LAYOUT.CARD_TEXT_MIN_HEIGHT}px`,
          textAlign: "center",
          fontStyle: "italic",
          padding: "0 16px",
          position: "relative"
        }}
      >
        &quot;{truncated}&quot;
        {isTruncated && (
          <span style={{
            color: "#4a90e2",
            fontSize: "0.9rem",
            fontStyle: "normal",
            fontWeight: "500",
            marginLeft: "8px",
            display: "block",
            marginTop: "8px"
          }}>
            ... Click to read more
          </span>
        )}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        marginTop: "auto"
      }}>
        <ProfileImage
          src={testimonial.profileImage}
          alt={`${testimonial.Name} profile`}
          size={LAYOUT.AVATAR_SIZE}
        />
        <TestimonialAttribution testimonial={testimonial} align="left" />
      </div>
    </button>
  );
};

/**
 * The full testimonial, in the app's shared dialog.
 *
 * This used to be a hand-rolled fixed-position overlay with its own "x" - one
 * of the nine #373 set out to remove. It had no focus trap, no Escape, and no
 * dialog role, so a screen reader was never told anything had opened (#411).
 */
const TestimonialDetail = ({ testimonial, open, onClose, onPrev, onNext, isFirst, isLast }) => {
  if (!testimonial) return null;

  const arrowStyle = (disabled) => ({
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "50%",
    width: LAYOUT.DETAIL_ARROW_SIZE,
    height: LAYOUT.DETAIL_ARROW_SIZE,
    fontSize: "1.3rem",
    color: "#162040",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "opacity 0.2s"
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="medium"
      contentLabel={`Testimonial from ${testimonial.Name}`}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: "8px",
          paddingRight: "36px"
        }}>
          <button
            type="button"
            onClick={onPrev}
            disabled={isFirst}
            style={arrowStyle(isFirst)}
            aria-label="Previous testimonial"
          >
            &#8592;
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={isLast}
            style={arrowStyle(isLast)}
            aria-label="Next testimonial"
          >
            &#8594;
          </button>
        </div>

        <ProfileImage
          src={testimonial.profileImage}
          alt={`${testimonial.Name} profile`}
          size={LAYOUT.DETAIL_AVATAR_SIZE}
        />

        <div style={{
          color: "#343a40",
          fontSize: "1.1rem",
          margin: "24px 0 20px",
          textAlign: "center",
          lineHeight: 1.6,
          fontStyle: "italic"
        }}>
          &quot;{testimonial.Text}&quot;
        </div>

        <TestimonialAttribution testimonial={testimonial} align="center" scale={1.1} />
      </div>
    </Modal>
  );
};

// In TestimonialsCarousel, pass popup navigation handlers and state
// `testimonials` is loaded by the parent TestimonialsSection, which also
// decides whether to render this component at all (#433 — this used to fetch
// its own data and fall back to fabricated sample testimonials whenever
// Firestore returned zero real ones).
const TestimonialsCarousel = ({ testimonials }) => {
  // Carousel transition timers must not fire into an unmounted component (#374).
  const setSafeTimeout = useSafeTimeout();
  const [openIndex, setOpenIndex] = useState(null);
  const [startIndex, setStartIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // Bumped by every deliberate navigation. Restarting the interval is the
  // whole point: the handlers used to clearInterval and leave it cleared, and
  // because the effect's dependencies had not changed nothing ever started it
  // again - so one click on an arrow or a dot killed auto-advance for good
  // (the arrows sit outside the hover region, so no pause/resume cycle came
  // along to revive it). Counting interactions restarts the clock instead,
  // which is also what a viewer who just navigated expects (#411).
  const [interactionCount, setInteractionCount] = useState(0);

  const timerRef = useRef(null);
  const isOpen = openIndex !== null;

  // Auto-advance. Deliberately does not depend on startIndex: advancing must
  // not itself restart the interval, or every tick would reset the clock.
  useEffect(() => {
    if (testimonials.length === 0 || isPaused || isOpen) {
      return undefined;
    }

    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setStartIndex(prevIndex => (prevIndex + 1 >= testimonials.length ? 0 : prevIndex + 1));
      setSafeTimeout(() => setIsTransitioning(false), CAROUSEL_CONFIG.TRANSITION_DURATION);
    }, CAROUSEL_CONFIG.AUTO_ADVANCE_INTERVAL);

    return () => {
      clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [testimonials.length, isPaused, isOpen, interactionCount, setSafeTimeout]);

  // Show 1 testimonial at a time
  const testimonialsPerPage = 1;

  /**
   * Move the carousel, restarting the auto-advance clock. `next` is whatever
   * setStartIndex accepts - an index, or an updater for the wrapping cases.
   */
  const goTo = useCallback((next) => {
    setIsTransitioning(true);
    setStartIndex(next);
    setInteractionCount(count => count + 1);
    setSafeTimeout(() => setIsTransitioning(false), CAROUSEL_CONFIG.TRANSITION_DURATION);
  }, [setSafeTimeout]);

  const handlePrev = () => {
    if (isTransitioning) return;
    goTo(prevIndex => (prevIndex - 1 < 0 ? testimonials.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    if (isTransitioning) return;
    goTo(prevIndex => (prevIndex + 1 >= testimonials.length ? 0 : prevIndex + 1));
  };

  const handleDotClick = (index) => {
    if (isTransitioning || index === startIndex) return;
    goTo(index);
  };

  const visibleTestimonials = useMemo(
    () => testimonials.slice(startIndex, startIndex + testimonialsPerPage),
    [testimonials, startIndex]
  );

  // Popup navigation handlers
  const handlePopupPrev = () => {
    if (openIndex > 0) setOpenIndex(openIndex - 1);
  };
  const handlePopupNext = () => {
    if (openIndex < testimonials.length - 1) setOpenIndex(openIndex + 1);
  };

  // Pause/resume. onFocus and onBlur bubble, so tabbing into the carousel
  // stops the rotation the same way hovering does - without that, a keyboard
  // user has no way at all to stop moving content (WCAG 2.2.2).
  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);

  const arrowStyle = (side) => ({
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: "50%",
    width: LAYOUT.ARROW_SIZE,
    height: LAYOUT.ARROW_SIZE,
    [side === "left" ? "marginRight" : "marginLeft"]: 12,
    fontSize: "1.5rem",
    color: "#162040",
    cursor: "pointer",
    opacity: 1,
    transition: "opacity 0.2s",
    zIndex: 10
  });

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Testimonials"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 0,
        marginLeft: "40px",
        gap: "24px"
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px"
      }}>
        <button
          type="button"
          onClick={handlePrev}
          style={arrowStyle("left")}
          aria-label="Previous testimonial"
        >
          &#8592;
        </button>
        {/* Testimonial container with fade animation and hover functionality */}
        <div
          // While the carousel is rotating on its own, announcing each slide
          // would interrupt whatever the visitor is actually reading. Paused,
          // the change was asked for, so it is worth announcing (APG).
          aria-live={isPaused ? "polite" : "off"}
          aria-atomic="true"
          style={{
            position: "relative",
            width: `${LAYOUT.CARD_WIDTH}px`,
            height: `${LAYOUT.CARD_HEIGHT}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {visibleTestimonials.map((testimonial, idx) => {
            const globalIdx = startIndex + idx;
            return (
              <div
                key={testimonial.id || globalIdx}
                role="group"
                aria-roledescription="slide"
                aria-label={`${globalIdx + 1} of ${testimonials.length}`}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  opacity: isTransitioning ? 0 : 1,
                  transform: `translateX(${isTransitioning ? '20px' : '0px'})`,
                  transition: "opacity 0.3s ease, transform 0.3s ease"
                }}
              >
                <TestimonialPreviewCard
                  testimonial={testimonial}
                  onClick={() => setOpenIndex(globalIdx)}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNext}
          style={arrowStyle("right")}
          aria-label="Next testimonial"
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

      {/* One dialog for whichever testimonial is open, rather than a mounted
          modal per testimonial. */}
      <TestimonialDetail
        testimonial={isOpen ? testimonials[openIndex] : null}
        open={isOpen}
        onClose={() => setOpenIndex(null)}
        onPrev={handlePopupPrev}
        onNext={handlePopupNext}
        isFirst={openIndex === 0}
        isLast={openIndex === testimonials.length - 1}
      />
    </div>
  );
};

const TestimonialsSection = () => {
  const { role } = useUserRole();
  const isTeacherDefault = role === ROLES.TEACHER_DEFAULT;

  const [testimonials, setTestimonials] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Fetch real testimonials from Firestore on mount. No fallback to sample
  // data: a fabricated testimonial ("Sarah Johnson, Lincoln Elementary
  // School") shown as real is worse than showing nothing (#433).
  useEffect(() => {
    let cancelled = false;
    const fetchTestimonials = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.testimonials));
        if (cancelled) return;
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

        setTestimonials(data);
      } catch (error) {
        console.error("Failed to load testimonials:", error);
        if (!cancelled) setTestimonials([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    fetchTestimonials();

    return () => {
      cancelled = true;
    };
  }, []);

  // Hide the whole section — heading included — until there is at least one
  // real testimonial to show. Rendering "Testimonials" over an empty carousel
  // would still read as a claim nothing backs up.
  if (isTeacherDefault || !loaded || testimonials.length === 0) {
    return null;
  }

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
          <TestimonialsCarousel testimonials={testimonials} />
        </div>
      </section>
    </div>
  );
};

export default TestimonialsSection;
