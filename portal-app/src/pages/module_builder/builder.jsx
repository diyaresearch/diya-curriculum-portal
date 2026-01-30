import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import OverlayTileView from "../../pages/module_builder/OverlayTileView";
import UploadContent from "../upload-content/index";
import useUserData from "../../hooks/useUserData";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import NuggetBuilderPage from "../nugget-builder";
import LessonPlanBuilder from "../lesson-plans/builder";
import { CATEGORY_OPTIONS, LEVEL_OPTIONS, TYPE_OPTIONS } from "../../constants/formOptions";
import MultiCheckboxDropdown from "../../components/MultiCheckboxDropdown";

// Avoid test/runtime crashes when #root is not present (e.g. Jest)
if (typeof document !== "undefined") {
  const appRoot = document.getElementById("root");
  if (appRoot) Modal.setAppElement(appRoot);
}

// Add this helper for required asterisks
const RequiredAsterisk = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

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

function getDetailValue(details, label) {
  const target = String(label || "").trim().toLowerCase();
  const item = (details || []).find((d) => String(d?.label || "").trim().toLowerCase() === target);
  return item?.value ?? "";
}

function normalizeToArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  const s = String(value).trim();
  if (!s) return [];
  // Split comma-separated values from older schemas
  if (s.includes(",")) return s.split(",").map((v) => v.trim()).filter(Boolean);
  return [s];
}

