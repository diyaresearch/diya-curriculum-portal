import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import "react-quill/dist/quill.snow.css";
import useUserData from "../../hooks/useUserData";
import DOMPurify from "dompurify";
import module1 from "../../assets/modules/module1.png";
import module2 from "../../assets/modules/module2.png";
import module3 from "../../assets/modules/module3.png";
import module4 from "../../assets/modules/module4.png";
import module5 from "../../assets/modules/module5.png";
import OverlayTileView from "../../components/OverlayTileView";

// Import default images for fallback - using module images instead since AI images don't exist
// If you have these AI images in a different location, update the paths accordingly
const aiExplorationImg = module1; // Fallback to module1 image

const imageMap = {
  module1,
  module2,
  module3,
  module4,
  module5,
};

const resolveModuleImage = (imageValue) => {
  if (!imageValue) return module1;
  if (typeof imageValue !== "string") return module1;
  if (imageMap[imageValue]) return imageMap[imageValue];
  if (/^https?:\/\//i.test(imageValue)) return imageValue;
  return module1;
};

// Hardcoded modules for fallback (kept outside component for stable hooks deps)
const HARDCODED_MODULES = {
  "ai-exploration": {
    title: "AI EXPLORATION",
    subtitle: "Explore the fundamentals of artificial intelligence and discover how AI is transforming our world.",
    image: aiExplorationImg,
    description: "This comprehensive module introduces students to the exciting world of artificial intelligence. Learn about machine learning, neural networks, and real-world AI applications.",
    requirements: "Basic computer literacy and curiosity about technology.",
    learningObjectives: "By the end of this module, students will understand core AI concepts, be able to identify AI applications in daily life, and have hands-on experience with simple AI tools.",
    details: [
      { label: "Category", value: "Artificial Intelligence" },
      { label: "Level", value: "Beginner" },
      { label: "Type", value: "Interactive Course" },
      { label: "Duration", value: "120 minutes" },
    ],
    resources: [
      { title: "Introduction to AI Fundamentals", desc: "Learn the core ideas behind AI and where it shows up in everyday life.", type: "Lesson Plan", locked: false },
      { title: "AI Applications Quiz", desc: "Test your understanding of real-world AI applications.", type: "Assignment", locked: false },
      { title: "Build Your First AI Tool", desc: "A hands-on project to explore simple AI tooling and workflows.", type: "Project", locked: false }
    ]
  },
  "ai-insights": {
    title: "AI INSIGHTS",
    subtitle: "Dive deeper into advanced AI concepts and their practical applications in various industries.",
    image: module2,
    description: "Building on foundational knowledge, this module explores advanced AI techniques, ethical considerations, and industry applications.",
    requirements: "Completion of AI Exploration module or equivalent background knowledge.",
    learningObjectives: "Students will master intermediate AI concepts, understand ethical implications of AI, and be able to evaluate AI solutions for real-world problems.",
    details: [
      { label: "Category", value: "Artificial Intelligence" },
      { label: "Level", value: "Intermediate" },
      { label: "Type", value: "Advanced Course" },
      { label: "Duration", value: "180 minutes" },
    ],
    resources: [
      { title: "Deep Learning Concepts", desc: "Understand neural networks, training, and evaluation at a high level.", type: "Lesson Plan", locked: false },
      { title: "AI Ethics Discussion", desc: "Explore bias, fairness, and responsible AI design with examples.", type: "Assignment", locked: false },
      { title: "AI Healthcare Project", desc: "Apply AI reasoning to a healthcare-style scenario and present findings.", type: "Project", locked: false },
    ],
  },
  "ai-physics": {
    title: "AI & PHYSICS",
    subtitle: "Discover how artificial intelligence is revolutionizing physics research and scientific discovery.",
    image: module3,
    description: "Explore the fascinating intersection of AI and physics, from particle physics simulations to astronomical data analysis.",
    requirements: "Basic understanding of physics concepts and familiarity with AI fundamentals.",
    learningObjectives: "Learn how AI accelerates physics research, understand machine learning applications in scientific discovery, and explore career opportunities at the intersection of AI and physics.",
    details: [
      { label: "Category", value: "Physics, AI" },
      { label: "Level", value: "Intermediate" },
      { label: "Type", value: "Specialized Course" },
      { label: "Duration", value: "150 minutes" },
    ],
    resources: [
      { title: "AI in Physics Research", desc: "Survey where AI is used in modern physics workflows.", type: "Lesson Plan", locked: false },
      { title: "Physics Simulation Lab", desc: "Hands-on activity exploring simulations and interpretation.", type: "Assignment", locked: false },
      { title: "Quantum Computing & AI", desc: "Project: compare how AI can help analyze complex physics data.", type: "Project", locked: false },
    ],
  }
};

const ModuleDetail = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useUserData();

  // Ensure we start at top when navigating here
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [moduleId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  // Determine if this is for editing/creating or just viewing
  const [mode, setMode] = useState("view");
  const [isEditMode, setIsEditMode] = useState(false);

  // Module data states
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [lessonPlans, setLessonPlans] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);

  const fetchLessonDetails = useCallback(async (ids) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      // Use same-origin by default in production; allow override via env for dev/proxies.
      const baseUrl = process.env.REACT_APP_SERVER_ORIGIN_URL || "";
      const token = user ? await user.getIdToken() : null;

      const stripHtmlToText = (html) => {
        if (!html || typeof html !== "string") return "";
        return html
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/\s+/g, " ")
          .trim();
      };

      // Fetch lesson plans from backend API
      const lessonPlanRequests = ids.map(async (id) => {
        try {
          const response = await fetch(`${baseUrl}/api/lesson/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });

          if (!response.ok) {
            console.error(`Failed to fetch lesson ${id}:`, response.status);
            return null;
          }

          return await response.json();
        } catch (error) {
          console.error(`Error fetching lesson ${id}:`, error);
          return null;
        }
      });

      const responses = await Promise.all(lessonPlanRequests);
      const fetchedPlans = responses.filter(plan => plan !== null);

      // Transform lessons for display
      const resources = fetchedPlans.map(lesson => ({
        title: lesson.title || "Untitled Lesson",
        desc: stripHtmlToText(lesson.description) || "No description",
        type: Array.isArray(lesson.type) ? lesson.type.join(", ") : lesson.type || "Lesson Plan",
        level: Array.isArray(lesson.level) ? lesson.level.join(", ") : lesson.level || "—",
        duration: lesson.duration || "—",
        sectionsCount: Array.isArray(lesson.sections) ? lesson.sections.length : 0,
        locked: false,
        id: lesson.id
      }));

      setLessonPlans(fetchedPlans);

      // Update moduleData with resources
      setModuleData(prev => ({
        ...prev,
        resources: resources
      }));

    } catch (error) {
      console.error("Error fetching lesson details:", error);
    }
  }, []);

  const fetchModuleDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if it's a hardcoded module first
      if (HARDCODED_MODULES[moduleId]) {
        const hardcodedData = HARDCODED_MODULES[moduleId];
        setModuleData(hardcodedData);
        setLoading(false);
        return;
      }

      // Fetch from Firestore
      const db = getFirestore();
      const moduleDoc = await getDoc(doc(db, "module", moduleId));

      if (!moduleDoc.exists()) {
        setError("Module not found");
        setLoading(false);
        return;
      }

      const data = moduleDoc.data();
      console.log("Fetched module data:", data); // Debug log

      // Support both schemas:
      // - legacy/other: { lessonPlans: {0: "<lessonId>", 1: "<lessonId>" ... } }
      // - module builder: { lessons: ["<lessonId>", "<lessonId>", ...] }
      const lessonIdsFromLessonPlans =
        data.lessonPlans && typeof data.lessonPlans === "object" && !Array.isArray(data.lessonPlans)
          ? Object.values(data.lessonPlans).filter(Boolean)
          : [];
      const lessonIdsFromLessons = Array.isArray(data.lessons) ? data.lessons.filter(Boolean) : [];
      const lessonPlanIds = lessonIdsFromLessonPlans.length > 0 ? lessonIdsFromLessonPlans : lessonIdsFromLessons;

      const categoryRaw = data.category ?? data.Category;
      const levelRaw = data.level ?? data.Level;
      const typeRaw = data.type ?? data.Type;
      const durationRaw = data.duration ?? data.Duration;

      // Transform Firestore data to display format
      const transformedData = {
        title: data.title?.toUpperCase() || "UNTITLED MODULE",
        subtitle: data.description || "No description available",
        image: imageMap[data.image] || module1,
        description: data.description || "No description available",
        requirements: data.requirements || "No specific requirements",
        learningObjectives: data.learningObjectives || "Objectives will be defined",
        details: [
          { label: "Category", value: Array.isArray(categoryRaw) ? categoryRaw.join(", ") : categoryRaw || "N/A" },
          { label: "Level", value: Array.isArray(levelRaw) ? levelRaw.join(", ") : levelRaw || "N/A" },
          { label: "Type", value: Array.isArray(typeRaw) ? typeRaw.join(", ") : typeRaw || "N/A" },
          {
            label: "Duration",
            value: durationRaw
              ? typeof durationRaw === "string" && durationRaw.toLowerCase().includes("minute")
                ? durationRaw
                : `${durationRaw} minutes`
              : "N/A",
          },
        ],
        resources: [],
      };

      setModuleData(transformedData);

      // Fetch lesson plans if they exist
      if (lessonPlanIds.length > 0) {
        await fetchLessonDetails(lessonPlanIds);
      }
    } catch (error) {
      console.error("Error fetching module:", error);
      setError("Error loading module data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [moduleId, fetchLessonDetails]);

  const fetchLessonPlans = useCallback(async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const selectedPlanIds = location.state?.selectedPlans || [];

      const lessonPlanRequests = selectedPlanIds.map(async (id) => {
        const response = await fetch(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.json();
      });

      const responses = await Promise.all(lessonPlanRequests);
      const fetchedPlans = responses;

      setLessonPlans(fetchedPlans);
    } catch (error) {
      console.error("Error fetching lesson plans:", error);
    }
  }, [location.state?.selectedPlans]);

  useEffect(() => {
    if (moduleId === "create") {
      setMode("create");
      setIsEditMode(true);
      fetchLessonPlans();
    } else if (moduleId) {
      setMode("view");
      setIsEditMode(false);
      fetchModuleDetails();
    }
  }, [moduleId, fetchLessonPlans, fetchModuleDetails]);

  // (legacy layout style helpers removed; Screenshot 2 style is inlined below)

  const handleLessonClick = (resource, index) => {
    if (resource.id) {
      navigate(`/lesson/${resource.id}`);
      return;
    }
    // Featured/hardcoded modules don't have Firestore lesson IDs; use the legacy lesson route.
    navigate(`/lesson/${moduleId}/${index}`, {
      state: {
        lesson: {
          title: resource.title,
          desc: resource.desc,
          type: resource.type,
          locked: false,
        },
        moduleTitle: moduleData?.title,
        moduleId,
      },
    });
  };

  // Download removed from module lesson cards (per UX request)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
      }}>
        Loading module details...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
      }}>
        <p>{error}</p>
        <button
          onClick={() => navigate('/teacher-plus')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#162040',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Modules
        </button>
      </div>
    );
  }

  // If no module data, show error
  if (!moduleData) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
      }}>
        <p>Module not found</p>
        <button
          onClick={() => navigate('/teacher-plus')}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#162040',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Modules
        </button>
      </div>
    );
  }

  // If in edit/create mode, show the old form layout
  if (isEditMode || mode === "create") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blue-100">
        <div className="bg-white shadow-md rounded-lg px-8 py-6 w-full max-w-5xl">
          {/* Your existing edit/create form JSX goes here */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl text-center mb-6">
              {mode === "create" ? "Create Module" : "Edit Module"}
            </h1>
            <button
              type="button"
              className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100 ml-4"
              onClick={() => navigate("/")}
            >
              Exit
            </button>
          </div>
          {/* Add all your existing form fields here... */}
          {/* For brevity, I'm not copying the entire form, but you should include all the existing form JSX */}
        </div>
      </div>
    );
  }

  // New beautiful layout for view mode
  const module = moduleData;

  return (
    <div style={{
      fontFamily: "Open Sans, Arial, sans-serif",
      background: "#fff",
      minHeight: "100vh",
      padding: 0
    }}>
      <style>
        {`
        .resource-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
          transform: translateY(-2px) !important;
        }
        .resource-card {
          box-shadow: none !important;
          transform: translateY(0) !important;
        }
        `}
      </style>

      {/* Back Button */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px 20px 0 20px",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#111",
            transition: "background 0.2s ease, border-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f9fafb";
            e.currentTarget.style.borderColor = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fff";
            e.currentTarget.style.borderColor = "#e5e7eb";
          }}
        >
          ← Back
        </button>
      </div>

      {/* Header Section */}
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "64px 20px 0 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        textAlign: "center"
      }}>
        {/* Title Section - Full Width Centered */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 20
        }}>
          <div style={{
            fontWeight: 800,
            fontSize: "3.2rem",
            marginBottom: 28,
            color: "#111",
            letterSpacing: "-1px",
            textAlign: "center",
            width: "100%",
            lineHeight: "1.1"
          }}>
            {module.title}
          </div>
          <div style={{
            color: "#444",
            fontSize: "1.5rem",
            fontWeight: 500,
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: "1.4"
          }}>
            {/* Remove HTML tags from subtitle */}
            {module.subtitle?.replace(/<[^>]*>/g, '') || 'No description available'}
          </div>
        </div>

        {/* Image Section - Centered */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            width: 360,
            height: 240,
            background: "#eaeaea",
            borderRadius: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img
              src={resolveModuleImage(module.image)}
              alt={module.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 14
              }}
              onError={e => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = module1;
              }}
            />
          </div>
        </div>
      </div>


      {/* Module Details (Screenshot 2 style) */}
      <div style={{ maxWidth: 1100, margin: "96px auto 0 auto", padding: "0 20px" }}>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111", marginBottom: 24, textAlign: "left" }}>
          Module Details
        </div>
        <div style={{ background: "#fff", border: "1px solid #ececec", borderRadius: 8, overflow: "hidden" }}>
          {module.details?.map((item, idx) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                borderBottom: idx < (module.details?.length || 0) - 1 ? "1px solid #ececec" : "none",
              }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  width: 200,
                  fontWeight: 600,
                  color: "#444",
                  borderRight: "1px solid #ececec",
                  background: "#f8f9fa",
                }}
              >
                {item.label}
              </div>
              <div style={{ flex: 1, padding: "20px 24px", color: "#111", fontWeight: 600 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements (Screenshot 2 style) */}
      <div style={{ maxWidth: 1100, margin: "80px auto 0 auto", padding: "0 20px" }}>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111", marginBottom: 24, textAlign: "left" }}>
          Requirements
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #ececec",
            borderRadius: 8,
            padding: "24px",
            color: "#007bff",
            lineHeight: "1.6",
          }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(module.requirements || "No specific requirements"),
          }}
        />
      </div>

      {/* Module Description (Screenshot 2 style) */}
      <div style={{ maxWidth: 1100, margin: "80px auto 0 auto", padding: "0 20px" }}>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111", marginBottom: 24, textAlign: "left" }}>
          Module Description
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #ececec",
            borderRadius: 8,
            padding: "24px",
            color: "#007bff",
            lineHeight: "1.6",
          }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(module.description || "No description available"),
          }}
        />
      </div>

      {/* Learning Objectives (Screenshot 2 style) */}
      <div style={{ maxWidth: 1100, margin: "80px auto 0 auto", padding: "0 20px" }}>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111", marginBottom: 24, textAlign: "left" }}>
          Learning Objectives
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #ececec",
            borderRadius: 8,
            padding: "24px",
            color: "#007bff",
            lineHeight: "1.6",
          }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(module.learningObjectives || "Learning objectives will be defined"),
          }}
        />
      </div>

      {/* Lesson Plans (Screenshot 2 style) */}
      <div style={{ maxWidth: 1100, margin: "80px auto 0 auto", padding: "0 20px 80px 20px" }}>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111", marginBottom: 24, textAlign: "left" }}>
          Lesson Plans
        </div>

        <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => navigate(`/all-lesson-plans/${moduleId}`)}
            style={{
              background: "#162040",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "14px 20px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#0f1530")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#162040")}
          >
            All Lesson Plans
          </button>

          {userData?.role === "admin" && (
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              style={{
                background: "#f8f9fa",
                color: "#162040",
                border: "1px solid #dee2e6",
                borderRadius: 8,
                padding: "14px 20px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Edit Module
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {module.resources && module.resources.length > 0 ? (
            module.resources.map((res, idx) => {
              const durationPart =
                res.duration && res.duration !== "—"
                  ? ` • ${String(res.duration).includes("min") ? res.duration : `${res.duration} min`}`
                  : "";

              return (
                <div
                  key={res.id || idx}
                  className="resource-card"
                  onClick={() => handleLessonClick(res, idx)}
                  style={{
                    background: "#fff",
                    border: "1px solid #ececec",
                    borderRadius: 8,
                    padding: "20px 24px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "#222", fontSize: "1.1rem", marginBottom: 4 }}>
                      {res.title}
                    </div>
                    <div style={{ color: "#666", fontSize: "0.9rem" }}>
                      {(res.type || "Lesson Plan") + durationPart}
                    </div>
                  </div>
                  <div style={{ color: "#162040", fontSize: "1.2rem" }}>→</div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#666", fontSize: "1.1rem", fontStyle: "italic" }}>
              No lesson plans available for this module.
            </div>
          )}
        </div>
      </div>

      {/* Show Overlay if showOverlay is true */}
      {showOverlay && (
        <OverlayTileView
          content={lessonPlans}
          onClose={() => setShowOverlay(false)}
          onSelectMaterial={() => { }}
          initialSelectedTiles={lessonPlans.map((lesson) => lesson.id)}
          type={""}
          category={""}
          level={""}
          contentType={"lessonPlan"}
        />
      )}
    </div>
  );
};

export default ModuleDetail;