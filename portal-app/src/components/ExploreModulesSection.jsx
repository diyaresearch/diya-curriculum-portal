import React, { useState, useEffect } from "react";
import aiExploreImg from "../assets/ChatGPT Image Jun 13, 2025, 02_04_24 PM.png";
import aiExploreImg2 from "../assets/ChatGPT Image Jun 13, 2025, 02_17_05 PM.png";
import aiExploreImg3 from "../assets/ChatGPT Image Jun 13, 2025, 02_25_51 PM.png";
import laptopImg from "../assets/laptop.png";
import physicsImg from "../assets/finphysics.png";
import textbooksImg from "../assets/textbooks.png";
import softwareEngImg from "../assets/software_engineering.png";
import { getFirestore, collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import { db } from "../firebase/firebaseConfig";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// This function is used in the filter section for dynamic module display
const getItemImage = (item) => {
  const itemType = item._type;
  const category = (item.category || item.Category || "").toLowerCase();
  const level = (item.level || item.Level || "").toLowerCase();

  // Return images based on type and category
  if (itemType === "Module") {
    if (category.includes("ai") || category.includes("python")) {
      return level === "basic" ? aiExploreImg : aiExploreImg2;
    } else if (category.includes("physics")) {
      return physicsImg;
    } else {
      return aiExploreImg3; // Default for modules
    }
  } else if (itemType === "Lesson Plan") {
    return laptopImg; // Use laptop image for lesson plans
  } else if (itemType === "Nuggets") {
    return textbooksImg; // Use textbooks image for nuggets
  }

  // Fallback image
  return aiExploreImg;
};

// Map module keys to appropriate images for featured modules
const getFeaturedModuleImage = (moduleKey) => {
  const imageMap = {
    "python-for-ai": softwareEngImg,
    "ai-exploration": aiExploreImg,
    "ai-insights": laptopImg,
    "physics-ai": physicsImg,
    "chemistry-ai": textbooksImg,  // Using textbooks for chemistry
    "biology-ai": aiExploreImg3    // Using AI image variant for biology
  };
  return imageMap[moduleKey] || aiExploreImg;
};

// Lock/Unlock icons component
const LockIcon = ({ isLocked }) => (
  <svg
    width="24" // Increased from 20
    height="24" // Increased from 20
    viewBox="0 0 24 24"
    fill="none"
    style={{
      position: "absolute",
      top: "16px", // Increased from 12px
      left: "16px", // Increased from 12px
      zIndex: 10,
      background: "rgba(255,255,255,0.95)", // More opaque
      borderRadius: "6px", // Less rounded
      padding: "4px", // Increased padding
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)" // Added shadow
    }}
  >
    {isLocked ? (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="#dc3545" strokeWidth="2" fill="#fff" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#dc3545" strokeWidth="2" />
        <circle cx="12" cy="16" r="1" fill="#dc3545" />
      </>
    ) : (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="#28a745" strokeWidth="2" fill="#fff" />
        <path d="M7 11V7a5 5 0 0 1 10 0" stroke="#28a745" strokeWidth="2" />
        <circle cx="12" cy="16" r="1" fill="#28a745" />
      </>
    )}
  </svg>
);

// Replace the existing capitalizeWords function with this more robust version:
function capitalizeWords(str) {
  // Handle all possible non-string cases
  if (str === null || str === undefined) {
    return 'N/A';
  }

  // Convert to string safely
  const stringValue = String(str);

  // Check if the result is a valid string
  if (typeof stringValue !== 'string') {
    console.warn('capitalizeWords: String conversion failed for:', str);
    return 'N/A';
  }

  return stringValue
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}



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






function ModuleLoginPrompt({ open, onClose, moduleTitle, summary }) {
  if (!open) return null;

  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
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
  "AI Principles",
  "Data Science",
  "Machine Learning",
  "Statistics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Other"
];
const MODULE_LEVELS = ["All", "Basic", "Intermediate", "Advanced"];

