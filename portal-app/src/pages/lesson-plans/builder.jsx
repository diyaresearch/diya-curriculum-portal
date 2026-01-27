import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, addDoc, setDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import OverlayTileView from "../../components/OverlayTileView";
import UploadContent from "../upload-content/index";
import useUserData from "../../hooks/useUserData";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import NuggetBuilderPage from "../nugget-builder";
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

const LessonPlanBuilder = ({ showSaveAsDraft, showDrafts, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    Category: [],
    Type: [],
    Level: [],
    Duration: "",
    sections: [],
    description: "",
    isPublic: false,
  });
  const [objectives, setObjectives] = useState([""]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [portalContent, setPortalContent] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [sections, setSections] = useState([{ intro: "", contentIds: [] }]);
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const [showNuggetBuilderModal, setShowNuggetBuilderModal] = useState(false);
  const [nuggetBuilderSectionIndex, setNuggetBuilderSectionIndex] = useState(null);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  useUserData();

  const handleCancel = () => {
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

  // Load user's nuggets for overlay
  useEffect(() => {
    const db = getFirestore();
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPortalContent([]);
        return;
      }
      const nuggetsQuery = query(
        collection(db, "content"),
        where("User", "==", user.uid)
      );
      getDocs(nuggetsQuery).then(snapshot => {
        const userNuggets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPortalContent(userNuggets);
      });
    });

    return () => unsubscribe();
  }, []);

  // Load draft from localStorage if present
  useEffect(() => {
    const savedDraft = localStorage.getItem("lessonPlanDraft");
    if (savedDraft) {
      const parsedDraft = JSON.parse(savedDraft);
      setFormData(parsedDraft);
      setSections(parsedDraft.sections || [{ intro: "", contentIds: [] }]);
      setObjectives(parsedDraft.objectives || [""]);
      const restoredMaterials = {};
      if (parsedDraft.sections) {
        parsedDraft.sections.forEach((section, index) => {
          restoredMaterials[index] = section.contentIds
            ? section.contentIds.map(
                (contentId) => portalContent.find((item) => item.id === contentId) || { id: contentId }
              )
            : [];
        });
      }
      setSelectedMaterials(restoredMaterials);
      localStorage.removeItem("lessonPlanDraft");
    }
  }, [portalContent]);

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

  // (Objective/section field change handlers removed; editing is done inline where used)

  const deleteSection = (index) => {
    const updatedSections = sections.filter((_, i) => i !== index);
    const updatedMaterials = Object.keys(selectedMaterials)
      .map((key) => parseInt(key, 10))
      .filter((key) => key !== index)
      .reduce((acc, key) => {
        const newKey = key > index ? key - 1 : key;
        acc[newKey] = selectedMaterials[key];
        return acc;
      }, {});
    setSections(updatedSections);
    setSelectedMaterials(updatedMaterials);
    setFormData((prevData) => ({
      ...prevData,
      sections: updatedSections,
    }));
  };

  const addSection = () => {
    setSections([...sections, { intro: "", contentIds: [] }]);
  };

  const handleCreateNewNugget = (sectionIndex) => {
    setNuggetBuilderSectionIndex(sectionIndex);
    setShowNuggetBuilderModal(true);
  };

  // Handler for when a new nugget is created from the modal
  const handleNuggetBuilderSave = async (newNugget) => {
    setShowNuggetBuilderModal(false);
    if (nuggetBuilderSectionIndex !== null) {
      setSelectedMaterials((prev) => ({
        ...prev,
        [nuggetBuilderSectionIndex]: [
          ...(prev[nuggetBuilderSectionIndex] || []),
          newNugget,
        ],
      }));
    }
    await reloadUserNuggets(); // <-- Add this line
  };

  // --- Save as Draft ---
  const handleSaveSession = async () => {
    // REMOVE learning objectives required check for draft!
    // (Do not check objectives[0] for draft save)

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to save a draft.");
      return;
    }
    const db = getFirestore();
    const draftData = {
      ...formData,
      objectives,
      sections: sections.map((section, index) => ({
        title: section.title || "",
        intro: section.intro || "",
        contentIds: (selectedMaterials[index]?.map((material) => material.id) || []),
      })),
      author: user.uid,
      isDraft: true,
      updatedAt: serverTimestamp(),
    };
    if (formData.id) {
      await setDoc(doc(db, "lesson", formData.id), draftData);
    } else {
      await addDoc(collection(db, "lesson"), draftData);
    }
    localStorage.removeItem("lessonPlanDraft");
    alert("Lesson plan draft saved successfully!");
    window.location.reload();
  };

  // --- Submit (Publish) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Require description
    if (!formData.description || formData.description.trim() === "" || formData.description === "<p><br></p>") {
      alert("Description is required.");
      setIsSubmitting(false);
      return;
    }
    // Require learning objectives
    if (!objectives[0] || objectives[0].trim() === "" || objectives[0] === "<p><br></p>") {
      alert("Learning objectives are required.");
      setIsSubmitting(false);
      return;
    }
    // Require section content
    if (sections.some(section => !section.intro || section.intro.trim() === "")) {
      alert("Section content is required for all sections.");
      setIsSubmitting(false);
      return;
    }

    // Require category, type, and level
    if (
      !formData.Category ||
      (Array.isArray(formData.Category) && formData.Category.length === 0) ||
      !formData.Type ||
      (Array.isArray(formData.Type) && formData.Type.length === 0) ||
      !formData.Level ||
      (Array.isArray(formData.Level) && formData.Level.length === 0)
    ) {
      alert("Category, Type, and Level are required.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setModalMessage("User not authenticated");
      setModalIsOpen(true);
      return;
    }

    const userId = user.uid;
    const token = await user.getIdToken();
    const url = `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/`;

    try {
      if (formData.isPublic) {
        const contentUpdates = sections.flatMap((section, index) => {
          const contentIds = selectedMaterials[index]?.map((material) => material.id) || [];
          if (!Array.isArray(contentIds) || contentIds.length === 0) {
            return [];
          }
          return contentIds.map((contentId) => {
            return fetch(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/update/${contentId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ isPublic: true }),
            });
          });
        });
        await Promise.all(contentUpdates);
      }

      const lessonData = {
        title: formData.title,
        category: formData.Category,
        type: formData.Type,
        level: formData.Level,
        objectives: objectives,
        duration: formData.Duration,
        description: formData.description,
        isPublic: formData.isPublic,
        sections: sections.map((section, index) => ({
          id: index,
          title: section.title, // <-- add this line
          intro: section.intro,
          contentIds: selectedMaterials[index]?.map((material) => material.id) || [],
        })),
        author: userId,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(lessonData),
      });

      if (!response.ok) {
        throw new Error("Error generating lesson plan");
      }
      const result = await response.json();
      if (onSave) {
        onSave({
          id: result.id,
          title: lessonData.title,
          // add other fields if needed
        });
      }

      // Remove the draft from Firestore if it exists
      if (formData.id) {
        const db = getFirestore();
        await deleteDoc(doc(db, "lesson", formData.id));
      }

      setModalMessage("Lesson plan generated successfully");
      setModalIsOpen(true);
      setIsSubmitting(false);
      localStorage.removeItem("lessonPlanDraft");
      // REMOVE window.location.reload(); from here!
    } catch (error) {
      setModalMessage("Error generating lesson plan: " + error.message);
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({
      title: "",
      category: "",
      type: "",
      level: "",
      duration: "",
      sections: [],
      description: "",
      isPublic: false,
    });
    setSections([{ intro: "", contentIds: [] }]);
    setSelectedMaterials({});
    setObjectives([""]);
    localStorage.removeItem("lessonPlanDraft");
    window.location.reload(); // Only here!
  };

  const onSelectMaterial = (material) => {
    const sectionMaterials = selectedMaterials[selectedSectionIndex] || [];
    const alreadySelected = sectionMaterials.find((m) => m.id === material.id);

    if (alreadySelected) {
      const updatedSectionMaterials = sectionMaterials.filter((m) => m.id !== material.id);
      setSelectedMaterials({
        ...selectedMaterials,
        [selectedSectionIndex]: updatedSectionMaterials,
      });
    } else {
      setSelectedMaterials({
        ...selectedMaterials,
        [selectedSectionIndex]: [...sectionMaterials, material],
      });
    }
  };

  const removeMaterial = (materialId, sectionIndex) => {
    const sectionMaterials = selectedMaterials[sectionIndex] || [];
    const updatedSectionMaterials = sectionMaterials.filter((m) => m.id !== materialId);
    setSelectedMaterials({
      ...selectedMaterials,
      [sectionIndex]: updatedSectionMaterials,
    });
  };

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      width: "95vw",           // Responsive width
      maxWidth: "540px",       // Limit max width
      maxHeight: "90vh",       // Limit max height
      overflowY: "auto",       // Scroll if content is too tall
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
    if (nuggetBuilderSectionIndex !== null) {
      setSelectedMaterials((prev) => ({
        ...prev,
        [nuggetBuilderSectionIndex]: [
          ...(prev[nuggetBuilderSectionIndex] || []),
          newNugget,
        ],
      }));
    }
  };

  const reloadUserNuggets = async () => {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const nuggetsQuery = query(
      collection(db, "content"),
      where("User", "==", user.uid)
    );
    const snapshot = await getDocs(nuggetsQuery);
    const userNuggets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPortalContent(userNuggets);
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
          Lesson Plan Builder
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
          Fill out details below to create comprehensive lesson plan that can be shared with your students and the community.
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
          {showDrafts !== false && (
            <button
              type="button"
              className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
              style={{
                color: "#111",
                fontFamily: "Open Sans, sans-serif"
              }}
              onClick={() => navigate("/lesson-plans/drafts")}
            >
              Drafts
            </button>
          )}
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
              placeholder="Lesson Plan on..."
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
              label="Category"
              options={CATEGORY_OPTIONS}
              selected={formData.Category || []}
              onChange={(values) => setFormData({ ...formData, Category: values })}
              showRequired={true}
            />
          </div>
          <div>
            <MultiCheckboxDropdown
              label="Level"
              options={LEVEL_OPTIONS}
              selected={formData.Level || []}
              onChange={(values) => setFormData({ ...formData, Level: values })}
              single={true}
              showRequired={true}
            />
          </div>
          <div>
            <MultiCheckboxDropdown
              label="Type"
              options={TYPE_OPTIONS}
              selected={formData.Type || []}
              onChange={(values) => setFormData({ ...formData, Type: values })}
              single={true}
              showRequired={true}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Lesson Duration (minutes) <RequiredAsterisk />
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
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Learning Objectives <RequiredAsterisk />
            </label>
            <ReactQuill
              theme="snow"
              value={objectives[0]}
              onChange={value => setObjectives([value])}
              style={{
                background: "#fff",
                borderRadius: 6,
                color: "#111",
                fontFamily: "Open Sans, sans-serif"
              }}
            />
          </div>
          <div>
            {sections.map((section, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 24,
                  padding: "18px",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  background: "#fafbfc",
                  position: "relative",
                  color: "#111",
                  fontFamily: "Open Sans, sans-serif"
                }}
              >
                <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
                  Section #{index + 1} <RequiredAsterisk />
                </label>
                <input
                  type="text"
                  placeholder= "Section Title"
                  value={section.title || ""}
                  onChange={e => {
                    const updatedSections = [...sections];
                    updatedSections[index].title = e.target.value;
                    setSections(updatedSections);
                    setFormData({ ...formData, sections: updatedSections });
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    fontSize: "1.08rem",
                    color: "#111",
                    fontFamily: "Open Sans, sans-serif",
                    marginBottom: 10,
                  }}
                  required
                />
                <label
                  style={{
                    fontWeight: 600,
                    color: "#111",
                    marginBottom: 6,
                    display: "block",
                    fontSize: "1.08rem"
                  }}
                >
                  Description <RequiredAsterisk />
                </label>
                <ReactQuill
                  theme="snow"
                  value={section.intro || ""}
                  onChange={value => {
                    const updatedSections = [...sections];
                    updatedSections[index].intro = value;
                    setSections(updatedSections);
                    setFormData({ ...formData, sections: updatedSections });
                  }}
                  style={{
                    background: "#fff",
                    borderRadius: 6,
                    color: "#111",
                    fontFamily: "Open Sans, sans-serif",
                    marginBottom: 10,
                  }}
                />
                <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
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
                    onClick={() => {
                      setSelectedSectionIndex(index);
                      setShowOverlay(true);
                    }}
                  >
                    + Add Existing Nuggets
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
                    onClick={() => handleCreateNewNugget(index)}
                  >
                    + Create New Nugget
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      style={{
                        background: "none",
                        color: "#e74c3c",
                        border: "none",
                        fontWeight: 700,
                        marginLeft: "auto",
                        cursor: "pointer",
                        fontFamily: "Open Sans, sans-serif",
                        fontSize: "1.08rem",
                      }}
                      onClick={() => deleteSection(index)}
                      title="Delete Section"
                    >
                      &times;
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",           // changed from grid to flex
                    flexWrap: "wrap",
                    gap: "2px",                // minimal gap between nuggets
                    marginTop: 6,
                  }}
                >
                  {selectedMaterials[index]?.map((material) => {
                    const fullNugget = portalContent.find((n) => n.id === material.id) || material;
                    return (
                      <div
                        key={material.id}
                        style={{
                          background: "#fafbfc",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          padding: "4px 6px",
                          color: "#111",
                          fontFamily: "Open Sans, sans-serif",
                          boxShadow: "0 2px 8px rgba(22,32,64,0.06)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          width: "fit-content",
                          maxWidth: "100%",
                          position: "relative",
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <span style={{
                          fontWeight: 700,
                          fontSize: "1.02rem",
                          color: "#111",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 120
                        }}>
                          <a
                            href={`/view-content/${material.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                              maxWidth: 90,
                              color: "#1a73e8",
                              textDecoration: "underline",
                              fontWeight: 700,
                              fontSize: "1.02rem",
                              background: "none",
                              border: "none",
                              padding: 0,
                              margin: 0,
                            }}
                            title="View Nugget"
                          >
                            {fullNugget.Title || "Untitled Nugget"}
                          </a>
                        </span>
                        <button
                          onClick={() => removeMaterial(material.id, index)}
                          style={{
                            background: "none",
                            color: "#e74c3c",
                            border: "none",
                            fontWeight: 700,
                            fontSize: "1.1rem",
                            marginLeft: 4,
                            cursor: "pointer",
                            fontFamily: "Open Sans, sans-serif",
                            alignSelf: "center"
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
            ))}
            <button
              type="button"
              style={{
                background: "#fff",
                color: "#111",
                border: "1px solid #111",
                borderRadius: "6px",
                padding: "10px 28px",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 8,
                fontFamily: "Open Sans, sans-serif"
              }}
              onClick={addSection}
            >
              Add another Section
            </button>
          </div>
          {/* Make Public checkbox at the bottom */}
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
            {showSaveAsDraft !== false && (
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
            )}
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
        {showOverlay && (
          <OverlayTileView
            content={portalContent}
            onClose={() => setShowOverlay(false)}
            onSelectMaterial={onSelectMaterial}
            initialSelectedTiles={Object.values(selectedMaterials || {})
              .flat()
              .map((item) => item.id)}
            contentType={"nugget"}
            typeOptions={["Lecture", "Assignment", "Dataset"]}
          />
        )}
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
      {/* Nugget Builder Modal */}
      <Modal
        isOpen={showNuggetBuilderModal}
        onRequestClose={() => setShowNuggetBuilderModal(false)}
        style={customStyles}
        contentLabel="Create New Nugget"
      >
        <NuggetBuilderPage
          onSave={handleNuggetBuilderSave}
          onCancel={() => setShowNuggetBuilderModal(false)}
        />
      </Modal>
    </div>
  );
};

export default LessonPlanBuilder;

