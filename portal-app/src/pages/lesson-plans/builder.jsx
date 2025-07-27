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
    navigate("/nugget-builder");
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

  // --- Save as Draft ---
  const handleSaveSession = async () => {
    // Require description
    if (!formData.description || formData.description.trim() === "") {
      alert("Description is required.");
      return;
    }

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
    if (!formData.description || formData.description.trim() === "") {
      alert("Description is required.");
      setIsSubmitting(false);
      return;
    }
    // Require section content
    if (sections.some(section => !section.intro || section.intro.trim() === "")) {
      alert("Section content is required for all sections.");
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
        category: formData.category,
        type: formData.type,
        level: formData.level,
        objectives: objectives,
        duration: formData.duration,
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
            <select
              id="category"
              value={formData.category}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid #bbb",
                fontSize: "1.08rem",
                color: "#111",
                fontFamily: "Open Sans, sans-serif",
                marginBottom: 8,
              }}
              required
            >
              <option value="">Select a category</option>
              <option value="AI Principles">AI Principles</option>
              <option value="Data Science">Data Science</option>
              <option value="Machine Learning">Machine Learning</option>
              <option value="Statistics">Statistics</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Level
            </label>
            <select
              id="level"
              value={formData.level}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid #bbb",
                fontSize: "1.08rem",
                color: "#111",
                fontFamily: "Open Sans, sans-serif",
                marginBottom: 8,
              }}
              required
            >
              <option value="">Select a level</option>
              <option value="Basic">Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#111", marginBottom: 6, display: "block", fontSize: "1.08rem" }}>
              Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid #bbb",
                fontSize: "1.08rem",
                color: "#111",
                fontFamily: "Open Sans, sans-serif",
                marginBottom: 8,
              }}
              required
            >
              <option value="">Select a type</option>
              <option value="Lecture">Lecture</option>
              <option value="Assignment">Assignment</option>
              <option value="Dataset">Dataset</option>
            </select>
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
                    onClick={() => {
                      setSelectedSectionIndex(index);
                      handleCreateNewNugget();
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
                  {selectedMaterials[index]?.map((material) => {
                    // Try to get the full nugget from portalContent
                    const fullNugget = portalContent.find((n) => n.id === material.id) || material;
                    return (
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
                          position: "relative",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "1.08rem", color: "#111" }}>
                          {fullNugget.Title || "Untitled Nugget"}
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
          type={formData.type}
          category={formData.category}
          level={formData.level}
        />
      </Modal>
    </div>
  );
};

export default LessonPlanBuilder;
