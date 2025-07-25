import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import Quill CSS

Modal.setAppElement("#root");

export const UploadContent = ({
  fromLesson,
  onNuggetCreated,
  isPublic,
  type,
  category,
  level,
  title,
}) => {
  const [formData, setFormData] = useState({
    Title: "",
    Category: category || "",
    Type: type || "",
    Level: level || "",
    Duration: "",
    isPublic: isPublic || false,
    Abstract: "",
    Instructions: "",
  });

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const navigate = useNavigate();

  // Ensure form updates if new props are passed in
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
    // Only clear the error for the field being edited
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
    if (!formData.Category.trim()) errors.Category = "Category is required.";
    if (!formData.Level.trim()) errors.Level = "Level is required.";
    if (!formData.Duration.trim()) errors.Duration = "Duration is required.";
    if (!formData.Type.trim()) errors.Type = "Type is required.";
    if (!formData.Instructions.trim()) errors.Instructions = "Instructions/Notes are required.";
    return errors;
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
      const plainDescription = stripHtml(formData.Abstract);

      await addDoc(collection(db, "content"), {
        Title: formData.Title,
        Description: plainDescription,
        Category: formData.Category,
        Level: formData.Level,
        Duration: formData.Duration,
        Type: formData.Type,
        Instructions: formData.Instructions,
        Author: authorName,
        createdAt: serverTimestamp(),
      });

      setModalMessage("Content submitted successfully");
      setFormData({
        Title: "",
        Category: category || "",
        Type: type || "",
        Level: level || "",
        Duration: "",
        isPublic: false,
        Abstract: "",
        Instructions: "",
      });
      setFieldErrors({});

      setModalIsOpen(true);
      if (fromLesson) {
        closeModal();
        if (onNuggetCreated) {
          onNuggetCreated();
        }
      }
    } catch (error) {
      setModalMessage("Error submitting content: " + error.message);
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
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
              Title
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
              Description
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
            <label htmlFor="Category" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222" }}>
              Category
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["AI Principles", "Data Science", "Machine Learning", "Statistics", "Other"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, Category: cat }));
                    setFieldErrors((prev) => ({ ...prev, Category: "" }));
                  }}
                  style={{
                    background: formData.Category === cat ? "#162040" : "#fff",
                    color: formData.Category === cat ? "#fff" : "#222",
                    border: formData.Category === cat ? "2px solid #162040" : "1.5px solid #bbb",
                    borderRadius: "6px",
                    padding: "7px 18px",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            {fieldErrors.Category && (
              <div style={{ color: "red", fontSize: "0.95rem" }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888" }}>
              Select a relevant category.
            </div>
          </div>

          {/* Level */}
          <div>
            <label htmlFor="Level" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222" }}>
              Level
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {["Basic", "Intermediate", "Advanced"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, Level: lvl }));
                    setFieldErrors((prev) => ({ ...prev, Level: "" }));
                  }}
                  style={{
                    background: formData.Level === lvl ? "#162040" : "#fff",
                    color: formData.Level === lvl ? "#fff" : "#222",
                    border: formData.Level === lvl ? "2px solid #162040" : "1.5px solid #bbb",
                    borderRadius: "6px",
                    padding: "7px 18px",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: "pointer",
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
            {fieldErrors.Level && (
              <div style={{ color: "red", fontSize: "0.95rem" }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888" }}>
              Choose the difficulty level.
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="Duration" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222" }}>
              Duration (minutes)
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

          {/* Type */}
          <div>
            <label htmlFor="Type" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222" }}>
              Type
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["Lecture", "Assignment", "Dataset"].map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, Type: tp }));
                    setFieldErrors((prev) => ({ ...prev, Type: "" }));
                  }}
                  style={{
                    background: formData.Type === tp ? "#162040" : "#fff",
                    color: formData.Type === tp ? "#fff" : "#222",
                    border: formData.Type === tp ? "2px solid #162040" : "1.5px solid #bbb",
                    borderRadius: "6px",
                    padding: "7px 18px",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: "pointer",
                  }}
                >
                  {tp}
                </button>
              ))}
            </div>
            {fieldErrors.Type && (
              <div style={{ color: "red", fontSize: "0.95rem" }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888" }}>
              Select the content type.
            </div>
          </div>

          {/* Instructions/Notes (no file upload) */}
          <div>
            <label htmlFor="Instructions" style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#222" }}>
              Instructions/Notes
            </label>
            <input
              id="Instructions"
              type="text"
              placeholder="Add any further instructions or notes..."
              value={formData.Instructions}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1.5px solid #bbb",
                fontSize: "1rem",
                marginBottom: "8px",
                background: "#fafbfc",
              }}
            />
            {fieldErrors.Instructions && (
              <div style={{ color: "red", fontSize: "0.95rem" }}>
                Please fill out this field.
              </div>
            )}
            <div style={{ fontSize: "0.92rem", color: "#888" }}>
              Use this area for each content's detailed instructions.
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
            onClick={() => navigate(-1)}
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
              background: "#162040", // navy blue
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
          onClick={() => {
            // Go back to the nugget builder page instead of home
            window.location.href = "/nugget-builder";
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Close
        </button>
      </Modal>
    </div>
  );
};

export default UploadContent;
