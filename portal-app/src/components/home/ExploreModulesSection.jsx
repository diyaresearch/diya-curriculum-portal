import React, { useState, useEffect, useMemo } from "react";
import aiExploreImg from "@/assets/ChatGPT Image Jun 13, 2025, 02_04_24 PM.png";
import aiExploreImg3 from "@/assets/ChatGPT Image Jun 13, 2025, 02_25_51 PM.png";
import laptopImg from "@/assets/laptop.png";
import physicsImg from "@/assets/finphysics.png";
import textbooksImg from "@/assets/textbooks.png";
import softwareEngImg from "@/assets/software_engineering.png";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { COLLECTIONS } from "@/firebase/collectionNames";
import { useLocation, useNavigate } from "react-router-dom";
import { startGoogleRedirect } from "@/auth/googleAuth";
import useUserRole from "@/hooks/useUserRole";
import { useToast } from "@/components/ui/ToastProvider";
import Modal from "@/components/ui/Modal";
import { ROLES, PREMIUM_ROLES } from "@/constants/roles";

function isModuleVisibleToViewer(moduleItem, viewerUser) {
  if (!moduleItem || moduleItem._type !== "Module") return true;
  if (moduleItem.isDraft === true) return false;
  const viewerUid = viewerUser?.uid || "";
  const authorUid = moduleItem.author || "";
  if (viewerUid && authorUid && viewerUid === authorUid) return true;
  
  return moduleItem.isPublic === true;
}

function normalizeBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;
  const s = String(value || "").trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return false;
}

