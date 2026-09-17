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
      <div className="w-full max-w-175 mb-8 text-center">
        <h2
          className="text-[2.8rem] font-bold text-ink-strong m-0 tracking-[1px] font-sans"
        >
          {heading}
        </h2>
        <p
          className="mt-4 text-page-subtitle text-ink-strong font-medium font-sans"
        >
          {subheading}
        </p>
      </div>
      <div
        className="w-full max-w-225 grid [grid-template-columns:repeat(3,_1fr)] gap-5 mb-8"
      >
        {drafts.length === 0 ? (
          <div
            className="bg-surface border-2 border-rule rounded-xl shadow-[0_4px_24px_rgba(22,32,64,0.10)] p-10 text-center text-ink-faint text-[1.15rem] font-sans"
          >
            No drafts found.
          </div>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              className="bg-surface border-2 border-rule rounded-[10px] shadow-[0_2px_8px_rgba(22,32,64,0.08)] pt-4 pr-2.5 pb-3.5 pl-3.5 flex flex-col gap-2 font-sans min-h-35 relative cursor-pointer [transition:box-shadow_0.2s,_background_0.2s] max-w-65"
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
                className="absolute top-2 right-2.5 bg-none border-0 text-[#e74c3c] font-bold text-[1.1rem] cursor-pointer z-[2]"
                title="Delete Draft"
              >
                &times;
              </button>
              <div className="font-bold text-[1.02rem] text-ink-strong mb-0.5">
                {draft.title || untitledLabel}
              </div>
              <div className="text-ink-muted text-helper mb-0.5">
                {draft.category.join(", ")}
                &middot; {draft.level.join(", ")}
                &middot; {draft.type.join(", ")}
              </div>
              <div className="flex gap-2 mt-auto mb-4.5">
                <span
                  className="text-link font-semibold text-[0.93rem] underline"
                >
                  Continue Editing &rarr;
                </span>
              </div>
              <div
                className="absolute left-3.5 bottom-2 text-ink-faint text-[0.80rem] w-[calc(100%_-_28px)] text-right pointer-events-none"
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
        className="bg-surface text-ink-strong border border-ink-strong rounded-md py-2.5 px-7 font-semibold cursor-pointer font-sans text-label"
      >
        {createLabel}
      </button>
    </div>
  );
};

export default DraftsPage;
