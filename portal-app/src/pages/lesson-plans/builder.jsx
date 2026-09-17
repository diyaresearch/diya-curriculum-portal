import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { getAuth } from "firebase/auth";
import { collection, getDocs, addDoc, setDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
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
  <span className="[color:red] ml-1">*</span>
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
  const editLessonId = location?.state?.editLessonId || null;

  // A draft handed over by /lesson-plans/drafts. Read once, at mount, and used
  // to seed the initial state - the idiomatic form of what was an effect that
  // wrote it in one render later (#525).
  const [restoredDraft] = useState(() => {
    if (editLessonId) return null;
    try {
      const saved = localStorage.getItem("lessonPlanDraft");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Could not read the saved lesson plan draft:", e);
      return null;
    }
  });

  const [formData, setFormData] = useState(() => restoredDraft || {
    title: "",
    Category: [],
    Type: [],
    Level: [],
    Duration: "",
    sections: [],
    description: "",
    isPublic: false,
  });
  const [objectives, setObjectives] = useState(
    () => restoredDraft?.objectives || [""]
  );
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [portalContent, setPortalContent] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [sections, setSections] = useState(
    () => restoredDraft?.sections || [{ intro: "", contentIds: [] }]
  );
  const [selectedMaterials, setSelectedMaterials] = useState(() =>
    (restoredDraft?.sections || []).reduce((acc, section, index) => {
      // The nugget library has not loaded at mount, so these are id-only
      // placeholders - which is what the effect produced too, because it
      // cleared the draft on its first run and never saw the loaded library.
      acc[index] = section.contentIds || [];
      return acc;
    }, {})
  );
  const [showNuggetBuilderModal, setShowNuggetBuilderModal] = useState(false);
  const [nuggetBuilderSectionIndex, setNuggetBuilderSectionIndex] = useState(null);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { user, userData } = useUserData();

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

  // Returns the nuggets rather than writing them to state, so both callers -
  // the mount effect and the post-upload refresh - decide when to commit (#525).
  const readNuggetsForOverlay = async (db, user, role) => {
    if (!user) return [];
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.content));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (role === ROLES.ADMIN) return all;
      const uid = user.uid;
      return all.filter((n) => normalizeBoolean(n?.isPublic) || n?.User === uid);
    } catch (e) {
      console.error("Failed to load nuggets for overlay:", e);
      return [];
    }
  };

  // Load nuggets for overlay (role-based). The user comes from the shared
  // provider (#368) rather than a listener this page opens for itself. Inlined
  // rather than calling the useCallback from here, which the rule cannot see
  // past (#525).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const nuggets = await readNuggetsForOverlay(db, user, userData?.role);
      if (cancelled) return;
      setPortalContent(nuggets);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user, userData?.role]);

  // The draft above was consumed into this builder's initial state; clear it so
  // reopening the builder starts blank.
  useEffect(() => {
    if (restoredDraft) localStorage.removeItem("lessonPlanDraft");
  }, [restoredDraft]);

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
    const auth = getAuth();
    const user = auth.currentUser;
    setPortalContent(await readNuggetsForOverlay(db, user, userData?.role));
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
      <div className="w-full max-w-175 mb-8 text-center">
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
        className="w-full max-w-3xl relative bg-surface border-2 border-rule rounded-xl shadow-[0_4px_24px_rgba(22,32,64,0.10)] pt-12 pr-10 pb-10 pl-10 mb-8 text-ink-strong"
      >
        <div className="absolute top-4 right-4 flex space-x-2">
          {showDrafts !== false && (
            <button
              type="button"
              className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100 text-ink-strong font-sans"
              onClick={() => navigate("/lesson-plans/drafts")}
            >
              Drafts
            </button>
          )}
        </div>
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-150 my-0 mx-auto flex flex-col gap-6 text-ink-strong font-sans"
        >
          <div>
            <label className="font-semibold text-ink-strong mb-1.5 block text-label">
              Title <RequiredAsterisk />
            </label>
            <input
              className="w-full p-3 rounded-md border border-[#bbb] text-label text-ink-strong font-sans"
              id="title"
              type="text"
              placeholder="Lesson Plan on..."
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="font-semibold text-ink-strong mb-1.5 block text-label">
              Description <RequiredAsterisk />
            </label>
            <ReactQuill
              useSemanticHTML={false}
              theme="snow"
              value={formData.description}
              onChange={handleDescriptionChange}
              className="bg-surface rounded-md text-ink-strong font-sans"
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
            <label className="font-semibold text-ink-strong mb-1.5 block text-label">
              Lesson Duration (minutes) <RequiredAsterisk />
            </label>
            <input
              className="w-full p-3 rounded-md border border-[#bbb] text-label text-ink-strong font-sans"
              id="Duration"
              type="text"
              placeholder="Duration"
              value={formData.Duration}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="font-semibold text-ink-strong mb-1.5 block text-label">
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
              className="bg-surface rounded-md text-ink-strong font-sans"
            />
            <FieldError id="objectives" message={form.errors.objectives} />
          </div>
          <div>
            {sections.map((section, index) => (
              <div
                key={index}
                className="mb-6 p-4.5 border border-[#eee] rounded-lg bg-[#fafbfc] relative text-ink-strong font-sans"
              >
                <label className="font-semibold text-ink-strong mb-1.5 block text-label">
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
                  className="w-full p-2.5 rounded-md border border-[#bbb] text-label text-ink-strong font-sans mb-2.5"
                  required
                />
                <label
                  className="font-semibold text-ink-strong mb-1.5 block text-label"
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
                  className="bg-surface rounded-md text-ink-strong font-sans mb-2.5"
                />
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2 px-4.5 font-semibold cursor-pointer font-sans"
                    onClick={() => {
                      setSelectedSectionIndex(index);
                      setShowOverlay(true);
                    }}
                  >
                    + Add Existing Nuggets
                  </button>
                  <button
                    type="button"
                    className="bg-navy-deep text-white border-0 rounded-md py-2 px-4.5 font-semibold cursor-pointer font-sans text-label"
                    onClick={() => handleCreateNewNugget(index)}
                  >
                    + Create New Nugget
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      className="bg-none text-[#e74c3c] border-0 font-bold ml-auto cursor-pointer font-sans text-label"
                      onClick={() => deleteSection(index)}
                      title="Delete Section"
                    >
                      &times;
                    </button>
                  )}
                </div>
                <div
                  className="flex flex-wrap gap-0.5 mt-1.5"
                >
                  {selectedMaterials[index]?.map((material) => {
                    const fullNugget = portalContent.find((n) => n.id === material.id) || material;
                    return (
                      <div
                        key={material.id}
                        className="bg-[#fafbfc] border border-rule rounded-[10px] py-1 px-1.5 text-ink-strong font-sans shadow-[0_2px_8px_rgba(22,32,64,0.06)] inline-flex items-center gap-1 w-fit max-w-full relative m-0 whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        <span className="font-bold text-[1.02rem] text-ink-strong flex items-center gap-1 overflow-hidden text-ellipsis max-w-30">
                          <button
                            type="button"
                            onClick={() => navigate(`/content/${material.id}`)}
                            className="overflow-hidden text-ellipsis whitespace-nowrap inline-block max-w-22.5 text-link underline font-bold text-[1.02rem] bg-none border-0 p-0 m-0 cursor-pointer"
                            title="View Nugget"
                          >
                            {fullNugget.Title || "Untitled Nugget"}
                          </button>
                        </span>
                        <button
                          onClick={() => removeMaterial(material.id, index)}
                          className="bg-none text-[#e74c3c] border-0 font-bold text-[1.1rem] ml-1 cursor-pointer font-sans self-center"
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
              className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2.5 px-7 font-semibold cursor-pointer mt-2 font-sans"
              onClick={addSection}
            >
              Add another Section
            </button>
          </div>
          {/* Make Public checkbox at the bottom */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="w-4.5 h-4.5"
            />
            <label htmlFor="isPublic" className="text-ink-strong font-semibold text-label">
              Make Public
            </label>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2 px-4.5 font-semibold cursor-pointer font-sans text-label"
            >
              Cancel
            </button>
            {showSaveAsDraft !== false && (
              <button
                type="button"
                onClick={handleSaveSession}
                className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2 px-4.5 font-semibold cursor-pointer font-sans text-label"
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

