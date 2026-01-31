import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import useUserData from "../../hooks/useUserData";
import BackButton from "../../components/BackButton";
import EditButton from "../../components/EditButton";
import DeleteButton from "../../components/DeleteButton";
import MetaChipsRow from "../../components/MetaChipsRow";
import SectionCard from "../../components/SectionCard";
import { FaExternalLinkAlt } from "react-icons/fa";
import "react-quill/dist/quill.snow.css";
import DOMPurify from "dompurify";
import { TYPO } from "../../constants/typography";

export const LessonDetail = () => {
  const { user, userData, loading } = useUserData();
  const [lesson, setLesson] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { lessonId } = useParams();
  const [contentDetails, setContentDetails] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [author, setAuthor] = useState(null);
  const [authorId, setAuthorId] = useState(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Ensure we start at top when navigating here
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [lessonId]);

  const returnTo = (location.state && location.state.returnTo) || null;
  const moduleReturnTo = (location.state && location.state.moduleReturnTo) || null;

  const isAdmin = userData?.role === "admin";
  const isAuthor = !!user && !!authorId && user.uid === authorId;
  const canManage = isAdmin || isAuthor;

  const handleConfirmDelete = async () => {
    try {
      if (!user || !canManage) {
        console.error("No permissions to delete lesson");
        alert("Contact Admin to delete the lesson plan.");
        return;
      }

      const token = await user.getIdToken();
      await axios.delete(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Lesson plan deleted successfully.");
      navigate("/my-plans");
    } catch (error) {
      console.error("Error deleting lesson:", error);
      alert("Failed to delete the lesson plan.");
    } finally {
      closeModal();
    }
  };

  // 1) Helper function to check if the content is a video
  const isVideoLink = (url) => {
    if (!url) return false;
    // Basic check for either Vimeo or YouTube
    return url.includes("vimeo.com") || url.includes("youtube.com") || url.includes("youtu.be");
  };

  // 2) Helper function to generate embed URL for Vimeo/YouTube
  const getEmbedUrl = (url) => {
    if (url.includes("vimeo.com")) {
      // Vimeo embed format: https://player.vimeo.com/video/VIDEO_ID
      // Extract everything after the last "/" and remove any query strings/hash
      const regex = /vimeo\.com\/(\d+)/;
      const match = url.match(regex);
      const videoId = match ? match[1] : null;
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      // YouTube embed format: https://www.youtube.com/embed/VIDEO_ID
      // Try to extract the video ID from various possible link formats
      let videoId = null;

      // Case 1: youtube.com/watch?v=VIDEO_ID
      const regExp = /[?&]v=([^&#]*)/;
      const match = url.match(regExp);
      if (match && match[1]) {
        videoId = match[1];
      }

      // Case 2: youtu.be/VIDEO_ID
      if (!videoId && url.includes("youtu.be")) {
        const parts = url.split("/");
        videoId = parts[parts.length - 1].split(/[?&#]/)[0];
      }

      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    // If it doesn't match either, just return the original URL
    return url;
  };

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        if (!loading && !user) {
          navigate("/lesson-generator");
          return;
        }

        if (loading || !user) return;

        const token = await user.getIdToken();
        const response = await axios.get(
          `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/${lessonId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const lessonData = response.data;
        setLesson(lessonData);

        const contentPromises = lessonData.sections.flatMap((section) =>
          section.contentIds.map(async (contentId) => {
            const contentResponse = await axios.get(
              `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/unit/${contentId}`
            );
            return { contentId, ...contentResponse.data };
          })
        );

        const contentData = await Promise.all(contentPromises);
        const contentDetailsMap = contentData.reduce((acc, content) => {
          // Key by the ID referenced in lesson.sections[].contentIds
          acc[content.contentId] = content;
          return acc;
        }, {});

        setContentDetails(contentDetailsMap);

        // Author ID can be stored under different keys depending on schema/version.
        const authorUid =
          lessonData.authorId ||
          lessonData.author ||
          lessonData.userId ||
          lessonData.User ||
          lessonData.user ||
          null;
        setAuthorId(authorUid || null);

        if (authorUid) {
          const authorResponse = await axios.get(
            `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/${authorUid}`
          );
          setAuthor(authorResponse.data);
        }
      } catch (error) {
        console.error("Error fetching lesson:", error);
      }
    };

    if (!loading) {
      fetchLesson();
    }
  }, [lessonId, navigate, user, loading]);

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }

  const { title, type, category, level, duration, description, objectives, sections } = lesson;

  const formatDurationShort = (value) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number" && Number.isFinite(value)) return `${value} min`;
    const s = String(value).trim();
    if (!s) return "—";
    // If already contains min/hr, keep as-is.
    if (/min|hour|hr/i.test(s)) return s;
    // If it's numeric string, add min.
    const n = Number(s);
    if (!Number.isNaN(n) && Number.isFinite(n)) return `${n} min`;
    return s;
  };

  // ReactQuill expects a string value; lesson fields may be arrays/undefined depending on source.
  const descriptionHtml = typeof description === "string" ? description : "";
  const objectivesHtml = Array.isArray(objectives)
    ? objectives.filter(Boolean).join("")
    : typeof objectives === "string"
      ? objectives
      : "";
  const safeSections = Array.isArray(sections) ? sections : [];
  const authorName =
    author?.firstName && author?.lastName
      ? `${author.firstName} ${author.lastName}`
      : author?.fullName || author?.email || "—";

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Back + Edit controls (match module page) */}
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
        <BackButton
          to={returnTo || undefined}
          state={moduleReturnTo ? { returnTo: moduleReturnTo } : undefined}
          fallbackTo="/"
        />
        {canManage && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EditButton
              onClick={() =>
                navigate("/lesson-plans/builder", {
                  state: {
                    editLessonId: lessonId,
                    returnTo: `${location.pathname}${location.search || ""}`,
                    lessonReturnTo: returnTo || null,
                    moduleReturnTo: moduleReturnTo || null,
                  },
                })
              }
            />
            <DeleteButton onClick={openModal} />
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
        <h1 style={TYPO.pageTitle}>{title}</h1>
        <MetaChipsRow
          style={{ marginTop: 18 }}
          items={[
            { label: "Author", value: authorName },
            { label: "Category", value: category },
            { label: "Level", value: level },
            { label: "Type", value: type },
            { label: "Duration", value: formatDurationShort(duration) },
          ]}
        />
      </div>

      {/* Main content cards */}
      <div style={{ maxWidth: 1100, margin: "28px auto 0 auto", padding: "0 20px 80px 20px" }}>
        <SectionCard title="Description" style={{ marginTop: 0 }}>
          <div
            className="rich-text-content text-gray-700"
            style={TYPO.body}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(descriptionHtml) }}
          />
        </SectionCard>

        <SectionCard title="Learning Objectives">
          <div
            className="rich-text-content text-gray-700"
            style={TYPO.body}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(objectivesHtml) }}
          />
        </SectionCard>

        <SectionCard title="Lesson Content">
          {safeSections.map((section, sectionIndex) => (
            <div key={sectionIndex} style={{ marginTop: sectionIndex === 0 ? 0 : 18 }}>
              <div
                className="rich-text-content text-gray-700"
                style={{ ...TYPO.body, marginBottom: 14 }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(typeof section?.intro === "string" ? section.intro : ""),
                }}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(Array.isArray(section?.contentIds) ? section.contentIds : []).map((contentId, contentIndex) => {
                  const content = contentDetails[contentId];
                  if (!content) return null;

                  return (
                    <div
                      key={contentIndex}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: "14px 16px",
                        background: "#fff",
                      }}
                    >
                      <div style={{ ...TYPO.sectionTitle, fontSize: "1.05rem", fontWeight: 600 }}>
                        {content.Title || content.title || `Content ${contentIndex + 1}`}
                      </div>

                      <div
                        style={{ ...TYPO.body, color: "#666", marginTop: 8, marginBottom: 12 }}
                        className="rich-text-content"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.Abstract || "") }}
                      />

                      {isVideoLink(content.fileUrl) ? (
                        <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
                          <iframe
                            src={getEmbedUrl(content.fileUrl)}
                            frameBorder="0"
                            allow="autoplay; fullscreen"
                            allowFullScreen
                            title={`Content Video ${contentIndex + 1}`}
                            className="absolute top-0 left-0 w-full h-full"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/content/${contentId}`, {
                              state: {
                                // back to this lesson page
                                returnTo: `${location.pathname}${location.search || ""}`,
                                // preserve where the lesson page itself should go "Back" to (e.g. module builder)
                                lessonReturnTo: (location.state && location.state.returnTo) || null,
                                // preserve where the module page should go "Back" to (e.g. home page)
                                moduleReturnTo: (location.state && location.state.moduleReturnTo) || null,
                              },
                            })
                          }
                          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <FaExternalLinkAlt className="mr-2" />
                          View Details
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* Delete Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Lesson Plan</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this lesson plan? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonDetail;
