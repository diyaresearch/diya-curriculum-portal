import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import OverlayTileView from "../../components/OverlayTileView";
import UploadContent from "../upload-content/index";
import useUserData from "../../hooks/useUserData";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { FaExternalLinkAlt } from "react-icons/fa";

Modal.setAppElement("#root");

const LessonPlanBuilder = () => {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    type: "",
    level: "",
    duration: "",
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
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { userData } = useUserData();
  const userRole = userData?.role;

  // --- CHANGE: Pull all nuggets from Firebase "content" table ---
  useEffect(() => {
    const db = getFirestore();
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPortalContent([]);
        return;
      }
      // Query only nuggets created by the current user for speed
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
  // --- END CHANGE ---

  useEffect(() => {
    const savedDraft = localStorage.getItem("lessonPlanDraft");
    if (savedDraft) {
      const parsedDraft = JSON.parse(savedDraft);
      setFormData(parsedDraft);
      setSections(parsedDraft.sections || [{ intro: "", contentIds: [] }]);
      const restoredMaterials = {};
      if (parsedDraft.sections) {
        parsedDraft.sections.forEach((section, index) => {
          restoredMaterials[index] = section.contentIds.map(
            (contentId) => portalContent.find((item) => item.id === contentId) || { id: contentId }
          );
        });
      }
      setSelectedMaterials(restoredMaterials);
    }
  }, [portalContent]);

  const handleExit = () => {
    navigate("/");
  };

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

  const handleObjectiveChange = (index, value) => {
    const updated = [...objectives];
    updated[index] = value;
    setObjectives(updated);
  };

  const addObjective = () => {
    setObjectives([...objectives, ""]);
  };

  const removeObjective = (index) => {
    if (objectives.length === 1) return;
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleSectionChange = (index, value) => {
    const updatedSections = [...sections];
    if (!updatedSections[index]) {
      updatedSections[index] = { intro: "", contentIds: [] };
    }
    updatedSections[index].intro = value;
    setSections(updatedSections);
    setFormData({ ...formData, sections: updatedSections });
  };

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

  const handleCreateNewNugget = () => {
    navigate("/nugget-builder"); // Redirects to nugget builder page
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
  };

  const handleNewNuggetAdded = (newNugget) => {
    setShowUploadModal(false);
    if (selectedSectionIndex !== null) {
      setSelectedMaterials((prevMaterials) => ({
        ...prevMaterials,
        [selectedSectionIndex]: [...(prevMaterials[selectedSectionIndex] || []), newNugget],
      }));
    }
  };

  const handleSaveSession = () => {
    const savedData = {
      ...formData,
      sections: sections.map((section, index) => ({
        ...section,
        contentIds: selectedMaterials[index]?.map((material) => material.id) || [],
      })),
    };
    localStorage.setItem("lessonPlanDraft", JSON.stringify(savedData));
    alert("Lesson plan draft saved successfully!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
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
        category: formData.category,
        type: formData.type,
        level: formData.level,
        objectives: objectives,
        duration: formData.duration,
        description: formData.description,
        isPublic: formData.isPublic,
        sections: sections.map((section, index) => ({
          id: index,
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

      setModalMessage("Lesson plan generated successfully");
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
      setModalIsOpen(true);
      setIsSubmitting(false);
      localStorage.removeItem("lessonPlanDraft");
    } catch (error) {
      setModalMessage("Error generating lesson plan: " + error.message);
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
    navigate("/my-plans");
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
      width: "400px",
      padding: "20px",
      textAlign: "center",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
    },
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: "#F6F8FA",
        minHeight: "100vh",
        width: "100%",
        paddingTop: "60px",
        color: "#111", // Make all text black
        fontFamily: "Open Sans, sans-serif"
      }}
    >
      {/* Heading and Description at the top of the page */}
      <div style={{ width: "100%", maxWidth: 700, marginBottom: 32, textAlign: "center" }}>
        <h2
          style={{
            fontSize: "2.8rem",
            fontWeight: "700",
            color: "#111", // Black
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
            color: "#111", // Black
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
          color: "#111", // Black
          fontFamily: "Open Sans, sans-serif"
        }}
      >
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            style={{
              color: "#111", // Black
              fontFamily: "Open Sans, sans-serif"
            }}
            onClick={() => navigate("/my-plans")}
          >
            Plans
          </button>
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            style={{
              color: "#111", // Black
              fontFamily: "Open Sans, sans-serif"
            }}
            onClick={handleExit}
          >
            Exit
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
            color: "#111", // Black
            fontFamily: "Open Sans, sans-serif"
          }}
        >
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Title
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
              Description
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
              Category
            </label>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {["Math", "Science", "Technology", "Arts"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 6,
                    border: formData.category === cat ? "2px solid #111" : "1px solid #bbb",
                    background: formData.category === cat ? "#111" : "#fff",
                    color: formData.category === cat ? "#fff" : "#111",
                    fontWeight: 600,
                    fontFamily: "Open Sans, sans-serif",
                    cursor: "pointer",
                    fontSize: "1.08rem", // Match label font size
                    outline: "none",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="hidden"
              id="category"
              value={formData.category}
              required
              readOnly
            />
          </div>
          {/* Remove the entire Type field */}
          {/* 
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Type
            </label>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {["Lectures", "Assignments", "Quiz", "Projects", "Case studies", "Data sets"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 6,
                    border: formData.type === type ? "2px solid #111" : "1px solid #bbb",
                    background: formData.type === type ? "#111" : "#fff",
                    color: formData.type === type ? "#fff" : "#111",
                    fontWeight: 600,
                    fontFamily: "Open Sans, sans-serif",
                    cursor: "pointer",
                    fontSize: "1.08rem",
                    outline: "none",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            <input
              type="hidden"
              id="type"
              value={formData.type}
              required
              readOnly
            />
          </div>
          */}
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Level
            </label>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {["Basic", "Intermediate", "Advanced"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, level })}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 6,
                    border: formData.level === level ? "2px solid #111" : "1px solid #bbb",
                    background: formData.level === level ? "#111" : "#fff",
                    color: formData.level === level ? "#fff" : "#111",
                    fontWeight: 600,
                    fontFamily: "Open Sans, sans-serif",
                    cursor: "pointer",
                    fontSize: "1.08rem",
                    outline: "none",
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
            <input
              type="hidden"
              id="level"
              value={formData.level}
              required
              readOnly
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Lesson Duration (minutes)
            </label>
            <input
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid #bbb",
                fontSize: "1.08rem",
                color: "#111", // Black
                fontFamily: "Open Sans, sans-serif"
              }}
              id="duration"
              type="text" // changed from "number" to "text"
              placeholder="Duration"
              value={formData.duration}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Learning Objectives
            </label>
            {objectives.map((obj, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <input
                  type="text"
                  value={obj}
                  onChange={e => handleObjectiveChange(idx, e.target.value)}
                  placeholder={`Objective ${idx + 1}`}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 6,
                    border: "1px solid #bbb",
                    fontSize: "1.08rem",
                    color: "#111",
                    fontFamily: "Open Sans, sans-serif"
                  }}
                  required
                />
                {objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeObjective(idx)}
                    style={{
                      marginLeft: 8,
                      background: "none",
                      color: "#e74c3c",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "1.3rem",
                      cursor: "pointer"
                    }}
                    title="Remove"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addObjective}
              style={{
                background: "#fff",
                color: "#111",
                border: "1px solid #111",
                borderRadius: "6px",
                padding: "8px 18px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem",
                marginTop: 4
              }}
            >
              + Add Objective
            </button>
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
                  Section #{index + 1}
                </label>
                <input
                  type="text"
                  placeholder="Section Title"
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
                  Content
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
                  placeholder="Section Content"
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
                      background: "#111C44", // Navy blue to match footer
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 18px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "Open Sans, sans-serif",
                      fontSize: "1.08rem"
                    }}
                    onClick={() => {
                      setSelectedSectionIndex(index);
                      handleCreateNewNugget(); // Redirects the page
                    }}
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
                        fontSize: "1.5rem",
                        marginLeft: "auto",
                        cursor: "pointer",
                        fontFamily: "Open Sans, sans-serif",
                        fontSize: "1.08rem"
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
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
                    gap: "16px",
                    marginTop: 10,
                  }}
                >
                  {selectedMaterials[index]?.map((material) => (
                    <div
                      key={material.id}
                      style={{
                        background: "#fafbfc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "18px 16px",
                        color: "#111",
                        fontFamily: "Open Sans, sans-serif",
                        boxShadow: "0 2px 8px rgba(22,32,64,0.06)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        minWidth: "0",
                        width: "100%",
                        maxWidth: "340px",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "1.08rem", color: "#111" }}>
                        {material.Title}
                      </div>
                      <div style={{ fontSize: "0.98rem", color: "#444" }}>
                        {material.Description}
                      </div>
                      <div style={{ fontSize: "0.92rem", color: "#888" }}>
                        {material.Category} &middot; {material.Type} &middot; {material.Level}
                      </div>
                      <div style={{ fontSize: "0.92rem", color: "#888" }}>
                        Created: {
                          material.createdAt
                            ? (
                                typeof material.createdAt.toDate === "function"
                                  ? material.createdAt.toDate().toLocaleDateString()
                                  : !isNaN(Date.parse(material.createdAt))
                                    ? new Date(material.createdAt).toLocaleDateString()
                                    : ""
                            )
                          : ""
                        }
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <a
                          href={`/view-content/${material.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: "#fff",
                            color: "#1a73e8",
                            border: "1px solid #1a73e8",
                            borderRadius: "6px",
                            padding: "6px 14px",
                            fontWeight: 600,
                            fontFamily: "Open Sans, sans-serif",
                            fontSize: "1.02rem",
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                        >
                          View
                        </a>
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
                            fontFamily: "Open Sans, sans-serif"
                          }}
                          title="Remove"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
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
                background: isSubmitting ? "#bbb" : "#111C44", // Navy blue when enabled
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "12px 32px",
                fontWeight: 700,
                fontSize: "1.08rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontFamily: "Open Sans, sans-serif"
                , fontSize: "1.08rem"
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
            type={formData.type}
            category={formData.category}
            level={formData.level}
            contentType={"nugget"}
            typeOptions={["Lecture", "Assignment", "Dataset"]} // <-- Only these types
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
          type={formData.type}
          category={formData.category}
          level={formData.level}
        />
      </Modal>
    </div>
  );
};


export default LessonPlanBuilder;
