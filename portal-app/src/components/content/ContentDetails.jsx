import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import DOMPurify from "dompurify";
import { db } from "@/firebase/firebaseConfig";
import { COLLECTIONS } from "@/firebase/collectionNames";
import BackButton from "@/components/ui/BackButton";
import MetaChipsRow from "@/components/ui/MetaChipsRow";
import { TYPO } from "@/constants/typography";
import SectionCard from "@/components/ui/SectionCard";
import EditButton from "@/components/ui/EditButton";
import DeleteButton from "@/components/ui/DeleteButton";
import useUserData from "@/hooks/useUserData";
import { api } from "@/utils/apiClient";
import Loading from "@/components/ui/Loading";
import { ROLES } from "@/constants/roles";

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
  // Seeded from the param rather than corrected by the effect afterwards (#525):
  // with no id there is nothing to fetch, so it is neither loading nor blank.
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(id ? "" : "Missing id in URL.");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [infoModalMessage, setInfoModalMessage] = useState("");
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;

    const fetchContent = async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.content, id));
        if (cancelled) return;

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

    return () => {
      cancelled = true;
    };
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

  if (loading) return <Loading variant="page" message="Loading content..." />;
  if (error) return <div className="p-10 [color:crimson]">{error}</div>;
  if (!content) return <div className="p-10">Content not found.</div>;

  const authUser = getAuth().currentUser;
  const isAdmin = userData?.role === ROLES.ADMIN;
  const isAuthor = !!authUser && !!content?.User && authUser.uid === content.User;
  const canManage = isAdmin || isAuthor;

  const handleDelete = async () => {
    try {
      if (!id) return;
      setIsDeleting(true);
      await deleteDoc(doc(db, COLLECTIONS.content, id));
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
    // Prefer server APIs (more likely to have permission than direct Firestore reads).
    // Any failure here means "cannot prove it is in use", so it degrades to []
    // rather than surfacing - apiClient attaches the token itself.
    const fetchJsonSafe = async (path) => {
      try {
        const data = await api.get(path);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    const lessonLists = isAdmin
      ? [await fetchJsonSafe("/api/lessons/admin")]
      : await Promise.all([
          fetchJsonSafe("/api/lessons"), // public lessons
          fetchJsonSafe("/api/lesson/myLessons"), // viewer's private lessons
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
    <div className="bg-surface min-h-screen">
      {/* Back control (match module page spacing) */}
      <div
        className="max-w-275 my-0 mx-auto pt-4.5 pr-5 pb-0 pl-5 flex items-center justify-between gap-3"
      >
        <BackButton onClick={() => navigate(-1)} />
        {canManage && (
          <div className="flex items-center gap-2.5">
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
        className="max-w-275 my-0 mx-auto pt-2.5 pr-5 pb-0 pl-5 text-center"
      >
        <h1 style={TYPO.pageTitle}>{content.Title}</h1>
        <MetaChipsRow
          className="mt-4.5"
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
      <div className="max-w-275 mt-7 mr-auto mb-0 ml-auto pt-0 pr-5 pb-20 pl-5">
        <SectionCard title="Description" className="mt-0">
          <div
            className="rich-text-content text-gray-700"
            style={TYPO.body}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.Description || "") }}
          />
        </SectionCard>

        {hasMeaningfulHtml(content.Instructions) && (
          <SectionCard title="Instructions / Notes">
            <div
              className="rich-text-content text-gray-700"
              style={TYPO.body}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.Instructions || "") }}
            />
          </SectionCard>
        )}

        <SectionCard title="Attachments">
          {attachments.length === 0 ? (
            <div style={{ ...TYPO.body, color: "#666", fontStyle: "italic" }}>No links attached.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {attachments.map((a) => {
            const title = a.title || (a.linkType === "slides" ? "Google Slides" : "Link");
            const url = a.url || "";
            const slidesEmbed = a.linkType === "slides" ? toSlidesEmbedUrl(url) : null;
            
            return (
              <div
                key={a.id || url}
                className="bg-[#fafafa] border border-rule rounded-lg p-5"
              >
                {/* Enhanced Title */}
                <div
                  className="text-[1.1rem] font-semibold text-ink-strong mb-3 pb-3 [border-bottom:1px_solid_#e5e7eb]"
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
                    className="[border:0px] rounded-lg"
                    allowFullScreen
                  />
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block py-3 px-4 bg-surface border border-rule rounded-md text-link no-underline font-medium [transition:all_0.2s_ease]"
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
          className="fixed top-0 left-0 right-0 bottom-0 [background:rgba(0,0,0,0.45)] z-[9999] flex items-center justify-center p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setIsDeleteModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-130 bg-surface rounded-2xl py-6 px-5.5 shadow-[0_18px_60px_rgba(0,0,0,0.2)] border border-rule"
          >
            <div style={{ ...TYPO.sectionTitle, fontSize: "1.2rem", fontWeight: 900, color: "#111" }}>
              Are you sure you want to delete this nugget?
            </div>
            <div className="mt-2.5 text-[#444] leading-[1.5]">
              This action cannot be undone.
            </div>

            <div className="flex justify-end gap-2.5 mt-4.5">
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
          className="fixed top-0 left-0 right-0 bottom-0 [background:rgba(0,0,0,0.45)] z-[9999] flex items-center justify-center p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsInfoModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-130 bg-surface rounded-2xl py-6 px-5.5 shadow-[0_18px_60px_rgba(0,0,0,0.2)] border border-rule"
          >
            <div className="mt-2.5 text-[#444] leading-[1.5]">
              {infoModalMessage || "This action cannot be completed."}
            </div>
            <div className="flex justify-end gap-2.5 mt-4.5">
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                className="bg-navy text-white border-2 border-navy rounded-[10px] py-2.5 px-3.5 cursor-pointer font-black"
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
