import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { useAuth } from "@/context/AuthProvider";

/**
 * The one drafts screen (#444). Lesson-plan drafts and module drafts were two
 * 240-line files that differed only in the collection they queried, the
 * localStorage key the builder reads back, the builder route, and four strings -
 * so a fix to one silently left the other behind.
 *
 * Both entry points (`pages/lesson-plans/drafts.jsx`, `pages/module_builder/drafts.jsx`)
 * are now thin configs over this component, and keep their own routes.
 */
/** Firestore holds these as either a string or an array, depending on when the
 * draft was written. Normalise once so the card can just join(). */
const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const DraftsPage = ({
  collectionName,
  draftStorageKey,
  builderPath,
  heading,
  subheading,
  untitledLabel,
  createLabel,
}) => {
  const [drafts, setDrafts] = useState([]);
  const navigate = useNavigate();
  // The uid comes from the shared provider (#368); this page used to open its
  // own auth listener purely to learn who was signed in before querying.
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const loadDrafts = async () => {
      if (!user) {
        setDrafts([]);
        return;
      }
      const q = query(
        collection(db, collectionName),
        where("author", "==", user.uid),
        where("isDraft", "==", true)
      );
      const snapshot = await getDocs(q);
      if (cancelled) return;
      setDrafts(
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          category: toArray(doc.data().category),
          type: toArray(doc.data().type),
          level: toArray(doc.data().level),
        }))
      );
    };

    loadDrafts();

    return () => {
      cancelled = true;
    };
  }, [user, collectionName]);

  const handleEditDraft = (draft) => {
    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    navigate(builderPath);
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    await deleteDoc(doc(db, collectionName, draftId));
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start"
      style={{
        background: "#F6F8FA",
        minHeight: "100vh",
        width: "100%",
        paddingTop: "30px", // reduced from 60px
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
          {heading}
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
          {subheading}
        </p>
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)", // 3 cards per row
          gap: "20px",
          marginBottom: 32,
        }}
      >
        {drafts.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 4px 24px rgba(22,32,64,0.10)",
              padding: "40px",
              textAlign: "center",
              color: "#888",
              fontSize: "1.15rem",
              fontFamily: "Open Sans, sans-serif"
            }}
          >
            No drafts found.
          </div>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              style={{
                background: "#fff",
                border: "2px solid #e5e7eb",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(22,32,64,0.08)",
                padding: "16px 10px 14px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontFamily: "Open Sans, sans-serif",
                minHeight: 140, // increased from 90 to 140
                position: "relative",
                cursor: "pointer",
                transition: "box-shadow 0.2s, background 0.2s",
                maxWidth: 260,
              }}
              onClick={() => handleEditDraft(draft)}
              onMouseOver={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(22,32,64,0.13)"}
              onMouseOut={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(22,32,64,0.08)"}
            >
              {/* Delete button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteDraft(draft.id);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                  background: "none",
                  border: "none",
                  color: "#e74c3c",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  zIndex: 2,
                }}
                title="Delete Draft"
              >
                &times;
              </button>
              <div style={{ fontWeight: 700, fontSize: "1.02rem", color: "#111", marginBottom: 2 }}>
                {draft.title || untitledLabel}
              </div>
              <div style={{ color: "#666", fontSize: "0.92rem", marginBottom: 2 }}>
                {draft.category.join(", ")}
                &middot; {draft.level.join(", ")}
                &middot; {draft.type.join(", ")}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: "auto", marginBottom: 18 }}>
                <span
                  style={{
                    color: "#1a73e8",
                    fontWeight: 600,
                    fontSize: "0.93rem",
                    textDecoration: "underline",
                  }}
                >
                  Continue Editing &rarr;
                </span>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  bottom: 8,
                  color: "#888",
                  fontSize: "0.80rem",
                  width: "calc(100% - 28px)",
                  textAlign: "right",
                  pointerEvents: "none"
                }}
              >
                Last updated:{" "}
                {draft.updatedAt?.toDate
                  ? draft.updatedAt.toDate().toLocaleString()
                  : "—"}
              </div>
            </div>
          ))
        )}
      </div>
      <button
        onClick={() => navigate(builderPath)}
        style={{
          background: "#fff",
          color: "#111",
          border: "1px solid #111",
          borderRadius: "6px",
          padding: "10px 28px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "Open Sans, sans-serif",
          fontSize: "1.08rem"
        }}
      >
        {createLabel}
      </button>
    </div>
  );
};

export default DraftsPage;