// Add this constant outside the component, near the top of the file:
const MODULE_POPUP_INFO = [
  {
    key: "python-for-ai",
    title: "Python for AI",
    level: "Beginner",
    summary:
      "Learn Python programming fundamentals specifically for AI applications. This module covers essential programming concepts, data structures, and libraries used in artificial intelligence development.",
    description: "Master Python basics for AI: variables, functions, and essential libraries like NumPy and Pandas for data manipulation and analysis...",
  },
  {
    key: "ai-exploration",
    title: "AI Exploration",
    level: "Beginner",
    summary:
      "Dive into the basics of Artificial Intelligence. This module introduces students to foundational AI concepts, real-world applications, and hands-on activities. Perfect for beginners, it builds curiosity and critical thinking about how AI shapes our world and daily life.",
    description: "Discover AI fundamentals: machine learning concepts, real-world applications, and ethical considerations in modern technology...",
  },
  {
    key: "ai-insights",
    title: "AI Insights",
    level: "Intermediate",
    summary:
      "Explore deeper into AI with practical examples and interactive lessons. This module covers data, algorithms, and ethical considerations, helping learners understand how AI systems are built and used. Ideal for those ready to move beyond the basics.",
    description: "Advanced AI concepts: deep learning algorithms, neural networks, and practical implementation strategies for complex problems...",
  },
  {
    key: "physics-ai",
    title: "Physics & AI",
    level: "Beginner",
    summary:
      "Discover the intersection of Artificial Intelligence and Physics. This module demonstrates how AI can solve physics problems, analyze data, and simulate experiments, making science learning more engaging and insightful for students.",
    description: "Explore AI applications in physics: computational modeling, data analysis, and simulation techniques for scientific research...",
  },
  {
    key: "chemistry-ai",
    title: "Chemistry & AI",
    level: "Intermediate",
    summary:
      "Explore how artificial intelligence revolutionizes chemistry through molecular modeling, drug discovery, and chemical analysis. Learn how AI accelerates research and development in chemical sciences.",
    description: "AI-driven chemistry: molecular prediction, drug discovery processes, and automated chemical analysis using machine learning...",
  },
  {
    key: "biology-ai",
    title: "Biology & AI",
    level: "Advanced",
    summary:
      "Dive into bioinformatics and computational biology. This advanced module covers AI applications in genomics, protein structure prediction, and medical diagnostics using cutting-edge machine learning techniques.",
    description: "Advanced bioinformatics: genomic analysis, protein folding prediction, and medical AI applications in modern healthcare...",
  },
];


const NuggetBuilderSection = () => (
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
      Nugget Builder
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
      Create your own learning nuggets and share them with your class or the community.
    </p>
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
      onClick={() => window.location.href = "/nugget-builder"}
    >
      Go to Nugget Builder
    </button>
  </section>
);

