import React, { useRef, useState } from "react";
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

const reviews = [
  {
    stars: "⭐⭐⭐⭐⭐",
    text: "“The modules are so interactive and easy to follow. I learned a lot!”",
    author: "– Ananya, Grade 8"
  },
  {
    stars: "⭐⭐⭐⭐⭐",
    text: "“I love the project ideas. They helped me win my science fair!”",
    author: "– Rahul, Grade 7"
  },
  {
    stars: "⭐⭐⭐⭐⭐",
    text: "“Great for revision before exams. Highly recommend to friends!”",
    author: "– Priya, Grade 9"
  },
  {
    stars: "⭐⭐⭐⭐⭐",
    text: "“The lesson plans are so easy to use and adapt for my class.”",
    author: "– Mrs. Sharma, Teacher"
  },
  {
    stars: "⭐⭐⭐⭐⭐",
    text: "“I never thought learning AI could be this much fun!”",
    author: "– Karan, Grade 6"
  }
];

const ReviewsCarousel = () => {
  const [startIndex, setStartIndex] = useState(0);
  const reviewsPerPage = 4;
  const maxIndex = reviews.length - reviewsPerPage;

  const handlePrev = () => setStartIndex(i => (i > 0 ? i - 2 : i));
  const handleNext = () => setStartIndex(i => (i < maxIndex ? i + 2 : i));

  // Show 4 reviews at a time, 2 per row
  const visibleReviews = reviews.slice(startIndex, startIndex + reviewsPerPage);

  return (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      minWidth: 0,
      marginLeft: "40px" // Add this line to move carousel more to the right
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
          marginRight: 16,
          fontSize: "1.5rem",
          color: "#162040",
          cursor: startIndex === 0 ? "not-allowed" : "pointer",
          opacity: startIndex === 0 ? 0.4 : 1,
          transition: "opacity 0.2s"
        }}
        aria-label="Previous reviews"
      >
        &#8592;
      </button>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gridTemplateRows: "repeat(2, 1fr)",
          gap: "24px",
          minWidth: 0
        }}
      >
        {visibleReviews.map((review, idx) => (
          <div
            key={startIndex + idx}
            style={{
              background: "#f3f3f1", // Match For Students rectangles
              borderRadius: "10px",
              padding: "24px 28px",
              maxWidth: "260px",
              minWidth: "220px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid #e0dfdb",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 170
            }}
          >
            <div style={{ fontWeight: 600, color: "#162040", marginBottom: "10px" }}>
              {review.stars}
            </div>
            <div style={{ color: "#222", fontSize: "1.05rem", marginBottom: "12px" }}>
              {review.text}
            </div>
            <div style={{ color: "#666", fontSize: "0.98rem" }}>
              {review.author}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleNext}
        disabled={startIndex >= maxIndex}
        style={{
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "50%",
          width: 36,
          height: 36,
          marginLeft: 16,
          fontSize: "1.5rem",
          color: "#162040",
          cursor: startIndex >= maxIndex ? "not-allowed" : "pointer",
          opacity: startIndex >= maxIndex ? 0.4 : 1,
          transition: "opacity 0.2s"
        }}
        aria-label="Next reviews"
      >
        &#8594;
      </button>
    </div>
  );
};

const ExploreModulesSection = () => (
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
    {/* Reviews Section */}
    <section
      style={{
        width: "100%",
        background: "#F6F8FA",
        padding: "0",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: "40px",
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
        justifyContent: "flex-start",
        minWidth: "220px",
        maxWidth: "300px"
      }}>
        <h2 style={{
          fontSize: "2.5rem",
          fontWeight: 700,
          color: "#162040",
          marginBottom: "18px",
          textAlign: "left",
          fontFamily: "Open Sans, sans-serif",
          letterSpacing: "1px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}>
          What Educators Say
        </h2>
        <div style={{
          color: "#222",
          fontSize: "1.15rem",
          fontWeight: 500,
          lineHeight: 1.5,
          textAlign: "left",
          maxWidth: "600px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}>
          Hear from those who have experienced DIYA's impact.
        </div>
      </div>
      {/* Right: Carousel Reviews */}
      <ReviewsCarousel />
    </section>
  </div>
);

export default ExploreModulesSection;