import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const LessonPlanDrafts = () => {
  const [drafts, setDrafts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDrafts([]);
        return;
      }
      const db = getFirestore();
      const q = query(
        collection(db, "lesson"),
        where("author", "==", user.uid),
        where("isDraft", "==", true)
      );
      const snapshot = await getDocs(q);
      setDrafts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleEditDraft = (draft) => {
    localStorage.setItem("lessonPlanDraft", JSON.stringify(draft));
    navigate("/lesson-plans/builder");
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    const db = getFirestore();
    await deleteDoc(doc(db, "lesson", draftId));
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
          Lesson Plan Drafts
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
          Continue editing your saved lesson plan drafts below.
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
                {draft.title || "Untitled Lesson Plan"}
              </div>
              <div style={{ color: "#666", fontSize: "0.92rem", marginBottom: 2 }}>
                {draft.category} &middot; {draft.level} &middot; {draft.type}
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
        onClick={() => navigate("/lesson-plans/builder")}
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
        + Create New Lesson Plan
      </button>
    </div>
  );
};

export default LessonPlanDrafts;