// Add this section component near the top of your file
function ModuleBuilderPromo() {

  return (
    <section
      style={{
        width: "100%",
        padding: "60px 0 0 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "#F6F8FA"
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
        Module Builder
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
        Create and organize modules. Add lesson plans to build a comprehensive learning experience.
      </p>
      <button
        onClick={() => {
          window.location.href = "/module-builder"; // This will refresh and go to module builder
        }}
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
      >
        Go to Module Builder
      </button>
    </section>
  );
}

const ExploreModulesSection = () => {
  const { user, role } = useUserRole();
  const navigate = useNavigate();
  const isTeacherDefault = role === "teacherDefault";
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupModule, setPopupModule] = useState(null);

  // Responsive design state
  const [screenSize, setScreenSize] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setScreenSize(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Filter state
  const [contentType, setContentType] = useState("All");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");
  const [keyword, setKeyword] = useState("");

  // Data state
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [nuggets, setNuggets] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Pagination state - dynamic based on window size
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // Will be calculated dynamically

  // Update items per page based on screen size - ALWAYS 2 rows
  useEffect(() => {
    const updateItemsPerPage = () => {
      const screenWidth = window.innerWidth;
      let itemsPerRow;

      if (screenWidth >= 1400) {
        itemsPerRow = 3; // 3 cards per row on very large screens
      } else if (screenWidth >= 1000) {
        itemsPerRow = 3; // 3 cards per row on large screens
      } else if (screenWidth >= 800) {
        itemsPerRow = 2; // 2 cards per row on medium screens
      } else {
        itemsPerRow = 1; // 1 card per row on small screens
      }

      // ALWAYS show exactly 2 rows
      setItemsPerPage(itemsPerRow * 2);
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);

    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // Calculate pagination - ensure we always show 2 full rows
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  let paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);


  // Reset to page 1 when filters change or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredItems, itemsPerPage]);

  // Fetch all data on mount
  useEffect(() => {
    const db = getFirestore(firebaseApp);

    // Fetch modules - FIXED VERSION
    getDocs(collection(db, "module")).then(snapshot => {
      const moduleData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        moduleData.push({
          id: doc.id,
          title: data.title || "Untitled Module",
          description: data.description || "",
          image: data.image || "module1",
          tags: data.tags || [],
          level: data.level || "Basic",
          category: data.category || "General",
          lessonPlans: data.lessonPlans || {},
          isDraft: data.isDraft || false, // <-- Add this line
          _type: "Module"
        });
      });
      console.log("Fetched modules:", moduleData); // Add this for debugging
      setModules(moduleData);
    }).catch(error => {
      console.error("Error fetching modules:", error);
    });

    // Fetch lessons
    getDocs(collection(db, "lesson")).then(snapshot => {
      setLessons(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isDraft: doc.data().isDraft || false, // <-- Add this line
        _type: "Lesson Plan"
      })));
    });

    // Fetch nuggets/content
    getDocs(collection(db, "content")).then(snapshot => {
      setNuggets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _type: "Nuggets" })));
    });
  }, []);

  // Initial display should exclude drafts
  useEffect(() => {
    if (!filtersApplied && (modules.length > 0 || lessons.length > 0 || nuggets.length > 0)) {
      const publishedModules = modules.filter(m => !m.isDraft);
      const publishedLessons = lessons.filter(l => !l.isDraft);
      setFilteredItems([...publishedModules, ...publishedLessons, ...nuggets]);
    }
  }, [modules, lessons, nuggets, filtersApplied]);

  // Filtering logic, only runs when Apply Filters is clicked
  const handleApplyFilters = () => {
    let items = [];
    // Filter out drafts before applying other filters
    const publishedModules = modules.filter(m => !m.isDraft);
    const publishedLessons = lessons.filter(l => !l.isDraft);

    // Content Type filtering only applies if user can see the filter (TeacherPlus/Admin)
    if (role === "teacherDefault" || contentType === "All") {
      items = [
        ...publishedModules,
        ...publishedLessons,
        ...nuggets,
      ];
    } else if (contentType === "Module") {
      items = publishedModules;
    } else if (contentType === "Lesson Plan") {
      items = publishedLessons;
    } else if (contentType === "Nuggets") {
      items = nuggets;
    }

    // Filter by category if not "All"
    if (category !== "All") {
      items = items.filter(item => {
        let cat = item.category || item.Category || "";
        if (Array.isArray(cat)) cat = cat.join(", ");
        return cat.toString().toLowerCase() === category.toLowerCase();
      });
    }

    // Filter by level if not "All"
    if (level !== "All") {
      items = items.filter(item => {
        let lvl = item.level || item.Level || "";
        if (Array.isArray(lvl)) lvl = lvl.join(", ");
        return lvl.toString().toLowerCase() === level.toLowerCase();
      });
    }

    // Filter by keyword if not empty
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      items = items.filter(item =>
        (item.title || item.Title || "").toLowerCase().includes(kw)
      );
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

  // --- Replace For Teachers and Testimonials section with Nugget Builder for teacherPlus ---
  if (role === "teacherPlus") {
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
        <NuggetBuilderSection />
        <ModuleBuilderPromo />
      </div>
    );
  }

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
          padding: "60px 0 60px 0",
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

        {/* Six module grid (2 rows × 3 columns) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: screenSize >= 1200 ? "repeat(3, 340px)" :
                               screenSize >= 800 ? "repeat(2, 340px)" :
                               "repeat(1, 340px)",
            gap: screenSize >= 800 ? "40px" : "20px",
            marginTop: "60px",
            width: "100%",
            maxWidth: screenSize >= 1200 ? "1200px" :
                     screenSize >= 800 ? "800px" : "380px",
            justifyContent: "center",
            margin: "60px auto 0 auto"
          }}
        >
          {MODULE_POPUP_INFO.map((module, index) => (
            <div
              key={module.key}
              style={{
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                width: screenSize >= 800 ? "340px" : "100%",
                maxWidth: "340px",
                height: "420px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "space-between",
                overflow: "hidden",
                cursor: "pointer",
                position: "relative"
              }}
              onClick={() => {
                if (!user) {
                  setPopupModule(module);
                  setPopupOpen(true);
                } else if (["teacherDefault", "student", "admin"].includes(role)) {
                  navigate(`/modules/${module.key}`);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Go to ${module.title}`}
              onKeyPress={e => {
                if (e.key === "Enter" || e.key === " ") {
                  if (!user) {
                    setPopupModule(module);
                    setPopupOpen(true);
                  } else if (["teacherDefault", "student", "admin"].includes(role)) {
                    navigate(`/modules/${module.key}`);
                  }
                }
              }}
            >
              {/* Image section */}
              <div style={{
                width: "100%",
                height: "240px",
                display: "flex",
                alignItems: "stretch",
                justifyContent: "center"
              }}>
                <img
                  src={getFeaturedModuleImage(module.key)}
                  alt={module.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block"
                  }}
                />
              </div>

              {/* Content section */}
              <div style={{
                width: "100%",
                height: "180px",
                padding: "20px",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}>
                {/* Title - Left aligned */}
                <h3 style={{
                  margin: 0,
                  fontWeight: "700",
                  fontSize: "1.4rem",
                  color: "#222",
                  textAlign: "left",
                  marginBottom: "8px"
                }}>
                  {module.title}
                </h3>

                {/* Description - Left aligned, 3 lines with ellipsis */}
                <p style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  color: "#666",
                  textAlign: "left",
                  lineHeight: "1.4",
                  height: "4.2rem", // 3 lines at 1.4 line-height
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  marginBottom: "auto"
                }}>
                  {module.description}
                </p>

                {/* Difficulty level - Left aligned at bottom */}
                <div style={{
                  display: "inline-block",
                  background: "#162040",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  textAlign: "center",
                  alignSelf: "flex-start"
                }}>
                  {module.level}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* See All Modules CTA Button - positioned after the module grid */}
        <button
          onClick={() => {
            if (!user) {
              setPopupOpen(true);
              setPopupModule({ title: "All Modules", summary: "Sign in to explore our complete collection of educational modules across various subjects and difficulty levels." });
            } else {
              // Navigate to all modules page or trigger filter section
              document.querySelector('[data-section="filter-search"]')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          style={{
            marginTop: "40px",
            background: "#162040",
            color: "#fff",
            border: "2px solid #162040",
            borderRadius: "6px",
            padding: "12px 32px",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(22, 32, 64, 0.2)"
          }}
          onMouseOver={(e) => {
            e.target.style.background = "#fff";
            e.target.style.color = "#162040";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "#162040";
            e.target.style.color = "#fff";
          }}
        >
          See All Modules
        </button>

        <ModuleLoginPrompt
          open={popupOpen}
          onClose={() => setPopupOpen(false)}
          moduleTitle={popupModule?.title}
          summary={popupModule?.summary}
        />

        {/* --- Filter and Search Section for teacherDefault --- */}
        {isTeacherDefault && (
          <>
            <div style={{ height: "100px" }} />
            <h2
              data-section="filter-search"
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
            {/* Keyword Filter */}
            <div style={{ marginBottom: "18px", width: "100%", maxWidth: 400 }}>
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
            <div style={{
              display: "flex",
              gap: "32px",
              flexWrap: "wrap",
              marginBottom: "18px"
            }}>
              {/* Content Type Filter - Only for TeacherPlus and Admin */}
              {(role === "teacherPlus" || role === "admin") && (
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
              )}
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
                display: "grid", // Changed from flex to grid
                gridTemplateColumns: "repeat(3, 380px)", // Exactly 3 columns of 380px each
                gridTemplateRows: "repeat(2, 380px)", // Exactly 2 rows of 380px each
                gap: "40px",
                padding: "40px",
                justifyContent: "center",
                alignItems: "start",
                color: "#888",
                fontSize: "1.05rem",
                fontStyle: "italic",
                marginBottom: "16px",
                boxSizing: "border-box",
                maxWidth: "1300px", // Limit container width
                margin: "0 auto" // Center the container
              }}
            >
              {paginatedItems.length === 0 ? (
                <div style={{
                  gridColumn: "1 / -1", // Span all columns
                  width: "100%",
                  textAlign: "center"
                }}>
                  No modules found.
                </div>
              ) : (
                paginatedItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      width: "380px",
                      height: "380px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      overflow: "hidden",
                      cursor: "pointer",
                      position: "relative",
                      transition: "box-shadow 0.2s"
                    }}
                    onClick={() => {
                      // Handle navigation based on item type and lock status
                      const isLocked = (item.role || item.Role) === "teacherPlus";
                      if (isLocked && role === "teacherDefault") {
                        setUpgradePromptOpen(true);
                      } else {
                        // Navigate to appropriate page based on item type
                        if (item._type === "Module") {
                          navigate(`/modules/${item.id}`);
                        } else if (item._type === "Lesson Plan") {
                          navigate(`/lesson-plans/${item.id}`);
                        } else if (item._type === "Nuggets") {
                          navigate(`/nuggets/${item.id}`);
                        }
                      }
                    }}
                  >
                    {/* Rest of your card content remains the same */}
                    <LockIcon isLocked={(item.role || item.Role) === "teacherPlus"} />

                    <div style={{
                      width: "100%",
                      height: "calc(100% - 70px)",
                      display: "flex",
                      alignItems: "stretch",
                      justifyContent: "center",
                      background: "#f0f0f0"
                    }}>
                      <img
                        src={laptopImg} // <-- Always use laptop image
                        alt="Laptop"
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
                      height: "100px", // <-- increase from 70px to 90px
                      padding: "12px 0 0 0",
                      textAlign: "center",
                      background: "#fff"
                    }}>
                      <span
                        style={{
                          display: "block",
                          fontWeight: "700",
                          fontSize: "1.15rem",
                          color: "#222",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          overflow: "hidden"
                        }}
                      >
                        {item.title || item.Title}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontWeight: "600",
                          fontSize: "1rem",
                          color: "#162040",
                          letterSpacing: "1px",
                          marginTop: "2px",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          overflow: "hidden"
                        }}
                      >
                        {capitalizeWords(item.level || item.Level || "N/A")}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontWeight: "600",
                          fontSize: "1rem",
                          color: "#162040",
                          letterSpacing: "1px",
                          marginTop: "2px",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          overflow: "hidden"
                        }}
                      >
                        {typeLabel[item._type] || item._type}
                      </span>
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

      <UpgradePrompt open={upgradePromptOpen} onClose={() => setUpgradePromptOpen(false)} />
    </div>
  );
};

export default ExploreModulesSection;

const typeLabel = {
  Module: "Module",
  "Lesson Plan": "Lesson Plan",
  Nuggets: "Nugget"
};

