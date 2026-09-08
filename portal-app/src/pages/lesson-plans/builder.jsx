import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import OverlayTileView from "@/components/content/OverlayTileView";
import UploadContent from "@/pages/upload-content/index";
import useUserData from "@/hooks/useUserData";
import { api } from "@/utils/apiClient";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import NuggetBuilderPage from "@/pages/nugget-builder";
import { CATEGORY_OPTIONS, LEVEL_OPTIONS, TYPE_OPTIONS } from "@/constants/formOptions";
import MultiCheckboxDropdown from "@/components/ui/MultiCheckboxDropdown";
import { TYPO } from "@/constants/typography";
import { COLLECTIONS } from "@/firebase/collectionNames";
import { useToast } from "@/components/ui/ToastProvider";
import { toUserMessage } from "@/utils/errorMessage";
import FieldError from "@/components/ui/FieldError";
import useFormValidation from "@/hooks/useFormValidation";
import { everyItem, required, requiredRichText } from "@/utils/validators";
import { ROLES } from "@/constants/roles";

// Add this helper for required asterisks
const RequiredAsterisk = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
);

const normalizeBoolean = (value) => {
  if (value === true) return true;
  if (value === false) return false;
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return false;
};

const LessonPlanBuilder = ({ showSaveAsDraft, showDrafts, onSave, onCancel }) => {
  const toast = useToast();
  const form = useFormValidation({
    description: [requiredRichText("Description")],
    objectives: [requiredRichText("Learning objectives")],
    sections: [everyItem("Section content", required("Section content"))],
    Category: [required("Category")],
    Level: [required("Level")],
    Type: [required("Type")],
  });
  const location = useLocation();
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
  const { user, userData } = useUserData();

  const editLessonId = useMemo(() => location?.state?.editLessonId || null, [location?.state?.editLessonId]);
  const returnTo = useMemo(() => location?.state?.returnTo || null, [location?.state?.returnTo]);
  const lessonReturnTo = useMemo(
    () => location?.state?.lessonReturnTo || null,
    [location?.state?.lessonReturnTo]
  );
  const moduleReturnTo = useMemo(
    () => location?.state?.moduleReturnTo || null,
    [location?.state?.moduleReturnTo]
  );

  const handleCancel = () => {
    // If opened from another screen/modal, prefer closing that context.
    if (typeof onCancel === "function") {
      onCancel();
      return;
    }
    // If opened for editing with an explicit return path, go there.
    if (returnTo) {
      if (lessonReturnTo) {
        navigate(returnTo, {
          state: { returnTo: lessonReturnTo, moduleReturnTo: moduleReturnTo || null },
        });
      } else {
        navigate(returnTo);
      }
      return;
    }
    // Otherwise go back (with safe fallback).
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const loadNuggetsForOverlay = useCallback(async (db, user, role) => {
    if (!user) {
      setPortalContent([]);
      return;
    }
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.content));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (role === ROLES.ADMIN) {
        setPortalContent(all);
        return;
      }
      const uid = user.uid;
      const filtered = all.filter((n) => normalizeBoolean(n?.isPublic) || n?.User === uid);
      setPortalContent(filtered);
    } catch (e) {
      console.error("Failed to load nuggets for overlay:", e);
      setPortalContent([]);
    }
  }, []);

  // Load nuggets for overlay (role-based). The user comes from the shared
  // provider (#368) rather than a listener this page opens for itself.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing, see #525
    loadNuggetsForOverlay(getFirestore(), user, userData?.role);
  }, [loadNuggetsForOverlay, user, userData?.role]);

  // Load draft from localStorage if present (skip when editing an existing lesson)
  useEffect(() => {
    if (editLessonId) return;
    const savedDraft = localStorage.getItem("lessonPlanDraft");
    if (savedDraft) {
      const parsedDraft = JSON.parse(savedDraft);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing, see #525
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
  }, [portalContent, editLessonId]);

  // Prefill from an existing lesson when editing
  useEffect(() => {
    let cancelled = false;
    const loadForEdit = async () => {
      try {
        if (!editLessonId) return;

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          toast.error("You must be logged in to edit a lesson plan.");
          return;
        }
        const lesson = await api.get(`/api/lesson/${editLessonId}`);
        if (cancelled) return;

        const nextSections = Array.isArray(lesson.sections)
          ? lesson.sections.map((s) => ({
              title: s?.title || "",
              intro: s?.intro || "",
              contentIds: Array.isArray(s?.contentIds) ? s.contentIds : [],
            }))
          : [{ title: "", intro: "", contentIds: [] }];

        setFormData((prev) => ({
          ...prev,
          id: editLessonId,
          title: lesson.title || "",
          Category: Array.isArray(lesson.category) ? lesson.category : lesson.category ? [lesson.category] : [],
          Type: Array.isArray(lesson.type) ? lesson.type : lesson.type ? [lesson.type] : [],
          Level: Array.isArray(lesson.level) ? lesson.level : lesson.level ? [lesson.level] : [],
          Duration: lesson.duration ?? "",
          description: typeof lesson.description === "string" ? lesson.description : "",
          isPublic: !!lesson.isPublic,
        }));

        setObjectives(Array.isArray(lesson.objectives) ? lesson.objectives : lesson.objectives ? [lesson.objectives] : [""]);
        setSections(nextSections);

        // Prefill selectedMaterials from contentIds
        const initialMaterials = {};
        nextSections.forEach((s, idx) => {
          initialMaterials[idx] = (s.contentIds || []).map((id) => ({ id }));
        });
        setSelectedMaterials(initialMaterials);
      } catch (e) {
        console.error("Error prefilling lesson builder:", e);
        toast.error(toUserMessage(e, "Failed to load lesson plan for editing."));
      }
    };
    loadForEdit();
    // `toast` is stable (useMemo over two stable useCallbacks in
    // ToastProvider), so listing it satisfies the rule without re-running.

    return () => {
      cancelled = true;
    };
  }, [editLessonId, toast]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: id === "duration" ? (value === "" ? "" : parseInt(value, 10)) : value,
    });
  };

  const handleDescriptionChange = (value) => {
    setFormData({ ...formData, description: value });
    form.revalidate("description", value);
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
      toast.error("You must be logged in to save a draft.");
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
      await setDoc(doc(db, COLLECTIONS.lesson, formData.id), draftData);
    } else {
      await addDoc(collection(db, COLLECTIONS.lesson), draftData);
    }
    localStorage.removeItem("lessonPlanDraft");
    toast.success("Lesson plan draft saved successfully!");
    window.location.reload();
  };

  // --- Submit (Publish) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Every field is checked at once and each failure is shown next to its
    // own field. This used to be four sequential toasts that stopped at the
    // first problem, so a form with three mistakes took three submits to
    // discover them (#371).
    if (
      !form.validateAll({
        description: formData.description,
        objectives: objectives[0],
        sections: sections.map((section) => section.intro),
        Category: formData.Category,
        Level: formData.Level,
        Type: formData.Type,
      })
    ) {
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

    try {
      if (formData.isPublic) {
        const contentUpdates = sections.flatMap((section, index) => {
          const contentIds = selectedMaterials[index]?.map((material) => material.id) || [];
          if (!Array.isArray(contentIds) || contentIds.length === 0) {
            return [];
          }
          return contentIds.map((contentId) =>
            api.post(`/api/update/${contentId}`, { isPublic: true })
          );
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

      const result = editLessonId
        ? await api.put(`/api/lesson/${editLessonId}`, lessonData)
        : await api.post("/api/lesson/", lessonData);
      if (onSave) {
        onSave({
          // apiRequest returns null for an empty body, so guard the read.
          id: editLessonId || result?.id,
          title: lessonData.title,
          // add other fields if needed
        });
      }

      // Remove the draft from Firestore if it exists
      if (!editLessonId && formData.id) {
        const db = getFirestore();
        await deleteDoc(doc(db, COLLECTIONS.lesson, formData.id));
      }

      setModalMessage(editLessonId ? "Lesson plan updated successfully" : "Lesson plan generated successfully");
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
    if (editLessonId) {
      // Return to the lesson detail page after editing.
      if (returnTo) {
        if (lessonReturnTo) {
          navigate(returnTo, {
            state: { returnTo: lessonReturnTo, moduleReturnTo: moduleReturnTo || null },
          });
        } else {
          navigate(returnTo);
        }
        return;
      }
      navigate(`/lesson/${editLessonId}`);
      return;
    }
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
    await loadNuggetsForOverlay(db, user, userData?.role);
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
      }}
    >
      <div style={{ width: "100%", maxWidth: 700, marginBottom: 32, textAlign: "center" }}>
        <h2
          style={{
            ...TYPO.pageTitle,
            margin: 0,
          }}
        >
          Lesson Plan Builder
        </h2>
        <p
          style={{
            marginTop: 16,
            ...TYPO.pageSubtitle,
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
              useSemanticHTML={false}
              theme="snow"
              value={formData.description}
              onChange={handleDescriptionChange}
              style={{ background: "#fff", borderRadius: 6, color: "#111", fontFamily: "Open Sans, sans-serif" }}
            />
            <FieldError id="description" message={form.errors.description} />
          </div>
          <div>
            <MultiCheckboxDropdown
              label="Category"
              options={CATEGORY_OPTIONS}
              selected={formData.Category || []}
              onChange={(values) => {
                setFormData({ ...formData, Category: values });
                form.revalidate("Category", values);
              }}
              showRequired={true}
            />
            <FieldError id="Category" message={form.errors.Category} />
          </div>
          <div>
            <MultiCheckboxDropdown
              label="Level"
              options={LEVEL_OPTIONS}
              selected={formData.Level || []}
              onChange={(values) => {
                setFormData({ ...formData, Level: values });
                form.revalidate("Level", values);
              }}
              single={true}
              showRequired={true}
            />
            <FieldError id="Level" message={form.errors.Level} />
          </div>
          <div>
            <MultiCheckboxDropdown
              label="Type"
              options={TYPE_OPTIONS}
              selected={formData.Type || []}
              onChange={(values) => {
                setFormData({ ...formData, Type: values });
                form.revalidate("Type", values);
              }}
              single={true}
              showRequired={true}
            />
            <FieldError id="Type" message={form.errors.Type} />
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
              useSemanticHTML={false}
              theme="snow"
              value={objectives[0]}
              onChange={value => {
                setObjectives([value]);
                form.revalidate("objectives", value);
              }}
              style={{
                background: "#fff",
                borderRadius: 6,
                color: "#111",
                fontFamily: "Open Sans, sans-serif"
              }}
            />
            <FieldError id="objectives" message={form.errors.objectives} />
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
              useSemanticHTML={false}
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
                          <button
                            type="button"
                            onClick={() => navigate(`/content/${material.id}`)}
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
                              cursor: "pointer",
                            }}
                            title="View Nugget"
                          >
                            {fullNugget.Title || "Untitled Nugget"}
                          </button>
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
          open={modalIsOpen}
          onClose={closeModal}
          title="Submission Result"
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
      <Modal open={showUploadModal} onClose={closeUploadModal}>
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
        open={showNuggetBuilderModal}
        onClose={() => setShowNuggetBuilderModal(false)}
        title="Create New Nugget"
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

