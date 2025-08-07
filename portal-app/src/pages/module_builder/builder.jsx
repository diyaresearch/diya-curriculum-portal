import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import OverlayTileView from "../../pages/module_builder/OverlayTileView";
import UploadContent from "../upload-content/index";
import useUserData from "../../hooks/useUserData";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import NuggetBuilderPage from "../nugget-builder";
import LessonPlanBuilder from "../lesson-plans/builder";

Modal.setAppElement("#root");

const CATEGORY_OPTIONS = [
  "AI Principles",
  "Data Science",
  "Machine Learning",
  "Statistics",
  "Other"
];
const LEVEL_OPTIONS = [
  "Basic",
  "Intermediate",
  "Advanced"
];
const TYPE_OPTIONS = [
  "Lecture",
  "Assignment",
  "Dataset"
];


// --- MultiCheckboxDropdown component ---
function MultiCheckboxDropdown({ label, options, selected, onChange, placeholder }) {

  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleCheckboxChange = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", marginBottom: 0 }}>
      <label style={{ fontWeight: 600, marginBottom: 6, display: "block", color: "#222" }}>
        {label}
      </label>
      <div
        style={{
          border: "1.5px solid #bbb",
          borderRadius: 6,
          background: "#fafbfc",
          padding: "10px 14px",
          cursor: "pointer",
          minHeight: 40,
          fontFamily: "Open Sans, sans-serif",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {selected.length === 0 ? (
          <span style={{ color: "#888" }}>{placeholder}</span>
        ) : (
          selected.join(", ")
        )}
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #bbb",
            borderRadius: 6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            zIndex: 100,
            maxHeight: 180,
            overflowY: "auto",
            marginTop: 2,
          }}
        >
          {options.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => handleCheckboxChange(opt)}
                style={{ marginRight: 8 }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Add this helper for required asterisks
const RequiredAsterisk = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

const ModuleBuilder = () => {
  const [formData, setFormData] = useState({
    title: "",
    category: [],
    type: [],
    level: [],
    duration: "",
    description: "",
    isPublic: false,
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [portalContent, setPortalContent] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [showNuggetBuilderModal, setShowNuggetBuilderModal] = useState(false);
  const [showLessonPlanBuilderModal, setShowLessonPlanBuilderModal] = useState(false);
  const [createdLessonPlans, setCreatedLessonPlans] = useState([]);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { userData } = useUserData();
  

  // Load draft from localStorage if present
  useEffect(() => {
    const savedDraft = localStorage.getItem("moduleDraft");
    if (savedDraft && portalContent.length > 0) {
      const parsedDraft = JSON.parse(savedDraft);
      setFormData({
        title: parsedDraft.title || "",
        category: parsedDraft.category || [],
        type: parsedDraft.type || [],
        level: parsedDraft.level || [],
        duration: parsedDraft.duration || "",
        description: parsedDraft.description || "",
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
  }, [portalContent]);

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
    const db = getFirestore();
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
    setFormData({
      ...formData,
      [id]: id === "duration" ? (value === "" ? "" : parseInt(value, 10)) : value,
    });
  };

  const handleDescriptionChange = (value) => {
    setFormData({ ...formData, description: value });
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
    const draftData = {
      ...formData,
      lessons: selectedMaterials.map((material) => material.id),
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

    if (
      !formData.title ||
      !formData.description ||
      formData.description.trim() === "" ||
      formData.description === "<p><br></p>" ||
      formData.category.length === 0 ||
      formData.type.length === 0 ||
      formData.level.length === 0 ||
      !formData.duration
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
      const moduleData = {
        ...formData,
        lessons: selectedMaterials.map((material) => material.id),
        author: user.uid,
        isDraft: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "module"), moduleData);

      setModalMessage("Module generated successfully");
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
    setFormData({
      title: "",
      category: [],
      type: [],
      level: [],
      duration: "",
      description: "",
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

  // --- Overlay modal styles for "Add Existing Lesson Plans" ---
  const overlayTileViewStyles = {
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
    },
    overlay: {
      backgroundColor: "rgba(0,0,0,0.75)",
      zIndex: 1000,
    },
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
          Module Builder
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
            <MultiCheckboxDropdown
              label={<span>Category <RequiredAsterisk /></span>}
              options={CATEGORY_OPTIONS}
              selected={formData.category || []}
              onChange={(values) => setFormData({ ...formData, category: values })}
              placeholder="Select category..."
            />
          </div>
          <div>
            <MultiCheckboxDropdown
              label={<span>Level <RequiredAsterisk /></span>}
              options={LEVEL_OPTIONS}
              selected={formData.level || []}
              onChange={(values) => setFormData({ ...formData, level: values })}
              placeholder="Select level..."
            />
          </div>
          <div>
            <MultiCheckboxDropdown
              label={<span>Type <RequiredAsterisk /></span>}
              options={TYPE_OPTIONS}
              selected={formData.type || []}
              onChange={(values) => setFormData({ ...formData, type: values })}
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
              id="duration"
              type="text"
              placeholder="Duration"
              value={formData.duration}
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
                    <a
                      href={`/lesson-details/${material.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
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
                    </a>
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
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="isPublic" style={{ color: "#111", fontWeight: 600 , fontSize: "1.08rem"}}>
              Make Public
            </label>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
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
          type={formData.type}
          category={formData.category}
          level={formData.level}
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
              setCreatedLessonPlans(prev => [...prev, newLesson]);
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