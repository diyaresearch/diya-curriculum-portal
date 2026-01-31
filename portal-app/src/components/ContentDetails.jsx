import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getFirestore, doc, getDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app as firebaseApp } from "../firebase/firebaseConfig";
import BackButton from "./BackButton";
import MetaChipsRow from "./MetaChipsRow";
import { TYPO } from "../constants/typography";
import SectionCard from "./SectionCard";
import EditButton from "./EditButton";
import DeleteButton from "./DeleteButton";
import useUserData from "../hooks/useUserData";

const toSlidesEmbedUrl = (url) => {
  // Example input: https://docs.google.com/presentation/d/<ID>/edit#slide=id....
  // Embed form:    https://docs.google.com/presentation/d/<ID>/embed?start=false&loop=false&delayms=3000
  try {
    const u = new URL(url);
    if (!u.hostname.includes("docs.google.com")) return null;
    if (!u.pathname.includes("/presentation/")) return null;

    // Convert .../edit... to .../embed...
    const path = u.pathname.replace("/edit", "/embed");
    return `${u.origin}${path}?start=false&loop=false&delayms=3000`;
  } catch {
    return null;
  }
};

const ContentDetails = () => {
  const { id } = useParams(); // must be called unconditionally
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useUserData();

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [infoModalMessage, setInfoModalMessage] = useState("");
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Missing id in URL.");
      setLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        const db = getFirestore(firebaseApp);
        const snap = await getDoc(doc(db, "content", id));

        if (snap.exists()) {
          setContent({ id: snap.id, ...snap.data() });
        } else {
          setError("Content not found.");
        }
      } catch (err) {
        setError(err.message || "Failed to load content.");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id]);

  const attachments = useMemo(() => {
    // You saved this field as "attachmentsToSave"
    const arr = content?.attachmentsToSave;
    return Array.isArray(arr) ? arr : [];
  }, [content]);

  const hasMeaningfulHtml = (html) => {
    if (!html) return false;
    const s = String(html)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return s.length > 0;
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, color: "crimson" }}>{error}</div>;
  if (!content) return <div style={{ padding: 40 }}>Content not found.</div>;

  const authUser = getAuth().currentUser;
  const isAdmin = userData?.role === "admin";
  const isAuthor = !!authUser && !!content?.User && authUser.uid === content.User;
  const canManage = isAdmin || isAuthor;

  const handleDelete = async () => {
    try {
      if (!id) return;
      setIsDeleting(true);
      const db = getFirestore(firebaseApp);
      await deleteDoc(doc(db, "content", id));
      setIsDeleteModalOpen(false);

      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      navigate("/");
    } catch (e) {
      console.error("Failed to delete content:", e);
      setInfoModalMessage("Failed to delete the nugget. Please try again.");
      setIsInfoModalOpen(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const lessonUsesContent = (lesson, contentId) => {
    try {
      const sections = Array.isArray(lesson?.sections) ? lesson.sections : [];
      return sections.some((s) => (Array.isArray(s?.contentIds) ? s.contentIds : []).includes(contentId));
    } catch {
      return false;
    }
  };

  const checkUsedInAnyLesson = async (contentId) => {
    const baseUrl = process.env.REACT_APP_SERVER_ORIGIN_URL || "";
    const auth = getAuth();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    // Prefer server APIs (more likely to have permission than direct Firestore reads).
    const fetchJsonSafe = async (url) => {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    const lessonLists = isAdmin
      ? [await fetchJsonSafe(`${baseUrl}/api/lessons/admin`)]
      : await Promise.all([
          fetchJsonSafe(`${baseUrl}/api/lessons`), // public lessons
          fetchJsonSafe(`${baseUrl}/api/lesson/myLessons`), // viewer's private lessons
        ]);

    const lessons = lessonLists.flat();
    return lessons.some((l) => lessonUsesContent(l, contentId));
  };

  const handleDeleteClick = async () => {
    try {
      if (!id) return;
      setIsCheckingUsage(true);

      const used = await checkUsedInAnyLesson(id);
      if (used) {
        setInfoModalMessage("This nugget cannot be deleted because it is already used in a lesson plan.");
        setIsInfoModalOpen(true);
        return;
      }

      setIsDeleteModalOpen(true);
    } catch (e) {
      console.error("Failed to check nugget usage:", e);
      // Fail-safe: don't allow delete if we can't verify usage
      setInfoModalMessage("Unable to verify if this nugget is used in a lesson plan. Please try again.");
      setIsInfoModalOpen(true);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Back control (match module page spacing) */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "18px 20px 0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <BackButton onClick={() => navigate(-1)} />
        {canManage && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EditButton
              label="Edit"
              onClick={() =>
                navigate("/nugget-builder", {
                  state: {
                    editContentId: id,
                    returnTo:
                      (location.state && location.state.returnTo) || `${location.pathname}${location.search || ""}`,
                    lessonReturnTo: (location.state && location.state.lessonReturnTo) || null,
                    moduleReturnTo: (location.state && location.state.moduleReturnTo) || null,
                  },
                })
              }
            />
            <DeleteButton onClick={handleDeleteClick} disabled={isCheckingUsage || isDeleting} />
          </div>
        )}
      </div>

      {/* Header (match module page) */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "10px 20px 0 20px",
          textAlign: "center",
        }}
      >
        <h1 style={TYPO.pageTitle}>{content.Title}</h1>
        <MetaChipsRow
          style={{ marginTop: 18 }}
          items={[
            { label: "Author", value: content.Author || "—" },
            { label: "Category", value: content.Category },
            { label: "Level", value: content.Level },
            { label: "Type", value: content.Type },
            {
              label: "Duration",
              value: content.Duration !== undefined && content.Duration !== null ? `${content.Duration} min` : "—",
            },
          ]}
        />
      </div>

      {/* Main content cards */}
      <div style={{ maxWidth: 1100, margin: "28px auto 0 auto", padding: "0 20px 80px 20px" }}>
        <SectionCard title="Description" style={{ marginTop: 0 }}>
          <div
            className="rich-text-content text-gray-700"
            style={TYPO.body}
            dangerouslySetInnerHTML={{ __html: content.Description || "" }}
          />
        </SectionCard>

        {hasMeaningfulHtml(content.Instructions) && (
          <SectionCard title="Instructions / Notes">
            <div
              className="rich-text-content text-gray-700"
              style={TYPO.body}
              dangerouslySetInnerHTML={{ __html: content.Instructions || "" }}
            />
          </SectionCard>
        )}

        <SectionCard title="Attachments">
          {attachments.length === 0 ? (
            <div style={{ ...TYPO.body, color: "#666", fontStyle: "italic" }}>No links attached.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {attachments.map((a) => {
            const title = a.title || (a.linkType === "slides" ? "Google Slides" : "Link");
            const url = a.url || "";
            const slidesEmbed = a.linkType === "slides" ? toSlidesEmbedUrl(url) : null;
            
            return (
              <div
                key={a.id || url}
                style={{
                  backgroundColor: "#fafafa",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "20px",
                }}
              >
                {/* Enhanced Title */}
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#111",
                    marginBottom: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {title}
                </div>
            
                {/* Content */}
                {slidesEmbed ? (
                  <iframe
                    title={title}
                    src={slidesEmbed}
                    width="100%"
                    height="480"
                    style={{ border: 0, borderRadius: 8 }}
                    allowFullScreen
                  />
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "12px 16px",
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      color: "#1a73e8",
                      textDecoration: "none",
                      fontWeight: 500,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f9fafb";
                      e.target.style.borderColor = "#1a73e8";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "#fff";
                      e.target.style.borderColor = "#e5e7eb";
                    }}
                  >
                    Open link →
                  </a>
                )}
              </div>
            );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {canManage && isDeleteModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setIsDeleteModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 16,
              padding: "24px 22px",
              boxShadow: "0 18px 60px rgba(0,0,0,0.2)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ ...TYPO.sectionTitle, fontSize: "1.2rem", fontWeight: 900, color: "#111" }}>
              Are you sure you want to delete this nugget?
            </div>
            <div style={{ marginTop: 10, color: "#444", lineHeight: 1.5 }}>
              This action cannot be undone.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                style={{
                  background: "#fff",
                  color: "#111",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                style={{
                  background: "#b91c1c",
                  color: "#fff",
                  border: "2px solid #b91c1c",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  fontWeight: 900,
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? "Deleting..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isInfoModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsInfoModalOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#fff",
              borderRadius: 16,
              padding: "24px 22px",
              boxShadow: "0 18px 60px rgba(0,0,0,0.2)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ marginTop: 10, color: "#444", lineHeight: 1.5 }}>
              {infoModalMessage || "This action cannot be completed."}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                style={{
                  background: "#162040",
                  color: "#fff",
                  border: "2px solid #162040",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentDetails;
