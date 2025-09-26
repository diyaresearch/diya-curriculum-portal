import React, { useState, useEffect } from "react";
import aiExploreImg from "../assets/ChatGPT Image Jun 13, 2025, 02_04_24 PM.png";
import aiExploreImg2 from "../assets/ChatGPT Image Jun 13, 2025, 02_17_05 PM.png";
import aiExploreImg3 from "../assets/ChatGPT Image Jun 13, 2025, 02_25_51 PM.png";
import laptopImg from "../assets/laptop.png";
import physicsImg from "../assets/finphysics.png";
import textbooksImg from "../assets/textbooks.png";
import { getFirestore, collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import { db } from "../firebase/firebaseConfig";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Add this function near the top of your file, after the imports
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
  const navigate = useNavigate();

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

    if (contentType === "All") {
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
              cursor: "pointer",
              position: "relative"
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
            {/* Add the lock icon here */}
            <LockIcon isLocked={false} />

            <div style={{
              width: "100%",
              height: "calc(100% - 70px)",
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
              cursor: "pointer",
              position: "relative" // ADD THIS
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
            {/* ADD THIS LINE HERE */}
            <LockIcon isLocked={true} />
            <div style={{
              width: "100%",
              height: "calc(100% - 70px)",
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center"
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
              cursor: "pointer",
              position: "relative" // ADD THIS LINE
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
            {/* ADD THIS LINE */}
            <LockIcon isLocked={false} />
            <div style={{
              width: "100%",
              height: "calc(100% - 70px)",
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
            <div style={{ width: "100%", height: "90px", padding: "10px 0 0 0", textAlign: "center", background: "#fff" }}>
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
                marginBottom: "24px"
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