function stripHtmlToText(value) {
  const text = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

// Map module keys to appropriate images for featured modules
const getFeaturedModuleImage = (moduleKey) => {
  const imageMap = {
    "python-for-ai": softwareEngImg,
    "ai-exploration": aiExploreImg,
    "ai-insights": laptopImg,
    "ai-physics": physicsImg,
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
    className="absolute top-4 left-4 z-[10] [background:rgba(255,255,255,0.95)] rounded-md p-1 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
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

function ModuleLoginPrompt({ open, onClose, moduleTitle, summary }) {
  const toast = useToast();
  const location = useLocation();
  if (!open) return null;

  const handleGoogleLogin = async () => {
    try {
      await startGoogleRedirect({
        returnTo: `${location.pathname}${location.search || ""}`,
      });
    } catch (error) {
      toast.error("Login failed. Please try again.");
    }
  };
  

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 [background:rgba(0,0,0,0.3)] z-[3000] flex items-center justify-center">
      <div className="bg-surface rounded-xl p-8 min-w-25 max-w-100 w-[90%] shadow-[0_4px_24px_rgba(0,0,0,0.18)] text-center relative">
        <button onClick={onClose} className="absolute top-2.5 right-4 bg-none border-0 text-[1.5rem] cursor-pointer text-ink-faint">×</button>
        <div className="font-bold text-[1.4rem] mb-4">
          {moduleTitle}
        </div>
        <div className="mb-6 text-body text-ink">
          {summary}
        </div>
        <div className="mb-6 font-medium">
          Sign up or login to see more!
        </div>
        <button
          onClick={handleGoogleLogin}
          className="bg-navy text-white border-0 rounded-md py-3 px-8 font-semibold text-[1rem] cursor-pointer"
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

// Resize fires continuously while a window is dragged; coalesce the burst into
// one state update (issue #413).
const RESIZE_DEBOUNCE_MS = 150;

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
    key: "ai-physics",
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

function buildFeaturedTileFromDoc(docSnap) {
  const data = docSnap.data() || {};

  const title = data.title ?? data.Title ?? data.name ?? data.Name ?? "Untitled Module";
  const descriptionRaw = data.description ?? data.Description ?? data.subtitle ?? data.Subtitle ?? "";
  const description = stripHtmlToText(descriptionRaw);

  const moduleKey = data.moduleKey ?? data.key ?? data.slug ?? "";
  const levelRaw = data.level ?? data.Level ?? "Basic";
  const level = Array.isArray(levelRaw) ? (levelRaw[0] || "Basic") : String(levelRaw || "Basic");

  const isDraft = data.isDraft === true;

  const featuredOrderRaw = data.featuredOrder ?? data.FeaturedOrder;
  const featuredOrder = Number.isFinite(Number(featuredOrderRaw)) ? Number(featuredOrderRaw) : 999;

  const featuredImageUrl =
    data.featuredImageUrl ?? data.featuredImageURL ?? data.imageUrl ?? data.imageURL ?? "";

  return {
    _source: "firestore",
    id: docSnap.id,
    routeParam: docSnap.id,
    moduleKey: String(moduleKey || ""),
    title: String(title || "Untitled Module"),
    description: String(description || ""),
    summary: String(description || ""),
    level,
    featuredImageUrl: String(featuredImageUrl || ""),
    featuredOrder,
    isDraft,
  };
}

// Featured-module grid geometry. The breakpoints were repeated inline across
// the grid container and every card, so a change had to be made in several
// places at once (issue #413).
const FEATURED_CARD_WIDTH = 340;
const FEATURED_BREAKPOINT_WIDE = 1200;
const FEATURED_BREAKPOINT_MEDIUM = 800;

function getFeaturedGridStyle(screenSize) {
  const columns = screenSize >= FEATURED_BREAKPOINT_WIDE ? 3 : screenSize >= FEATURED_BREAKPOINT_MEDIUM ? 2 : 1;
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, ${FEATURED_CARD_WIDTH}px)`,
    gap: screenSize >= FEATURED_BREAKPOINT_MEDIUM ? "40px" : "20px",
    width: "100%",
    maxWidth: screenSize >= FEATURED_BREAKPOINT_WIDE ? "1200px" : screenSize >= FEATURED_BREAKPOINT_MEDIUM ? "800px" : "380px",
    justifyContent: "center",
    margin: "60px auto 0 auto",
  };
}

function getFeaturedCardStyle(screenSize) {
  return {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    width: screenSize >= FEATURED_BREAKPOINT_MEDIUM ? `${FEATURED_CARD_WIDTH}px` : "100%",
    maxWidth: `${FEATURED_CARD_WIDTH}px`,
    height: "420px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    overflow: "hidden",
    cursor: "pointer",
    position: "relative",
  };
}

function buildFeaturedTileFromStatic(moduleInfo) {
  return {
    _source: "static",
    id: moduleInfo.key,
    routeParam: moduleInfo.key,
    moduleKey: moduleInfo.key,
    title: moduleInfo.title,
    description: moduleInfo.description,
    summary: moduleInfo.summary,
    level: moduleInfo.level,
    featuredImageUrl: "",
    featuredOrder: 999,
  };
}

function resolveFeaturedTileImage(tile) {
  const url = String(tile?.featuredImageUrl || "").trim();
  if (url) return url;
  const key = String(tile?.moduleKey || tile?.id || "").trim();
  if (key) return getFeaturedModuleImage(key);
  return laptopImg;
}


const NuggetBuilderSection = () => {
  const navigate = useNavigate();
  return (
  <section
    className="w-full bg-surface-subtle pt-15 pr-0 pb-0 pl-0 flex flex-col items-center justify-start"
  >
    <h2
      className="text-page-title font-bold text-ink-strong font-sans text-center m-0 tracking-[1px]"
    >
      Nugget Builder
    </h2>
    <p
      className="mt-4.5 text-[1.15rem] text-ink text-center max-w-150 font-medium"
    >
      Create your own learning nuggets and share them with your class or the community.
    </p>
    <button
      className="mt-8 bg-navy text-white border-2 border-navy rounded-md py-3.5 px-12 text-label font-semibold cursor-pointer [transition:background_0.2s,_color_0.2s,_border_0.2s] min-w-65"
      onClick={() => navigate("/nugget-builder")}
    >
      Go to Nugget Builder
    </button>
  </section>
  );
};

// Add this section component near the top of your file
function ModuleBuilderPromo() {
  const navigate = useNavigate();

  return (
    <section
      className="w-full pt-15 pr-0 pb-0 pl-0 flex flex-col items-center justify-start bg-surface-subtle"
    >
      <h2
        className="text-page-title font-bold text-ink-strong font-sans text-center m-0 tracking-[1px]"
      >
        Module Builder
      </h2>
      <p
        className="mt-4.5 text-[1.15rem] text-ink text-center max-w-150 font-medium"
      >
        Create and organize modules. Add lesson plans to build a comprehensive learning experience.
      </p>
      <button
        onClick={() => {
          navigate("/module-builder");
        }}
        className="mt-8 bg-navy text-white border-2 border-navy rounded-md py-3.5 px-12 text-label font-semibold cursor-pointer [transition:background_0.2s,_color_0.2s,_border_0.2s] min-w-65"
      >
        Go to Module Builder
      </button>
    </section>
  );
}

// Hoisted out of ExploreModulesSection (#503 follow-up). Defining a
// component inside another component's body gives it a new identity on
// every parent render, so React unmounts and remounts the whole subtree
// each time - state and focus inside it would not survive. The comment
// that used to sit above this asked for exactly this move.
function UpgradePrompt({ open, onClose }) {
  const navigate = useNavigate();
  return (
    <Modal open={open} onClose={onClose} size="small" title="Upgrade Required">
      <div className="text-center">
        <p className="mb-6 text-body text-ink">
          You need to upgrade to Teacher Plus to access this course.
        </p>
        <button
          type="button"
          onClick={() => navigate("/upgrade")}
          className="bg-navy text-white border-0 rounded-md py-3 px-8 font-semibold text-[1rem] cursor-pointer"
        >
          Go to Upgrade Page
        </button>
      </div>
    </Modal>
  );
}

const ExploreModulesSection = () => {
  const { user, role } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search || ""}`;
  const isTeacherDefault = role === ROLES.TEACHER_DEFAULT;
  const isAdmin = role === ROLES.ADMIN;
  // Only premium roles get the Content Type filter. Every other role — signed
  // out, studentDefault, teacherDefault — browses the unfiltered set, and this
  // single flag drives both the control and the filtering so the two cannot
  // disagree (issue #416).
  const canFilterByContentType = PREMIUM_ROLES.includes(role);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupModule, setPopupModule] = useState(null);

  // Responsive design state. One debounced listener feeds every size-derived
  // value below; there used to be a second, undebounced listener for
  // itemsPerPage, which meant two state updates per resize event (issue #413).
  const [screenSize, setScreenSize] = useState(window.innerWidth);

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setScreenSize(window.innerWidth), RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
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
  // What "Apply Filters" produced. Until then the list is derived, not stored:
  // an effect used to write the unfiltered set into the same state (#525).
  const [appliedItems, setAppliedItems] = useState([]);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Pagination state - page size is derived from screenSize, always 2 full rows
  const [currentPage, setCurrentPage] = useState(1);

  // Featured modules (prefer admin-curated `isFeatured == true` from Firestore)
  const [featuredTiles, setFeaturedTiles] = useState([]);
  // Fallback tiles for the first render, before Firestore answers. Built once
  // rather than on every render (issue #413).
  const staticFeaturedTiles = useMemo(() => MODULE_POPUP_INFO.map(buildFeaturedTileFromStatic), []);

  // Admin-only: paginated view of all published modules (created by anyone)
  const [adminAllModulesOpen, setAdminAllModulesOpen] = useState(false);
  const [adminModulesPage, setAdminModulesPage] = useState(1);
  const ADMIN_PAGE_SIZE = 6;

  // Items per page - ALWAYS 2 rows, derived from the debounced screen size.
  const itemsPerPage = useMemo(() => {
    let itemsPerRow;

    if (screenSize >= 1000) {
      itemsPerRow = 3; // 3 cards per row on large screens
    } else if (screenSize >= 800) {
      itemsPerRow = 2; // 2 cards per row on medium screens
    } else {
      itemsPerRow = 1; // 1 card per row on small screens
    }

    // ALWAYS show exactly 2 rows
    return itemsPerRow * 2;
  }, [screenSize]);

  // Calculate pagination - ensure we always show 2 full rows
  // Everything published, which is what the section shows before anyone filters.
  const defaultItems = useMemo(() => {
    const publishedModules = modules.filter((m) => isModuleVisibleToViewer(m, user));
    const publishedLessons = lessons.filter((l) => !l.isDraft);
    return [...publishedModules, ...publishedLessons, ...nuggets];
  }, [modules, lessons, nuggets, user]);

  const filteredItems = filtersApplied ? appliedItems : defaultItems;

  // Go back to page 1 when the list under the pager changes. Adjusting state
  // during render is React's documented alternative to an effect for this (#525).
  const [pagedOver, setPagedOver] = useState({ filteredItems, itemsPerPage });
  if (pagedOver.filteredItems !== filteredItems || pagedOver.itemsPerPage !== itemsPerPage) {
    setPagedOver({ filteredItems, itemsPerPage });
    setCurrentPage(1);
  }

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  let paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);


  // Fetch all data on mount
  useEffect(() => {

    // Fetch modules - FIXED VERSION
    getDocs(collection(db, COLLECTIONS.module)).then(snapshot => {
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
          isPublic: normalizeBoolean(data.isPublic),
          author: data.author || data.authorId || "",
          _type: "Module"
        });
      });
      setModules(moduleData);
    }).catch(error => {
      console.error("Error fetching modules:", error);
    });

    // Fetch lessons
    getDocs(collection(db, COLLECTIONS.lesson)).then(snapshot => {
      setLessons(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isDraft: doc.data().isDraft || false, // <-- Add this line
        _type: "Lesson Plan"
      })));
    });

    // Fetch nuggets/content
    getDocs(collection(db, COLLECTIONS.content)).then(snapshot => {
      setNuggets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _type: "Nuggets" })));
    });
  }, []);

  // Featured modules: load modules explicitly marked `isFeatured == true`.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, COLLECTIONS.module),
          where("isFeatured", "==", true),
          limit(6)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const tiles = snap.docs
          .map(buildFeaturedTileFromDoc)
          .filter(Boolean)
          .filter((t) => t?.isDraft !== true)
          .sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999));

        if (tiles.length > 0) {
          // If fewer than 6 are flagged, fill remaining slots with legacy static tiles.
          const seen = new Set(tiles.map((t) => t.id));
          const filled = [
            ...tiles,
            ...staticFeaturedTiles.filter((t) => !seen.has(t.id)).slice(0, Math.max(0, 6 - tiles.length)),
          ];

          setFeaturedTiles(filled);
          return;
        }
      } catch (e) {
        console.error("Failed to load featured modules:", e);
      }

      // Fallback to legacy hardcoded list
      setFeaturedTiles(staticFeaturedTiles);
    })();

    return () => {
      cancelled = true;
    };
  }, [staticFeaturedTiles]);

  // Filtering logic, only runs when Apply Filters is clicked
  const handleApplyFilters = () => {
    let items = [];
    // Filter out drafts before applying other filters
    const publishedModules = modules.filter(m => isModuleVisibleToViewer(m, user));
    const publishedLessons = lessons.filter(l => !l.isDraft);

    // Content Type filtering only applies if the user can see the filter; for
    // everyone else contentType stays at its "All" default and is ignored here.
    if (!canFilterByContentType || contentType === "All") {
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


    setAppliedItems(items);
    setFiltersApplied(true);
  };

  // Reset filters and filtered results
  const handleResetFilters = () => {
    setContentType("All");
    setCategory("All");
    setLevel("All");
    setKeyword("");
    setAppliedItems([]);
    setFiltersApplied(false);
  };

  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);

  // --- Replace For Teachers and Testimonials section with Nugget Builder for teacherPlus ---
  if (role === ROLES.TEACHER_PLUS) {
    return (
      <div
        className="w-full bg-surface-subtle flex flex-col items-center gap-10"
      >
        <NuggetBuilderSection />
        <ModuleBuilderPromo />
      </div>
    );
  }

  return (
    <div
      className="w-full bg-surface-subtle flex flex-col items-center gap-10"
    >
      {role === ROLES.ADMIN && (
        <section
          className="w-full pt-20 pr-0 pb-5 pl-0 flex flex-col items-center"
        >
          <h2
            className="text-page-title font-bold text-ink-strong text-center m-0 tracking-[1px] font-sans"
          >
            Create New
          </h2>
          <p
            className="mt-4.5 text-[1.15rem] text-ink text-center max-w-150 font-medium mb-15 font-sans"
          >
            Start creating your content now!
          </p>

          <div
            className="flex justify-center gap-10 w-full max-w-275 flex-nowrap overflow-x-auto py-0 px-4 box-border"
          >
            <div
              className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-85 h-80 flex-[0_0_340px] flex flex-col items-center justify-center cursor-pointer [transition:transform_0.2s,_box-shadow_0.2s] border-2 border-transparent"
              onClick={() => navigate("/module-builder")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
              }}
              role="button"
              tabIndex={0}
            >
              <div
                className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2" />
                  <path d="M9 9h6v6H9z" fill="white" />
                  <path d="M9 3v6M15 3v6M3 9h6M3 15h6" stroke="white" strokeWidth="2" />
                </svg>
              </div>
              <h3
                className="text-[1.5rem] font-bold text-ink mb-3 text-center"
              >
                Create Module
              </h3>
              <p
                className="text-[1rem] text-ink-muted text-center max-w-70 leading-[1.5] m-0"
              >
                Build a new module to teach.
              </p>
            </div>

            <div
              className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-85 h-80 flex-[0_0_340px] flex flex-col items-center justify-center cursor-pointer [transition:transform_0.2s,_box-shadow_0.2s] border-2 border-transparent"
              onClick={() => navigate("/lesson-plans/builder")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
              }}
              role="button"
              tabIndex={0}
            >
              <div
                className="w-20 h-20 bg-navy rounded-full flex items-center justify-center mb-6"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" />
                  <polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="2" />
                  <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2" />
                  <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2" />
                  <polyline points="10,9 9,9 8,9" stroke="white" strokeWidth="2" />
                </svg>
              </div>
              <h3
                className="text-[1.5rem] font-bold text-ink mb-3 text-center"
              >
                Create Lesson Plan
              </h3>
              <p
                className="text-[1rem] text-ink-muted text-center max-w-70 leading-[1.5] m-0"
              >
                Design a lesson plan for your classes.
              </p>
            </div>

            <div
              className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-85 h-80 flex-[0_0_340px] flex flex-col items-center justify-center cursor-pointer [transition:transform_0.2s,_box-shadow_0.2s] border-2 border-transparent"
              onClick={() => navigate("/nugget-builder")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
              }}
              role="button"
              tabIndex={0}
            >
              <div
                className="w-20 h-20 bg-[#fbbf24] rounded-full flex items-center justify-center mb-6"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="white" strokeWidth="2" />
                </svg>
              </div>
              <h3
                className="text-[1.5rem] font-bold text-ink mb-3 text-center"
              >
                Create Nugget
              </h3>
              <p
                className="text-[1rem] text-ink-muted text-center max-w-70 leading-[1.5] m-0"
              >
                Share concise learning nuggets.
              </p>
            </div>
          </div>
        </section>
      )}
      {/* Anchor target for the "Browse modules" cards in the audience
          sections above, which used to link at routes that do not exist (#442). */}
      <section
        id="explore-modules"
        className="w-full pt-15 pr-0 pb-15 pl-0 min-h-175 flex flex-col items-center justify-start"
      >
        <h2
          className="text-page-title font-bold text-ink-strong font-sans text-center m-0 tracking-[1px]"
        >
          Featured Modules
        </h2>

        {/* Six module grid (2 rows × 3 columns) */}
        <div style={getFeaturedGridStyle(screenSize)}>
          {(featuredTiles.length ? featuredTiles : staticFeaturedTiles).map((module) => (
            <div
              key={`${module._source}-${module.id}`}
              style={getFeaturedCardStyle(screenSize)}
              onClick={() => {
                if (!user) {
                  setPopupModule(module);
                  setPopupOpen(true);
                } else if ([ROLES.TEACHER_DEFAULT, ROLES.STUDENT_DEFAULT, ROLES.ADMIN].includes(role)) {
                  navigate(`/module/${module.routeParam}`, { state: { returnTo: currentPath } });
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
                  } else if ([ROLES.TEACHER_DEFAULT, ROLES.STUDENT_DEFAULT, ROLES.ADMIN].includes(role)) {
                    navigate(`/module/${module.routeParam}`, { state: { returnTo: currentPath } });
                  }
                }
              }}
            >
              {/* Image section */}
              <div className="w-full h-60 flex items-stretch justify-center">
                <img
                  src={resolveFeaturedTileImage(module)}
                  alt={module.title}
                  className="w-full h-full object-cover block"
                />
              </div>

              {/* Content section */}
              <div className="w-full h-45 p-5 bg-surface flex flex-col justify-between">
                {/* Title - Left aligned */}
                <h3 className="m-0 font-bold text-[1.4rem] text-ink text-left mb-2">
                  {module.title}
                </h3>

                {/* Description - Left aligned, 3 lines with ellipsis */}
                <p className="m-0 text-meta text-ink-muted text-left leading-[1.4] h-[4.2rem] overflow-hidden [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] mb-auto">
                  {module.description}
                </p>

                {/* Difficulty level - Left aligned at bottom */}
                <div className="inline-block bg-navy text-white py-1.5 px-3 rounded-sm text-[0.85rem] font-semibold text-center self-start">
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
              if (isAdmin) {
                setAdminAllModulesOpen(true);
                setAdminModulesPage(1);
                setTimeout(() => {
                  document.querySelector('[data-section="admin-all-modules"]')?.scrollIntoView({ behavior: "smooth" });
                }, 0);
                return;
              }
              // Non-admin: trigger filter section scroll
              document.querySelector('[data-section="filter-search"]')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="mt-10 bg-navy text-white border-2 border-navy rounded-md py-3 px-8 text-[1.1rem] font-semibold cursor-pointer [transition:all_0.2s] shadow-[0_2px_8px_rgba(22,_32,_64,_0.2)]"
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

        {/* Admin-only: paginated All Modules view */}
        {isAdmin && adminAllModulesOpen && (
          <div
            data-section="admin-all-modules"
            className="w-full max-w-300 mt-9 bg-surface border border-rule rounded-xl py-7 px-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          >
            <div className="flex justify-between items-baseline gap-4 flex-wrap">
              <div>
                <div className="text-[1.8rem] font-extrabold text-ink-strong">All Modules</div>
                <div className="text-ink-muted mt-1.5">
                  Showing published modules created by everyone.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminAllModulesOpen(false)}
                className="bg-[#f8fafc] text-ink-strong border border-rule rounded-lg py-2.5 px-3.5 cursor-pointer font-bold"
              >
                Close
              </button>
            </div>

            {(() => {
              const allPublishedModules = (modules || [])
                .filter((m) => m?._type === "Module")
                .filter((m) => m?.isDraft !== true);

              const totalPagesAdmin = Math.max(1, Math.ceil(allPublishedModules.length / ADMIN_PAGE_SIZE));
              const page = Math.min(Math.max(1, adminModulesPage), totalPagesAdmin);
              const start = (page - 1) * ADMIN_PAGE_SIZE;
              const pageItems = allPublishedModules.slice(start, start + ADMIN_PAGE_SIZE);

              const canPrev = page > 1;
              const canNext = page < totalPagesAdmin;

              return (
                <>
                  <div
                    className="admin-grid mt-4.5 grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4.5"
                  >
                    {pageItems.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => navigate(`/module/${m.id}`, { state: { returnTo: currentPath } })}
                        className="border-2 border-[#9ca3af] rounded-xl p-4 cursor-pointer bg-[#f8fafc] flex flex-col min-h-42.5"
                      >
                        <div className="font-extrabold text-ink-strong text-[1.1rem] mb-2">
                          {m.title || "Untitled Module"}
                        </div>
                        <div
                          className="text-[#555] text-meta leading-[1.45] overflow-hidden [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] mb-3"
                        >
                          {stripHtmlToText(m.description) || "—"}
                        </div>
                        <div className="flex gap-2.5 flex-wrap mt-auto">
                          {m.category && (
                            <span className="text-[0.85rem] font-bold text-[#0f172a] bg-rule-strong border-2 border-black rounded-full py-1.5 px-2.5">
                              {Array.isArray(m.category) ? m.category.join(", ") : m.category}
                            </span>
                          )}
                          {m.level && (
                            <span className="text-[0.85rem] font-bold text-[#0f172a] bg-rule-strong border-2 border-black rounded-full py-1.5 px-2.5">
                              {m.level}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-4.5 gap-3 flex-wrap">
                    <div className="text-ink-muted font-semibold">
                      Page {page} of {totalPagesAdmin} • {allPublishedModules.length} modules
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        disabled={!canPrev}
                        onClick={() => setAdminModulesPage((p) => Math.max(1, p - 1))}
                        style={{
                          background: canPrev ? "#fff" : "#f8fafc",
                          color: "#111",
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: "10px 14px",
                          cursor: canPrev ? "pointer" : "not-allowed",
                          fontWeight: 700,
                          opacity: canPrev ? 1 : 0.6,
                        }}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={!canNext}
                        onClick={() => setAdminModulesPage((p) => Math.min(totalPagesAdmin, p + 1))}
                        style={{
                          background: canNext ? "#162040" : "#162040",
                          color: "#fff",
                          border: "2px solid #162040",
                          borderRadius: 8,
                          padding: "10px 14px",
                          cursor: canNext ? "pointer" : "not-allowed",
                          fontWeight: 800,
                          opacity: canNext ? 1 : 0.6,
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <style>
                    {`
                      @media (max-width: 1100px) {
                        [data-section="admin-all-modules"] .admin-grid {
                          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        }
                      }
                      @media (max-width: 720px) {
                        [data-section="admin-all-modules"] .admin-grid {
                          grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
                        }
                      }
                    `}
                  </style>
                </>
              );
            })()}
          </div>
        )}

        <ModuleLoginPrompt
          open={popupOpen}
          onClose={() => setPopupOpen(false)}
          moduleTitle={popupModule?.title}
          summary={popupModule?.summary}
        />

        {/* --- Filter and Search Section for teacherDefault --- */}
        {isTeacherDefault && (
          <>
            <div className="h-25" />
            <h2
              data-section="filter-search"
              className="text-page-title font-bold text-ink-strong font-sans text-center m-0 tracking-[1px]"
            >
              Filter and Search
            </h2>
            {/* Keyword Filter */}
            <div className="mb-4.5 w-full max-w-100">
              <input
                type="text"
                value={keyword || ""}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Type a keyword to search..."
                className="w-full py-2 px-4 rounded-md border border-[#bbb] text-[1rem] mt-2"
              />
            </div>
            <div className="flex gap-8 flex-wrap mb-4.5">
              {/* Content Type Filter - Only for TeacherPlus and Admin */}
              {canFilterByContentType && (
                <div>
                  <label className="font-semibold text-navy mr-2">Content Type</label>
                  <select
                    value={contentType}
                    onChange={e => setContentType(e.target.value)}
                    className="py-2 px-4 rounded-md border border-[#bbb] text-[1rem]"
                  >
                    {["All", ...MODULE_CONTENT_TYPES].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Category Filter */}
              <div>
                <label className="font-semibold text-navy mr-2">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="py-2 px-4 rounded-md border border-[#bbb] text-[1rem]"
                >
                  {MODULE_CATEGORIES.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              {/* Level Filter */}
              <div>
                <label className="font-semibold text-navy mr-2">Level</label>
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  className="py-2 px-4 rounded-md border border-[#bbb] text-[1rem]"
                >
                  {MODULE_LEVELS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Filter Actions */}
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2 px-7 rounded-md border border-[#bbb] bg-surface text-ink font-semibold text-[1rem] cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="py-2 px-7 rounded-md border-0 bg-navy text-white font-semibold text-[1rem] cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
            <div
              className="w-full min-h-15 bg-surface-subtle rounded-lg [border:1px_dashed_#bbb] grid [grid-template-columns:repeat(3,_380px)] [grid-template-rows:repeat(2,_380px)] gap-10 p-10 justify-center items-start text-ink-faint text-body italic mb-4 box-border max-w-325 my-0 mx-auto"
            >
              {paginatedItems.length === 0 ? (
                <div className="[grid-column:1_/_-1] w-full text-center">
                  No modules found.
                </div>
              ) : (
                paginatedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] w-95 h-95 flex flex-col items-center justify-end overflow-hidden cursor-pointer relative [transition:box-shadow_0.2s]"
                    onClick={() => {
                      // Handle navigation based on item type and lock status
                      const isLocked = (item.role || item.Role) === ROLES.TEACHER_PLUS;
                      if (isLocked && role === ROLES.TEACHER_DEFAULT) {
                        setUpgradePromptOpen(true);
                      } else {
                        // Navigate to appropriate page based on item type
                        if (item._type === "Module") {
                          navigate(`/module/${item.id}`, { state: { returnTo: currentPath } });
                        } else if (item._type === "Lesson Plan") {
                          navigate(`/lesson/${item.id}`, { state: { returnTo: currentPath } });
                        } else if (item._type === "Nuggets") {
                          navigate(`/content/${item.id}`, { state: { returnTo: currentPath } });
                        }
                      }
                    }}
                  >
                    {/* Rest of your card content remains the same */}
                    <LockIcon isLocked={(item.role || item.Role) === ROLES.TEACHER_PLUS} />

                    <div className="w-full h-[calc(100%_-_70px)] flex items-stretch justify-center bg-[#f0f0f0]">
                      <img
                        src={laptopImg} // <-- Always use laptop image
                        alt="Laptop"
                        className="w-full h-full object-cover block"
                      />
                    </div>

                    <div className="w-full h-25 pt-3 pr-0 pb-0 pl-0 text-center bg-surface">
                      <span
                        className="block font-bold text-[1.15rem] text-ink text-ellipsis whitespace-nowrap overflow-hidden"
                      >
                        {item.title || item.Title}
                      </span>
                      <span
                        className="block font-semibold text-[1rem] text-navy tracking-[1px] mt-0.5 text-ellipsis whitespace-nowrap overflow-hidden"
                      >
                        {capitalizeWords(item.level || item.Level || "N/A")}
                      </span>
                      <span
                        className="block font-semibold text-[1rem] text-navy tracking-[1px] mt-0.5 text-ellipsis whitespace-nowrap overflow-hidden"
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
              <div className="flex justify-center gap-6 mb-8">
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
                <span className="self-center font-semibold text-navy">
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

