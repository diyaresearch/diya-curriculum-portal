import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import OverlayTileView from "@/pages/module_builder/OverlayTileView";
import UploadContent from "@/pages/upload-content/index";
import useUserData from "@/hooks/useUserData";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import NuggetBuilderPage from "@/pages/nugget-builder";
import LessonPlanBuilder from "@/pages/lesson-plans/builder";
import { CATEGORY_OPTIONS, LEVEL_OPTIONS, TYPE_OPTIONS } from "@/constants/formOptions";
import MultiCheckboxDropdown from "@/components/ui/MultiCheckboxDropdown";
import BackButton from "@/components/ui/BackButton";
import { TYPO } from "@/constants/typography";
import { COLLECTIONS } from "@/firebase/collectionNames";
import { fetchPayments } from "@/utils/paymentsApi";
import { useToast } from "@/components/ui/ToastProvider";
import { ROLES } from "@/constants/roles";

// Add this helper for required asterisks
const RequiredAsterisk = () => (
  <span className="[color:red] ml-1">*</span>
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
  const toast = useToast();
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
    isFeatured: false, // Admin-only flag
    price: "", // Admin-only, only when Featured is on
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
  const { user, userData } = useUserData();

  const editModuleId = location.state?.editModuleId || null;
  const returnTo = location.state?.returnTo || null;
  const moduleReturnTo = location.state?.moduleReturnTo || null;
  // "Create Module" on /my-plans arrives here with the lesson plans the user
  // ticked there. It used to go to /module/create and lose them in a stub form (#444).
  // Read once at mount: the selection travels in navigation state, and a later
  // state change should not re-tick boxes the user has since cleared.
  const [preselectedLessonIds] = useState(() =>
    Array.isArray(location.state?.selectedPlans) ? location.state.selectedPlans : []
  );
  const [editModuleAuthorUid, setEditModuleAuthorUid] = useState("");
  const [prefillLessonIds, setPrefillLessonIds] = useState(preselectedLessonIds);

  // For admins creating a new module, default Featured to ON (so it shows for
  // all users on homepage). The role arrives asynchronously, so this cannot be
  // a plain initial value - but it can be applied during render rather than one
  // render later (#525). `featuredDefaultApplied` keeps it to once.
  const [featuredDefaultApplied, setFeaturedDefaultApplied] = useState(false);
  if (!featuredDefaultApplied && !editModuleId && userData?.role === ROLES.ADMIN) {
    setFeaturedDefaultApplied(true);
    setFormData((prev) => ({ ...prev, isFeatured: true }));
  }

  const handleBack = () => {
    // Prefer explicit return path when editing from module detail.
    if (returnTo) {
      if (moduleReturnTo) {
        navigate(returnTo, { state: { returnTo: moduleReturnTo } });
      } else {
        navigate(returnTo);
      }
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
      if (moduleReturnTo) {
        navigate(returnTo, { state: { returnTo: moduleReturnTo } });
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


  // A draft handed over by /module_builder/drafts. Read once, at mount; applied
  // below once the lesson library has loaded, so its lessons resolve to real
  // records rather than bare ids.
  const [savedDraft] = useState(() => {
    try {
      const raw = localStorage.getItem("moduleDraft");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("Could not read the saved module draft:", e);
      return null;
    }
  });
  const [draftApplied, setDraftApplied] = useState(false);

  // Applied during render rather than from an effect (#525), and once - after
  // that the form belongs to the user.
  if (!draftApplied && !editModuleId && savedDraft && portalContent.length > 0) {
    setDraftApplied(true);
    setFormData({
      title: savedDraft.title || "",
      Category: savedDraft.Category || savedDraft.category || [],
      Type: savedDraft.Type || savedDraft.type || [],
      Level: savedDraft.Level || savedDraft.level || [],
      Duration: savedDraft.Duration || savedDraft.duration || "",
      description: savedDraft.description || "",
      requirements: savedDraft.requirements || "",
      learningObjectives: savedDraft.learningObjectives || "",
      isPublic: savedDraft.isPublic || false,
      isFeatured: savedDraft.isFeatured === true,
      price: savedDraft.price ?? "",
    });
    // Restore selected lesson plans/materials if present
    if (Array.isArray(savedDraft.lessons)) {
      setSelectedMaterials(savedDraft.lessons.map(id => {
        // Try to find full lesson object from portalContent, fallback to just id
        return portalContent.find(item => item.id === id) || { id };
      }));
    }
  }

  // Clear it only once it has actually been taken up, so a reload before the
  // lesson library arrives does not lose the draft.
  useEffect(() => {
    if (draftApplied) localStorage.removeItem("moduleDraft");
  }, [draftApplied]);

  // Edit mode: fetch and prefill existing module
  useEffect(() => {
    let cancelled = false;
    if (!editModuleId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.module, editModuleId));
        if (cancelled) return;
        if (!snap.exists()) {
          setModalMessage("Module not found for editing");
          setModalIsOpen(true);
          return;
        }
        const data = snap.data() || {};
        const details = Array.isArray(data.details) ? data.details : [];
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
          isFeatured: data.isFeatured === true,
          price: data.price ?? data.Price ?? "",
        });

        setPrefillLessonIds(lessonIds);
        } catch (err) {
        console.error("ModuleBuilder: failed to load module for edit", err);
        setModalMessage("Error loading module for editing");
        setModalIsOpen(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editModuleId]);

  // Once we have portalContent (lessons) and module lesson ids, prefill selection.
  // Two sources: an existing module being edited, and a selection carried over
  // from /my-plans when creating a new one. Applied during render rather than
  // from an effect (#525), and once - after that the selection is the user's.
  const [lessonsPrefilled, setLessonsPrefilled] = useState(false);
  if (
    !lessonsPrefilled &&
    (editModuleId || preselectedLessonIds.length > 0) &&
    prefillLessonIds?.length > 0 &&
    portalContent.length > 0
  ) {
    setLessonsPrefilled(true);
    setSelectedMaterials(
      prefillLessonIds.map((id) => portalContent.find((item) => item.id === id) || { id })
    );
  }

  // --- Fetch lesson plans for overlay ---
  // Returns the lesson plans rather than writing them to state, so both callers
  // - the mount effect and the post-save refresh - decide when to commit (#525).
  const readLessonPlans = async (userId) => {
    const lessonsQuery = query(
      collection(db, COLLECTIONS.lesson),
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
    return userLessons;
  };

  // The uid comes from the shared provider (#368); this page used to open its
  // own auth listener purely to learn who was signed in. Inlined rather than
  // calling readLessonPlans from here, which the rule cannot see past (#525),
  // and which had no cancellation.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const load = async () => {
      const lessons = await readLessonPlans(user.uid);
      if (cancelled) return;
      setPortalContent(lessons);
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

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
      toast.error("You must be logged in to save a draft.");
      return;
    }
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
    // Only admins should be able to set featured flag.
    if (userData?.role !== ROLES.ADMIN) {
      delete draftData.isFeatured;
      delete draftData.price;
    } else {
      // Only featured modules can have a price.
      if (draftData.isFeatured !== true) {
        delete draftData.price;
      } else {
        const priceNum = Number(draftData.price);
        draftData.price = Number.isFinite(priceNum) ? priceNum : 0;
      }
    }
    await addDoc(collection(db, COLLECTIONS.module), draftData);
    localStorage.removeItem("moduleDraft");
    toast.success("Module draft saved successfully!");
    window.location.reload();
  };

    // --- Buy (Stripe Embedded Checkout Session) ---
    const handleBuy = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
  
        if (!user) {
          setModalMessage("You must be logged in to purchase.");
          setModalIsOpen(true);
          return;
        }
  
        // IMPORTANT: this is what prevents "Bearer null"
        const token = await user.getIdToken();

        const res = await fetchPayments("/create-embedded-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planType: "premium" }),
        });
  
        const data = await res.json();
  
        if (!res.ok) {
          console.error("Create checkout session failed:", data);
          setModalMessage(data?.message || "Unable to start checkout.");
          setModalIsOpen(true);
          return;
        }
  
        // For now, just confirm you received it (next step will mount checkout in a modal)
        setModalMessage("Checkout session created successfully (clientSecret received).");
        setModalIsOpen(true);
  
      } catch (err) {
        console.error(err);
        setModalMessage("Error starting checkout: " + (err?.message || "Unknown error"));
        setModalIsOpen(true);
      }
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
      toast.error("Please fill all required fields.");
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
      // Only admins should be able to set featured flag.
      if (userData?.role !== ROLES.ADMIN) {
        delete moduleData.isFeatured;
        delete moduleData.price;
      } else {
        moduleData.isFeatured = moduleData.isFeatured === true;
        // Featured modules created/published by admin should be visible to everyone.
        if (moduleData.isFeatured === true) {
          moduleData.isPublic = true;
        }
        // Only featured modules can have a price.
        if (moduleData.isFeatured !== true) {
          delete moduleData.price;
        } else {
          const priceNum = Number(moduleData.price);
          moduleData.price = Number.isFinite(priceNum) ? priceNum : 0;
        }
      }

      if (editModuleId) {
        await updateDoc(doc(db, COLLECTIONS.module, editModuleId), moduleData);
      } else {
        const isAdminAuthor = userData?.role === ROLES.ADMIN;
        await addDoc(collection(db, COLLECTIONS.module), {
          ...moduleData,
          ...(isAdminAuthor ? { isFeatured: moduleData.isFeatured === true } : {}),
          createdAt: serverTimestamp(),
        });
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
      const target = returnTo || `/module/${editModuleId}`;
      if (moduleReturnTo) {
        navigate(target, { state: { returnTo: moduleReturnTo } });
      } else {
        navigate(target);
      }
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
      isFeatured: false,
      price: "",
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
      }}
    >
      {/* Back button (match module page behavior) */}
      <div className="w-full max-w-175 mb-2 py-0 px-2">
        <BackButton onClick={handleBack} />
      </div>
      <div className="w-full max-w-175 mb-8 text-center">
        <h2
          style={{
            ...TYPO.pageTitle,
            margin: 0,
          }}
        >
          {editModuleId ? "Edit Module" : "Module Builder"}
        </h2>
        <p
          style={{
            marginTop: 16,
            ...TYPO.pageSubtitle,
          }}
        >
          Design your modules and share them with your students and the borader community.
        </p>
      </div>
      <div
        className="w-full max-w-3xl relative bg-surface border-2 border-rule rounded-xl shadow-[0_4px_24px_rgba(22,32,64,0.10)] pt-12 pr-10 pb-10 pl-10 mb-8 text-ink-strong font-sans"
      >
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100 text-ink-strong font-sans"
            onClick={() => navigate("/module_builder/drafts")}
          >
            Drafts
          </button>
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
              placeholder="Module Title"
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
          </div>
          <div>
            <label className="font-semibold text-ink-strong mb-1.5 block text-label">
              Requirements <RequiredAsterisk />
            </label>
            <ReactQuill
              useSemanticHTML={false}
              theme="snow"
              value={formData.requirements}
              onChange={handleRequirementsChange}
              className="bg-surface rounded-md text-ink-strong font-sans"

            />
          </div>

          <div>
            <label className="font-semibold text-ink-strong mb-1.5 block text-label">
              Learning Objectives <RequiredAsterisk />
            </label>
            <ReactQuill
              useSemanticHTML={false}
              theme="snow"
              value={formData.learningObjectives}
              onChange={handleLearningObjectivesChange}
              className="bg-surface rounded-md text-ink-strong font-sans"
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
            <label className="font-semibold text-ink-strong mb-1.5 block text-label">
              Duration (minutes) <RequiredAsterisk />
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
          <div className="mt-6">
            <div className="flex gap-3">
              <button
                type="button"
                className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2 px-4.5 font-semibold cursor-pointer font-sans"
                onClick={() => setShowOverlay(true)}
              >
                + Add Existing Lesson Plans
              </button>
              <button
                type="button"
                className="bg-navy-deep text-white border-0 rounded-md py-2 px-4.5 font-semibold cursor-pointer font-sans text-label"
                onClick={() => setShowLessonPlanBuilderModal(true)}
              >
                + Create New Lesson Plan
              </button>
            </div>
            <div
              className="flex flex-wrap gap-0.5 mt-1.5"
            >
              {selectedMaterials.map((material) => {
                return (
                  <div
                    key={material.id}
                    className="bg-[#fafbfc] border border-rule rounded-[10px] py-2 px-3 text-ink-strong font-sans shadow-[0_2px_8px_rgba(22,32,64,0.06)] flex items-center gap-2 w-fit max-w-80 relative m-1"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/lesson/${material.id}`, {
                          state: { returnTo: `${location.pathname}${location.search || ""}` },
                        })
                      }
                      className="text-link underline font-bold text-label bg-none border-0 p-0 m-0 overflow-hidden text-ellipsis whitespace-nowrap inline-block max-w-[90%] cursor-pointer"
                      title="View Lesson Details"
                    >
                      {material.title || material.Title || "Untitled Lesson"}
                    </button>
                    <button
                      onClick={() => removeMaterial(material.id)}
                      className="bg-none text-[#e74c3c] border-0 font-bold text-[1.1rem] ml-0 cursor-pointer font-sans self-end"
                      title="Remove"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
              className="w-4.5 h-4.5"
            />
            <label htmlFor="isPublic" className="text-ink-strong font-semibold text-label">
              Make Public
            </label>
          </div>
          {userData?.role === ROLES.ADMIN && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={formData.isFeatured === true}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isFeatured: e.target.checked,
                      // If turning off featured, clear price to avoid confusion.
                      ...(e.target.checked ? {} : { price: "" }),
                    }))
                  }
                  className="w-4.5 h-4.5"
                />
                <label htmlFor="isFeatured" className="text-ink-strong font-semibold text-label">
                  Featured (shows on homepage)
                </label>
              </div>

              {formData.isFeatured === true && (
                <div className="flex items-center gap-3 flex-wrap">
                  <label htmlFor="price" className="text-ink-strong font-bold text-[1.02rem]">
                    Price
                  </label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-35 py-2.5 px-3 rounded-lg border border-[#bbb] text-[1rem] text-ink-strong font-sans"
                  />
                  {Number(formData.price) > 0 && (
                    <button
                      type="button"
                      onClick={handleBuy}
                      className="bg-navy text-white border-2 border-navy rounded-lg py-2.5 px-3.5 font-extrabold cursor-pointer"
                    >
                      Buy
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2 px-4.5 font-semibold cursor-pointer font-sans text-label"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSession}
              className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2 px-4.5 font-semibold cursor-pointer font-sans text-label"
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
          open={showOverlay}
          onClose={() => setShowOverlay(false)}

          title="Add Existing Lesson Plans"
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
      <Modal
        open={showNuggetBuilderModal}
        onClose={() => setShowNuggetBuilderModal(false)}
        title="Create New Nugget"
      >
        <NuggetBuilderPage
          onSave={handleNewNuggetAdded}
          onCancel={() => setShowNuggetBuilderModal(false)}
        />
      </Modal>
      <Modal
        open={showLessonPlanBuilderModal}
        onClose={() => setShowLessonPlanBuilderModal(false)}
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
        title="Create New Lesson Plan"
      >
        {/* X button in top right */}
        <button
          onClick={() => setShowLessonPlanBuilderModal(false)}
          className="absolute top-4.5 right-6 bg-none border-0 text-[2.2rem] text-ink-faint cursor-pointer z-[2000] font-bold leading-none"
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
              setPortalContent(await readLessonPlans(user.uid)); // Refresh lesson plans immediately
            }
          }}
          onCancel={() => setShowLessonPlanBuilderModal(false)}
        />
      </Modal>
    </div>
  );
};

export default ModuleBuilder;