const ModuleBuilder = ({ onCancel } = {}) => {
  const [formData, setFormData] = useState({
    title: "",
    Category: [],
    Type: [],
    Level: [],
    Duration: "",
    description: "",
    requirements: "", // Add this
    learningObjectives: "", // Add this
    isPublic: false,
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [portalContent, setPortalContent] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [showNuggetBuilderModal, setShowNuggetBuilderModal] = useState(false);
  const [showLessonPlanBuilderModal, setShowLessonPlanBuilderModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  useUserData();

  const editModuleId = location.state?.editModuleId || null;
  const returnTo = location.state?.returnTo || null;
  const [editModuleAuthorUid, setEditModuleAuthorUid] = useState("");
  const [prefillLessonIds, setPrefillLessonIds] = useState([]);
  const didPrefillLessonsRef = useRef(false);

  const handleBack = () => {
    // Prefer explicit return path when editing from module detail.
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    // If opened from another screen/modal, prefer closing that context.
    if (typeof onCancel === "function") {
      onCancel();
      return;
    }
    // Otherwise go back (with safe fallback).
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const handleCancel = () => {
    // If opened from another screen/modal, prefer closing that context.
    if (typeof onCancel === "function") {
      onCancel();
      return;
    }
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    // Otherwise go back (with safe fallback).
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };


  // Load draft from localStorage if present
  useEffect(() => {
    const savedDraft = localStorage.getItem("moduleDraft");
    if (editModuleId) return;
    if (savedDraft && portalContent.length > 0) {
      const parsedDraft = JSON.parse(savedDraft);
      setFormData({
        title: parsedDraft.title || "",
        Category: parsedDraft.Category || parsedDraft.category || [],
        Type: parsedDraft.Type || parsedDraft.type || [],
        Level: parsedDraft.Level || parsedDraft.level || [],
        Duration: parsedDraft.Duration || parsedDraft.duration || "",
        description: parsedDraft.description || "",
        requirements: parsedDraft.requirements || "",
        learningObjectives: parsedDraft.learningObjectives || "",
        isPublic: parsedDraft.isPublic || false,
      });
      // Restore selected lesson plans/materials if present
      if (parsedDraft.lessons && Array.isArray(parsedDraft.lessons)) {
        setSelectedMaterials(parsedDraft.lessons.map(id => {
          // Try to find full lesson object from portalContent, fallback to just id
          return portalContent.find(item => item.id === id) || { id };
        }));
      }
      localStorage.removeItem("moduleDraft");
    }
  }, [portalContent, editModuleId]);

  // Edit mode: fetch and prefill existing module
  useEffect(() => {
    if (!editModuleId) return;
    (async () => {
      try {
        const db = getFirestore();
        const snap = await getDoc(doc(db, "module", editModuleId));
        if (!snap.exists()) {
          setModalMessage("Module not found for editing");
          setModalIsOpen(true);
          return;
        }
        const data = snap.data() || {};
        const details = Array.isArray(data.details) ? data.details : [];
        console.log("PPARTHAS ",data);
        console.log("PPARTHAS details ", details);
        const authorUid = data.author || data.authorId || "";
        setEditModuleAuthorUid(authorUid);

        const titleRaw = data.title ?? data.Title ?? data.name ?? data.Name ?? "";
        const descriptionRaw = data.description ?? data.Description ?? data.subtitle ?? data.Subtitle ?? "";
        const requirementsRaw = data.requirements ?? data.Requirements ?? "";
        const learningObjectivesRaw =
          data.learningObjectives ?? data.LearningObjectives ?? data.objectives ?? data.Objectives ?? "";

        const categoryRaw =
          data.Category ?? data.category ?? data.categories ?? data.Categories ?? getDetailValue(details, "Category");
        const typeRaw = data.Type ?? data.type ?? data.types ?? data.Types ?? getDetailValue(details, "Type");
        const levelRaw = data.Level ?? data.level ?? data.levels ?? data.Levels ?? getDetailValue(details, "Level");
        const durationRaw =
          data.Duration ?? data.duration ?? data.minutes ?? data.Minutes ?? getDetailValue(details, "Duration") ?? "";

          console.log("PPARTHAS titleRaw ", titleRaw);
          console.log("PPARTHAS descriptionRaw ", descriptionRaw);
          console.log("PPARTHAS requirementsRaw ", requirementsRaw);
          console.log("PPARTHAS learningObjectivesRaw ", learningObjectivesRaw);
          console.log("PPARTHAS categoryRaw ", categoryRaw);
          console.log("PPARTHAS typeRaw ", typeRaw);
          console.log("PPARTHAS levelRaw ", levelRaw);
          console.log("PPARTHAS durationRaw ", durationRaw);
        const lessonIdsFromLessonPlans =
          data.lessonPlans && typeof data.lessonPlans === "object" && !Array.isArray(data.lessonPlans)
            ? Object.values(data.lessonPlans).filter(Boolean)
            : [];
        const lessonIdsFromLessons = Array.isArray(data.lessons) ? data.lessons.filter(Boolean) : [];
        const lessonIds =
          lessonIdsFromLessonPlans.length > 0 ? lessonIdsFromLessonPlans : lessonIdsFromLessons;

        setFormData({
          title: titleRaw || "",
          Category: normalizeToArray(categoryRaw),
          Type: normalizeToArray(typeRaw),
          Level: normalizeToArray(levelRaw),
          Duration: durationRaw ?? "",
          description: descriptionRaw || "",
          requirements: requirementsRaw || "",
          learningObjectives: learningObjectivesRaw || "",
          isPublic: normalizeBoolean(data.isPublic ?? data.IsPublic),
        });

        setPrefillLessonIds(lessonIds);
        didPrefillLessonsRef.current = false;
      } catch (err) {
        console.error("ModuleBuilder: failed to load module for edit", err);
        setModalMessage("Error loading module for editing");
        setModalIsOpen(true);
      }
    })();
  }, [editModuleId]);

  // Once we have portalContent (lessons) and module lesson ids, prefill selection.
  useEffect(() => {
    if (!editModuleId) return;
    if (didPrefillLessonsRef.current) return;
    if (!prefillLessonIds || prefillLessonIds.length === 0) {
      didPrefillLessonsRef.current = true;
      setSelectedMaterials([]);
      return;
    }
    if (portalContent.length === 0) return;

    didPrefillLessonsRef.current = true;
    setSelectedMaterials(
      prefillLessonIds.map((id) => portalContent.find((item) => item.id === id) || { id })
    );
  }, [editModuleId, portalContent, prefillLessonIds]);

  // --- Fetch lesson plans for overlay ---
  const fetchLessonPlans = async (userId) => {
    const db = getFirestore();
    const lessonsQuery = query(
      collection(db, "lesson"),
      where("authorId", "==", userId)
    );
    const snapshot = await getDocs(lessonsQuery);
    const userLessons = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        category: Array.isArray(doc.data().category)
          ? doc.data().category
          : doc.data().category
            ? [doc.data().category]
            : [],
        type: Array.isArray(doc.data().type)
          ? doc.data().type
          : doc.data().type
            ? [doc.data().type]
            : [],
        level: Array.isArray(doc.data().level)
          ? doc.data().level
          : doc.data().level
            ? [doc.data().level]
            : [],
      }))
      .filter(lesson => lesson.isDraft !== true);
    setPortalContent(userLessons);
  };

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPortalContent([]);
        return;
      }
      fetchLessonPlans(user.uid);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: id === "Duration" ? (value === "" ? "" : parseInt(value, 10)) : value,
    }));
  };

  const handleDescriptionChange = (value) => {
    setFormData((prev) => ({ ...prev, description: value }));
  };

  const handleRequirementsChange = (value) => {
    setFormData((prev) => ({ ...prev, requirements: value }));
  };

  const handleLearningObjectivesChange = (value) => {
    setFormData((prev) => ({ ...prev, learningObjectives: value }));
  };

  // --- Save as Draft ---
  const handleSaveSession = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to save a draft.");
      return;
    }
    const db = getFirestore();
    const lessonIds = selectedMaterials.map((material) => material.id);
    const lessonPlans = lessonIds.reduce((acc, id, idx) => {
      acc[idx] = id;
      return acc;
    }, {});
    const draftData = {
      ...formData,
      lessons: lessonIds,
      lessonPlans,
      author: user.uid,
      isDraft: true,
      updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, "module"), draftData);
    localStorage.removeItem("moduleDraft");
    alert("Module draft saved successfully!");
    window.location.reload();
  };

  // --- Submit (Publish) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Update the validation in handleSubmit function (around line 170)
    if (
      !formData.title ||
      !formData.description ||
      formData.description.trim() === "" ||
      formData.description === "<p><br></p>" ||
      !formData.requirements ||
      formData.requirements.trim() === "" ||
      formData.requirements === "<p><br></p>" ||
      !formData.learningObjectives ||
      formData.learningObjectives.trim() === "" ||
      formData.learningObjectives === "<p><br></p>" ||
      formData.Category.length === 0 ||
      formData.Type.length === 0 ||
      formData.Level.length === 0 ||
      !formData.Duration
    ) {
      alert("Please fill all required fields.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setModalMessage("User not authenticated");
      setModalIsOpen(true);
      setIsSubmitting(false);
      return;
    }

    try {
      const db = getFirestore();
      const lessonIds = selectedMaterials.map((material) => material.id);
      const lessonPlans = lessonIds.reduce((acc, id, idx) => {
        acc[idx] = id;
        return acc;
      }, {});
      const moduleData = {
        ...formData,
        lessons: lessonIds,
        lessonPlans,
        author: editModuleId ? (editModuleAuthorUid || user.uid) : user.uid,
        isDraft: false,
        updatedAt: serverTimestamp(),
      };

      if (editModuleId) {
        await updateDoc(doc(db, "module", editModuleId), moduleData);
      } else {
        await addDoc(collection(db, "module"), { ...moduleData, createdAt: serverTimestamp() });
      }

      setModalMessage(editModuleId ? "Module updated successfully" : "Module generated successfully");
      setModalIsOpen(true);
      setIsSubmitting(false);
      localStorage.removeItem("moduleDraft");
    } catch (error) {
      setModalMessage("Error generating module: " + error.message);
      setModalIsOpen(true);
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
    if (editModuleId) {
      navigate(returnTo || `/module/${editModuleId}`);
      return;
    }
    setFormData({
      title: "",
      Category: [],
      Type: [],
      Level: [],
      Duration: "",
      description: "",
      requirements: "", // Add this
      learningObjectives: "", // Add this
      isPublic: false,
    });
    setSelectedMaterials([]);
    localStorage.removeItem("moduleDraft");
    window.location.reload();
  };

  const onSelectMaterial = (material) => {
    const alreadySelected = selectedMaterials.find((m) => m.id === material.id);

    if (alreadySelected) {
      setSelectedMaterials(selectedMaterials.filter((m) => m.id !== material.id));
    } else {
      setSelectedMaterials([...selectedMaterials, material]);
    }
  };

  const removeMaterial = (materialId) => {
    setSelectedMaterials(selectedMaterials.filter((m) => m.id !== materialId));
  };

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      width: "95vw",
      maxWidth: "540px",
      maxHeight: "90vh",
      overflowY: "auto",
      padding: "20px",
      textAlign: "center",
      borderRadius: "12px",
      boxSizing: "border-box",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      zIndex: 1000,
    },
  };

  const closeUploadModal = () => setShowUploadModal(false);

  const handleNewNuggetAdded = (newNugget) => {
    setShowUploadModal(false);
    setSelectedMaterials([...selectedMaterials, newNugget]);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: "#F6F8FA",
        minHeight: "100vh",
        width: "100%",
        paddingTop: "60px",
        color: "#111",
        fontFamily: "Open Sans, sans-serif"
      }}
    >
      {/* Back button (match module page behavior) */}
      <div style={{ width: "100%", maxWidth: 700, marginBottom: 8, padding: "0 8px" }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "#162040",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          {"< Back"}
        </button>
      </div>
      <div style={{ width: "100%", maxWidth: 700, marginBottom: 32, textAlign: "center" }}>
        <h2
          style={{
            fontSize: "2.8rem",
            fontWeight: "700",
            color: "#111",
            margin: 0,
            letterSpacing: "1px",
            fontFamily: "Open Sans, sans-serif"
          }}
        >
          {editModuleId ? "Edit Module" : "Module Builder"}
        </h2>
        <p
          style={{
            marginTop: 16,
            fontSize: "1.18rem",
            color: "#111",
            fontWeight: 500,
            fontFamily: "Open Sans, sans-serif"
          }}
        >
          Design your modules and share them with your students and the borader community.
        </p>
      </div>
      <div
        className="w-full max-w-3xl relative"
        style={{
          background: "#fff",
          border: "2px solid #e5e7eb",
          borderRadius: "12px",
          boxShadow: "0 4px 24px rgba(22,32,64,0.10)",
          padding: "48px 40px 40px 40px",
          marginBottom: "32px",
          color: "#111",
          fontFamily: "Open Sans, sans-serif"
        }}
      >
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            style={{
              color: "#111",
              fontFamily: "Open Sans, sans-serif"
            }}
            onClick={() => navigate("/module_builder/drafts")}
          >
            Drafts
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            color: "#111",
            fontFamily: "Open Sans, sans-serif"
          }}
        >
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Title <RequiredAsterisk />
            </label>
            <input
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid #bbb",
                fontSize: "1.08rem",
                color: "#111",
                fontFamily: "Open Sans, sans-serif"
              }}
              id="title"
              type="text"
              placeholder="Module Title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Description <RequiredAsterisk />
            </label>
            <ReactQuill
              theme="snow"
              value={formData.description}
              onChange={handleDescriptionChange}
              style={{ background: "#fff", borderRadius: 6, color: "#111", fontFamily: "Open Sans, sans-serif" }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Requirements <RequiredAsterisk />
            </label>
            <ReactQuill
              theme="snow"
              value={formData.requirements}
              onChange={handleRequirementsChange}
              style={{ background: "#fff", borderRadius: 6, color: "#111", fontFamily: "Open Sans, sans-serif" }}

            />
          </div>

          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Learning Objectives <RequiredAsterisk />
            </label>
            <ReactQuill
              theme="snow"
              value={formData.learningObjectives}
              onChange={handleLearningObjectivesChange}
              style={{ background: "#fff", borderRadius: 6, color: "#111", fontFamily: "Open Sans, sans-serif" }}
            />
          </div>
          <div>
            <MultiCheckboxDropdown
              label={<span>Category <RequiredAsterisk /></span>}
              options={CATEGORY_OPTIONS}
              selected={formData.Category || []}
              onChange={(values) => setFormData((prev) => ({ ...prev, Category: values }))}
              placeholder="Select category..."
            />
          </div>
          <div>
            <MultiCheckboxDropdown
              label={<span>Level <RequiredAsterisk /></span>}
              options={LEVEL_OPTIONS}
              selected={formData.Level || []}
              onChange={(values) => setFormData((prev) => ({ ...prev, Level: values }))}
              single={true}
              placeholder="Select level..."
            />
          </div>
          <div>
            <MultiCheckboxDropdown
              label={<span>Type <RequiredAsterisk /></span>}
              options={TYPE_OPTIONS}
              selected={formData.Type || []}
              onChange={(values) => setFormData((prev) => ({ ...prev, Type: values }))}
              single={true}
              placeholder="Select type..."
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Duration (minutes) <RequiredAsterisk />
            </label>
            <input
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid #bbb",
                fontSize: "1.08rem",
                color: "#111",
                fontFamily: "Open Sans, sans-serif"
              }}
              id="Duration"
              type="text"
              placeholder="Duration"
              value={formData.Duration}
              onChange={handleChange}
              required
            />
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                style={{
                  background: "#fff",
                  color: "#111",
                  border: "1px solid #111",
                  borderRadius: "6px",
                  padding: "8px 18px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Open Sans, sans-serif"
                }}
                onClick={() => setShowOverlay(true)}
              >
                + Add Existing Lesson Plans
              </button>
              <button
                type="button"
                style={{
                  background: "#111C44",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 18px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Open Sans, sans-serif",
                  fontSize: "1.08rem"
                }}
                onClick={() => setShowLessonPlanBuilderModal(true)}
              >
                + Create New Lesson Plan
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "2px",
                marginTop: 6,
              }}
            >
              {selectedMaterials.map((material) => {
                return (
                  <div
                    key={material.id}
                    style={{
                      background: "#fafbfc",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      color: "#111",
                      fontFamily: "Open Sans, sans-serif",
                      boxShadow: "0 2px 8px rgba(22,32,64,0.06)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "fit-content",
                      maxWidth: "320px",
                      position: "relative",
                      margin: "4px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/lesson/${material.id}`)}
                      style={{
                        color: "#1a73e8",
                        textDecoration: "underline",
                        fontWeight: 700,
                        fontSize: "1.08rem",
                        background: "none",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                        maxWidth: "90%",
                        cursor: "pointer"
                      }}
                      title="View Lesson Details"
                    >
                      {material.title || material.Title || "Untitled Lesson"}
                    </button>
                    <button
                      onClick={() => removeMaterial(material.id)}
                      style={{
                        background: "none",
                        color: "#e74c3c",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        marginLeft: 0,
                        cursor: "pointer",
                        fontFamily: "Open Sans, sans-serif",
                        alignSelf: "flex-end"
                      }}
                      title="Remove"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="isPublic" style={{ color: "#111", fontWeight: 600, fontSize: "1.08rem" }}>
              Make Public
            </label>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: "#fff",
                color: "#111",
                border: "1px solid #111",
                borderRadius: "6px",
                padding: "8px 18px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem"
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSession}
              style={{
                background: "#fff",
                color: "#111",
                border: "1px solid #111",
                borderRadius: "6px",
                padding: "8px 18px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem"
              }}
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: isSubmitting ? "#bbb" : "#111C44",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "12px 32px",
                fontWeight: 700,
                fontSize: "1.08rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontFamily: "Open Sans, sans-serif"
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
        {/* Centered Overlay Modal for "Add Existing Lesson Plans" */}
        <Modal
          isOpen={showOverlay}
          onRequestClose={() => setShowOverlay(false)}

          contentLabel="Add Existing Lesson Plans"
        >
          <OverlayTileView
            content={portalContent}
            onClose={() => setShowOverlay(false)}
            onSelectMaterial={onSelectMaterial}
            initialSelectedTiles={selectedMaterials.map((item) => item.id)}
            contentType={"lesson"}
            typeOptions={["Lecture", "Assignment", "Dataset"]}
          />
        </Modal>
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Submission Result"
        >
          <h2>{modalMessage}</h2>
          <button
            onClick={closeModal}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Close
          </button>
        </Modal>
      </div>
      <Modal isOpen={showUploadModal} onRequestClose={closeUploadModal}>
        <UploadContent
          fromLesson={closeUploadModal}
          onNuggetCreated={handleNewNuggetAdded}
          isPublic={false}
          type={formData.Type}
          category={formData.Category}
          level={formData.Level}
        />
      </Modal>
      <Modal
        isOpen={showNuggetBuilderModal}
        onRequestClose={() => setShowNuggetBuilderModal(false)}
        style={customStyles}
        contentLabel="Create New Nugget"
      >
        <NuggetBuilderPage
          onSave={handleNewNuggetAdded}
          onCancel={() => setShowNuggetBuilderModal(false)}
        />
      </Modal>
      <Modal
        isOpen={showLessonPlanBuilderModal}
        onRequestClose={() => setShowLessonPlanBuilderModal(false)}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            width: "98vw",
            maxWidth: "1100px",
            maxHeight: "95vh",
            minHeight: "600px",
            overflowY: "auto",
            padding: "32px",
            textAlign: "center",
            borderRadius: "16px",
            boxSizing: "border-box",
            position: "relative",
          },
          overlay: {
            backgroundColor: "rgba(0,0,0,0.75)",
            zIndex: 1000,
          }
        }}
        contentLabel="Create New Lesson Plan"
      >
        {/* X button in top right */}
        <button
          onClick={() => setShowLessonPlanBuilderModal(false)}
          style={{
            position: "absolute",
            top: 18,
            right: 24,
            background: "none",
            border: "none",
            fontSize: "2.2rem",
            color: "#888",
            cursor: "pointer",
            zIndex: 2000,
            fontWeight: 700,
            lineHeight: 1,
          }}
          aria-label="Close"
          type="button"
        >
          &times;
        </button>
        <LessonPlanBuilder
          showDrafts={false}
          showSaveAsDraft={false}
          onSave={async (newLesson) => {
            setShowLessonPlanBuilderModal(false);
            if (newLesson && newLesson.id) {
              setSelectedMaterials(prev => [...prev, newLesson]);
            }
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
              await fetchLessonPlans(user.uid); // Refresh lesson plans immediately
            }
          }}
          onCancel={() => setShowLessonPlanBuilderModal(false)}
        />
      </Modal>
    </div>
  );
};

export default ModuleBuilder;