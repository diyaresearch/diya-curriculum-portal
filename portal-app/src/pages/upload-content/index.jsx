import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, getDoc, doc, updateDoc } from "firebase/firestore";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { CATEGORY_OPTIONS, LEVEL_OPTIONS, TYPE_OPTIONS } from "../../constants/formOptions";
import MultiCheckboxDropdown from "../../components/MultiCheckboxDropdown";
import { COLLECTIONS } from "../../firebase/collectionNames";

// Avoid test/runtime crashes when #root is not present (e.g. Jest)
if (typeof document !== "undefined") {
  const appRoot = document.getElementById("root");
  if (appRoot) Modal.setAppElement(appRoot);
}

// Add this helper for required asterisks
const RequiredAsterisk = () => (
  <span style={{ color: "red", marginLeft: 4 }}>*</span>
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
    Category: [],
    Type: [],
    Level: [],
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
    const loadForEdit = async () => {
      try {
        if (!editContentId) return;
        const db = getFirestore();
        const snap = await getDoc(doc(db, COLLECTIONS.content, editContentId));
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

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      Category: category || prev.Category,
      Type: type || prev.Type,
      Level: level || prev.Level,
    }));
  }, [category, type, level]);

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
      const db = getFirestore();
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
      console.log("attachmentsToSave", attachmentsToSave);

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
        Role: "teacherPlus", // <-- Added static Role field,
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
    <div style={{ width: "100%" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Title */}
          <div>
            <label htmlFor="Title" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222", fontFamily: "Open Sans, sans-serif", fontSize: "1.08rem" }}>
              Title <RequiredAsterisk />
            </label>
            <input
              id="Title"
              type="text"
              placeholder="Enter the title of the nugget"
              value={formData.Title}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1.5px solid #bbb",
                fontSize: "1rem",
                marginBottom: "2px",
                background: "#fafbfc",
                fontFamily: "Open Sans, sans-serif",
              }}
            />
            {fieldErrors.Title && (
              <div style={{ color: "red", fontSize: "0.95rem" }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888", fontFamily: "Open Sans, sans-serif" }}>
              Provide a concise title for your content.
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="Abstract" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222", fontFamily: "Open Sans, sans-serif", fontSize: "1.08rem" }}>
              Description <RequiredAsterisk />
            </label>
            <ReactQuill
              theme="snow"
              value={formData.Abstract}
              onChange={handleAbstractChange}
              className="bg-white"
              style={{
                background: "#fafbfc",
                borderRadius: "6px",
                marginBottom: "2px",
                fontFamily: "Open Sans, sans-serif",
              }}
            />
            {fieldErrors.Abstract && (
              <div style={{ color: "red", fontSize: "0.95rem" }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888", fontFamily: "Open Sans, sans-serif" }}>
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
              <div style={{ color: "red", fontSize: "0.95rem", marginBottom: 0 }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888", marginTop: 0, marginBottom: 0 }}>
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
              <div style={{ color: "red", fontSize: "0.95rem", marginBottom: 0 }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888", marginTop: 0, marginBottom: 0 }}>
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
              <div style={{ color: "red", fontSize: "0.95rem", marginBottom: 0 }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888", marginTop: 0, marginBottom: 0 }}>
              Select the content type.
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="Duration" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222" }}>
              Duration (minutes) <RequiredAsterisk />
            </label>
            <input
              id="Duration"
              type="text"
              placeholder="Enter estimated duration"
              value={formData.Duration}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1.5px solid #bbb",
                fontSize: "1rem",
                marginBottom: "2px",
                background: "#fafbfc",
              }}
            />
            {fieldErrors.Duration && (
              <div style={{ color: "red", fontSize: "0.95rem" }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888" }}>
              How long will the content take to consume?
            </div>
          </div>

          {/* Attach Links */}
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222" }}>
              Attach Links (Google Slides / Colab)
            </label>

            <input
              type="text"
              placeholder="Optional title (e.g., Week 1 Slides)"
              value={attachmentTitle}
              onChange={(e) => setAttachmentTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1.5px solid #bbb",
                background: "#fafbfc",
                marginBottom: 10,
              }}
            />

            <input
              type="text"
              placeholder="Paste link (https://...)"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1.5px solid #bbb",
                background: "#fafbfc",
                marginBottom: 10,
              }}
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
              style={{
                background: "#fff",
                color: "#111",
                border: "1px solid #111",
                borderRadius: "6px",
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Link
            </button>

            {pendingAttachments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Links added:</div>
                <ul style={{ marginLeft: 18 }}>
                  {pendingAttachments.map((a, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>
                        {a.title || (a.linkType === "slides" ? "Google Slides" : a.linkType === "colab" ? "Colab Notebook" : "Link")}
                      </span>
                      {" — "}
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        {a.url}
                      </a>
                      <button
                        type="button"
                        onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          marginLeft: 10,
                          background: "none",
                          border: "none",
                          color: "#e74c3c",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
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
            <label htmlFor="Instructions" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222", fontFamily: "Open Sans, sans-serif", fontSize: "1.08rem" }}>
              Instructions/Notes
            </label>
            <ReactQuill
              theme="snow"
              value={formData.Instructions}
              onChange={value => setFormData(prev => ({ ...prev, Instructions: value }))}
              className="bg-white"
              style={{
                background: "#fafbfc",
                borderRadius: "6px",
                marginBottom: "2px",
                fontFamily: "Open Sans, sans-serif",
              }}
            />
            <div style={{ fontSize: "0.92rem", color: "#888" }}>
              Use this area for each content's detailed instructions. You can add links, formatting, etc.
            </div>
          </div>
        </div>

        {/* Bottom row: Cancel and Save Nugget */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            marginTop: "32px",
          }}
        >
          <button
            type="button"
            onClick={handleCancel}
            style={{
              background: "#fff",
              color: "#222",
              border: "1.5px solid #222",
              borderRadius: "6px",
              padding: "12px 48px",
              fontWeight: 600,
              fontSize: "1.08rem",
              cursor: "pointer",
              minWidth: "180px",
              transition: "background 0.2s, color 0.2s, border 0.2s",
              fontFamily: "Open Sans, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              background: "#162040",
              color: "#fff",
              border: "1.5px solid #162040",
              borderRadius: "6px",
              padding: "12px 48px",
              fontWeight: 600,
              fontSize: "1.08rem",
              cursor: "pointer",
              minWidth: "180px",
              transition: "background 0.2s, color 0.2s, border 0.2s",
              fontFamily: "Open Sans, sans-serif",
            }}
          >
            Save Nugget
          </button>
        </div>
      </form>
      {/* Modal remains unchanged */}
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
  );
};

export default UploadContent;
