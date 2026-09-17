import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "@/components/ui/Modal";
import { getAuth } from "firebase/auth";
import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { CATEGORY_OPTIONS, LEVEL_OPTIONS, TYPE_OPTIONS } from "@/constants/formOptions";
import MultiCheckboxDropdown from "@/components/ui/MultiCheckboxDropdown";
import { COLLECTIONS } from "@/firebase/collectionNames";
import { ROLES } from "@/constants/roles";

// Add this helper for required asterisks
const RequiredAsterisk = () => (
  <span className="[color:red] ml-1">*</span>
);

export const UploadContent = ({
  fromLesson,
  onNuggetCreated,
  isPublic,
  type,
  category,
  level,
  title,
}) => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    Title: "",
    // Seeded from the opener's suggestion rather than written in by an effect
    // after the first render (#525).
    Category: category || [],
    Type: type || [],
    Level: level || [],
    Duration: "",
    isPublic: isPublic || false,
    Abstract: "",
    Instructions: "",
  });

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]); // local list before save


  const navigate = useNavigate();
  const editContentId = location.state?.editContentId || null;
  const returnTo = location.state?.returnTo || null;
  const lessonReturnTo = location.state?.lessonReturnTo || null;
  const moduleReturnTo = location.state?.moduleReturnTo || null;

  // Prefill when editing an existing nugget
  useEffect(() => {
    let cancelled = false;
    const loadForEdit = async () => {
      try {
        if (!editContentId) return;
        const snap = await getDoc(doc(db, COLLECTIONS.content, editContentId));
        if (cancelled) return;
        if (!snap.exists()) return;
        const data = snap.data() || {};

        setFormData((prev) => ({
          ...prev,
          Title: data.Title || "",
          Category: Array.isArray(data.Category) ? data.Category : data.Category ? [data.Category] : [],
          Type: Array.isArray(data.Type) ? data.Type : data.Type ? [data.Type] : [],
          Level: Array.isArray(data.Level) ? data.Level : data.Level ? [data.Level] : [],
          Duration: data.Duration ?? "",
          isPublic: !!data.isPublic,
          // Stored field is Description (HTML) in newer schema
          Abstract: typeof data.Description === "string" ? data.Description : (data.Abstract || ""),
          Instructions: data.Instructions || "",
        }));

        setPendingAttachments(Array.isArray(data.attachmentsToSave) ? data.attachmentsToSave : []);
        setAttachmentTitle("");
        setAttachmentUrl("");
      } catch (e) {
        console.error("Failed to prefill nugget for edit:", e);
      }
    };
    loadForEdit();

    return () => {
      cancelled = true;
    };
  }, [editContentId]);

  const handleCancel = () => {
    // If opened in a modal/embedded flow, close that context.
    if (typeof fromLesson === "function") {
      fromLesson();
      return;
    }
    if (returnTo) {
      if (lessonReturnTo) {
        navigate(returnTo, { state: { returnTo: lessonReturnTo, moduleReturnTo: moduleReturnTo || null } });
      } else {
        navigate(returnTo);
      }
      return;
    }
    // Otherwise, return to previous page (with safe fallback).
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  // Adopt the category/type/level the opener suggested. Adjusting state during
  // render is React's documented alternative to an effect for a prop change
  // (#525): the effect rendered the form once with the old values first.
  const [suggestedFrom, setSuggestedFrom] = useState({ category, type, level });
  if (
    suggestedFrom.category !== category ||
    suggestedFrom.type !== type ||
    suggestedFrom.level !== level
  ) {
    setSuggestedFrom({ category, type, level });
    setFormData((prev) => ({
      ...prev,
      Category: category || prev.Category,
      Type: type || prev.Type,
      Level: level || prev.Level,
    }));
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setFieldErrors((prev) => ({ ...prev, [e.target.id]: "" }));
  };

  const handleAbstractChange = (value) => {
    setFormData({ ...formData, Abstract: value });
    setFieldErrors((prev) => ({ ...prev, Abstract: "" }));
  };

  function stripHtml(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  // Validate required fields
  const validateFields = () => {
    const errors = {};
    if (!formData.Title.trim()) errors.Title = "Title is required.";
    if (!formData.Abstract || !stripHtml(formData.Abstract).trim()) errors.Abstract = "Description is required.";
    if (!formData.Category.length) errors.Category = "Category is required.";
    if (!formData.Level.length) errors.Level = "Level is required.";
    if (!formData.Duration.trim()) errors.Duration = "Duration is required.";
    if (!formData.Type.length) errors.Type = "Type is required.";
    return errors;
  };

  const detectLinkType = (url) => {
    const u = (url || "").toLowerCase();
    if (u.includes("docs.google.com/presentation")) return "slides";
    if (u.includes("colab.research.google.com")) return "colab";
    return "other";
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setModalMessage("User not authenticated");
      setModalIsOpen(true);
      return;
    }

    // Capitalize first letter of displayName (if present)
    let authorName = user.displayName || user.email || user.uid;
    if (user.displayName) {
      authorName = user.displayName.charAt(0).toUpperCase() + user.displayName.slice(1);
    }

    try {
      const htmlDescription = formData.Abstract; // This is the HTML from ReactQuill
      const now = new Date();

      const attachmentsToSave = [
        ...pendingAttachments,
        // If user typed a link but forgot to click "+ Add Link", include it automatically
        ...(attachmentUrl.trim()
          ? [{
              kind: "link",
              linkType: detectLinkType(attachmentUrl.trim()),
              title: attachmentTitle.trim(),
              url: attachmentUrl.trim(),
              createdAt: now, // allowed inside arrays
            }]
          : []),
      ].map((a, idx) => ({
        ...a,
        // ensure every item is unique even if title/url are similar
        id: a.id || `${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`,
        createdAt: a.createdAt || now,
      }));

      if (editContentId) {
        await updateDoc(doc(db, COLLECTIONS.content, editContentId), {
          Title: formData.Title,
          Description: htmlDescription,
          Category: formData.Category,
          Level: formData.Level,
          Duration: formData.Duration,
          Type: formData.Type,
          Instructions: formData.Instructions,
          attachmentsToSave,
          LastModified: new Date().toISOString(),
        });
        setModalMessage("Content updated successfully");
        setModalIsOpen(true);
        return;
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.content), {
        Title: formData.Title,
        Description: htmlDescription, // <-- Save HTML!
        Category: formData.Category,
        Level: formData.Level,
        Duration: formData.Duration,
        Type: formData.Type,
        Instructions: formData.Instructions,
        Author: authorName,
        User: user.uid, // <-- Add this line to store the user ID
        createdAt: serverTimestamp(),
        Role: ROLES.TEACHER_PLUS, // <-- Added static Role field,
        attachmentsToSave,
      });
      const savedDoc = await getDoc(docRef);
      const newNugget = { id: docRef.id, ...savedDoc.data() };

      setModalMessage("Content submitted successfully");
      setFormData({
        Title: "",
        Category: [],
        Type: [],
        Level: [],
        Duration: "",
        isPublic: false,
        Abstract: "",
        Instructions: "",
      });
      setFieldErrors({});
      setPendingAttachments([]);
      setAttachmentTitle("");
      setAttachmentUrl("");


      setModalIsOpen(true);
      if (fromLesson) {
        if (onNuggetCreated) {
          onNuggetCreated(newNugget); // <-- Pass new nugget up
        }
        fromLesson(); // <-- Close the modal
      } else {
        setModalIsOpen(true); // Only show the modal if not in lesson builder popup
      }
    } catch (error) {
      setModalMessage("Error submitting content: " + error.message);
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);

    const wasSuccess = /successfully/i.test(modalMessage || "");

    if (editContentId) {
      if (returnTo) {
        if (lessonReturnTo) {
          navigate(returnTo, { state: { returnTo: lessonReturnTo, moduleReturnTo: moduleReturnTo || null } });
        } else {
          navigate(returnTo);
        }
        return;
      }
      navigate(`/content/${editContentId}`);
      return;
    }

    // For create flow: after a successful submit, return to where we came from.
    if (wasSuccess && typeof fromLesson !== "function") {
      if (returnTo) {
        if (lessonReturnTo) {
          navigate(returnTo, { state: { returnTo: lessonReturnTo, moduleReturnTo: moduleReturnTo || null } });
        } else {
          navigate(returnTo);
        }
        return;
      }
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      navigate("/");
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col gap-7">
          {/* Title */}
          <div>
            <label htmlFor="Title" className="block font-semibold mb-1.5 text-ink font-sans text-label">
              Title <RequiredAsterisk />
            </label>
            <input
              id="Title"
              type="text"
              placeholder="Enter the title of the nugget"
              value={formData.Title}
              onChange={handleChange}
              className="w-full py-2.5 px-3.5 rounded-md border-1.5 border-[#bbb] text-[1rem] mb-0.5 bg-[#fafbfc] font-sans"
            />
            {fieldErrors.Title && (
              <div className="[color:red] text-meta">
                Please fill out this field.
              </div>
            )}
            <div className="text-helper text-ink-faint font-sans">
              Provide a concise title for your content.
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="Abstract" className="block font-semibold mb-1.5 text-ink font-sans text-label">
              Description <RequiredAsterisk />
            </label>
            <ReactQuill
              useSemanticHTML={false}
              theme="snow"
              value={formData.Abstract}
              onChange={handleAbstractChange}
              className="bg-white bg-[#fafbfc] rounded-md mb-0.5 font-sans"
            />
            {fieldErrors.Abstract && (
              <div className="[color:red] text-meta">
                Please fill out this field.
              </div>
            )}
            <div className="text-helper text-ink-faint font-sans">
              Summarize the content of the nugget.
            </div>
          </div>

          {/* Category */}
          <div>
            <MultiCheckboxDropdown
              label="Category"
              options={CATEGORY_OPTIONS}
              selected={formData.Category}
              onChange={(values) => setFormData((prev) => ({ ...prev, Category: values }))}
              showRequired={true}
            />
            {fieldErrors.Category && (
              <div className="[color:red] text-meta mb-0">
                Please fill out this field.
              </div>
            )}
            <div className="text-helper text-ink-faint mt-0 mb-0">
              Select a relevant category.
            </div>
          </div>

          {/* Level */}
          <div>
          <MultiCheckboxDropdown
            label="Level"
            options={LEVEL_OPTIONS}
            selected={formData.Level}
            onChange={(values) => setFormData((prev) => ({ ...prev, Level: values }))}
            single={true}
            showRequired={true}
          />

            {fieldErrors.Level && (
              <div className="[color:red] text-meta mb-0">
                Please fill out this field.
              </div>
            )}
            <div className="text-helper text-ink-faint mt-0 mb-0">
              Choose the difficulty level.
            </div>
          </div>

          {/* Type */}
          <div>
          <MultiCheckboxDropdown
            label="Type"
            options={TYPE_OPTIONS}
            selected={formData.Type}
            onChange={(values) => setFormData((prev) => ({ ...prev, Type: values }))}
            single={true}
            showRequired={true}
          />

            {fieldErrors.Type && (
              <div className="[color:red] text-meta mb-0">
                Please fill out this field.
              </div>
            )}
            <div className="text-helper text-ink-faint mt-0 mb-0">
              Select the content type.
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="Duration" className="block font-semibold mb-1.5 text-ink">
              Duration (minutes) <RequiredAsterisk />
            </label>
            <input
              id="Duration"
              type="text"
              placeholder="Enter estimated duration"
              value={formData.Duration}
              onChange={handleChange}
              className="w-full py-2.5 px-3.5 rounded-md border-1.5 border-[#bbb] text-[1rem] mb-0.5 bg-[#fafbfc]"
            />
            {fieldErrors.Duration && (
              <div className="[color:red] text-meta">
                Please fill out this field.
              </div>
            )}
            <div className="text-helper text-ink-faint">
              How long will the content take to consume?
            </div>
          </div>

          {/* Attach Links */}
          <div>
            <label className="block font-semibold mb-1.5 text-ink">
              Attach Links (Google Slides / Colab)
            </label>

            <input
              type="text"
              placeholder="Optional title (e.g., Week 1 Slides)"
              value={attachmentTitle}
              onChange={(e) => setAttachmentTitle(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-md border-1.5 border-[#bbb] bg-[#fafbfc] mb-2.5"
            />

            <input
              type="text"
              placeholder="Paste link (https://...)"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-md border-1.5 border-[#bbb] bg-[#fafbfc] mb-2.5"
            />

            <button
              type="button"
              onClick={() => {
                const url = attachmentUrl.trim();
                if (!url) return;

                setPendingAttachments((prev) => [
                  ...prev,
                  {
                    kind: "link",
                    linkType: detectLinkType(url),
                    title: attachmentTitle.trim(),
                    url,
                  },
                ]);

                setAttachmentTitle("");
                setAttachmentUrl("");
              }}
              className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2 px-3.5 font-semibold cursor-pointer"
            >
              + Add Link
            </button>

            {pendingAttachments.length > 0 && (
              <div className="mt-3">
                <div className="font-semibold mb-1.5">Links added:</div>
                <ul className="ml-4.5">
                  {pendingAttachments.map((a, idx) => (
                    <li key={idx} className="mb-1.5">
                      <span className="font-semibold">
                        {a.title || (a.linkType === "slides" ? "Google Slides" : a.linkType === "colab" ? "Colab Notebook" : "Link")}
                      </span>
                      {" — "}
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        {a.url}
                      </a>
                      <button
                        type="button"
                        onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="ml-2.5 bg-none border-0 text-[#e74c3c] font-bold cursor-pointer"
                        aria-label="Remove link"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>


          {/* Instructions/Notes */}
          <div>
            <label htmlFor="Instructions" className="block font-semibold mb-1.5 text-ink font-sans text-label">
              Instructions/Notes
            </label>
            <ReactQuill
              useSemanticHTML={false}
              theme="snow"
              value={formData.Instructions}
              onChange={value => setFormData(prev => ({ ...prev, Instructions: value }))}
              className="bg-white bg-[#fafbfc] rounded-md mb-0.5 font-sans"
            />
            <div className="text-helper text-ink-faint">
              Use this area for each content's detailed instructions. You can add links, formatting, etc.
            </div>
          </div>
        </div>

        {/* Bottom row: Cancel and Save Nugget */}
        <div
          className="flex justify-center gap-6 mt-8"
        >
          <button
            type="button"
            onClick={handleCancel}
            className="bg-surface text-ink border-1.5 border-ink rounded-md py-3 px-12 font-semibold text-label cursor-pointer min-w-45 [transition:background_0.2s,_color_0.2s,_border_0.2s] font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-navy text-white border-1.5 border-navy rounded-md py-3 px-12 font-semibold text-label cursor-pointer min-w-45 [transition:background_0.2s,_color_0.2s,_border_0.2s] font-sans"
          >
            Save Nugget
          </button>
        </div>
      </form>
      {/* Modal remains unchanged */}
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
  );
};

export default UploadContent;
