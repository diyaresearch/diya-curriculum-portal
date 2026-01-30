import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import useUserData from "../../hooks/useUserData";
import {
  FaExternalLinkAlt,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import "react-quill/dist/quill.snow.css";
import DOMPurify from "dompurify";

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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const handleConfirmDelete = async () => {
    try {
      if (userData.role !== "admin" && user.uid !== authorId) {
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

        if (lessonData.authorId) {
          const authorResponse = await axios.get(
            `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/${lessonData.authorId}`
          );
          setAuthor(authorResponse.data);
          setAuthorId(lessonData.authorId);
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

  const { title, type, category, level, duration, description, objectives, sections, isPublic } = lesson;
  const canManage = !!user && (userData?.role === "admin" || (!!authorId && user.uid === authorId));

  // ReactQuill expects a string value; lesson fields may be arrays/undefined depending on source.
  const descriptionHtml = typeof description === "string" ? description : "";
  const objectivesHtml = Array.isArray(objectives)
    ? objectives.filter(Boolean).join("")
    : typeof objectives === "string"
      ? objectives
      : "";
  const safeSections = Array.isArray(sections) ? sections : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 transition-colors"
          >
            ← Back
          </button>

          {canManage && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate("/lesson-plans/builder", {
                    state: { editLessonId: lessonId, returnTo: location.pathname },
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 transition-colors"
              >
                <FaEdit />
                Edit
              </button>
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 rounded bg-white text-red-700 hover:bg-red-50 transition-colors"
              >
                <FaTrash />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Lesson Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Type:</span>
                <span className="ml-2 text-gray-800">{type}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Category:</span>
                <span className="ml-2 text-gray-800">{category}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Level:</span>
                <span className="ml-2 text-gray-800">{level}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Duration:</span>
                <span className="ml-2 text-gray-800">{duration} minutes</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Is Public:</span>
                <span className="ml-2 text-gray-800">{isPublic ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>

          {/* Author Section */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Author Details</h2>
            {author ? (
              <div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Name:</strong>{" "}
                  {author.firstName && author.lastName
                    ? `${author.firstName} ${author.lastName}`
                    : author.fullName}
                </p>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Email:</strong> {author.email}
                </p>
              </div>
            ) : (
              <p>No author information available</p>
            )}
          </div>

          {/* Description Section */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Description</h2>
            <div
              className="rich-text-content text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(descriptionHtml) }}
            />
          </div>

          {/* Objectives Section */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Learning Objectives</h2>
            <div
              className="rich-text-content text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(objectivesHtml) }}
            />
          </div>

          {/* Lesson Sections */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Lesson Content</h2>
            {safeSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-8 last:mb-0">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Section {sectionIndex + 1}
                </h3>
                <div
                  className="rich-text-content text-gray-700 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(typeof section?.intro === "string" ? section.intro : ""),
                  }}
                />

                <div className="space-y-6">
                  {(Array.isArray(section?.contentIds) ? section.contentIds : []).map((contentId, contentIndex) => {
                    const content = contentDetails[contentId];
                    if (!content) return null;

                    return (
                      <div key={contentIndex} className="border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <h4 className="text-lg font-medium">
                            {content.Title || content.title || `Content ${contentIndex + 1}`}
                          </h4>
                        </div>

                        {/* <p className="text-gray-600 mb-4">{content.Abstract}</p> */}
                        <div
                          className="text-gray-600 mb-4"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.Abstract) }}
                        />

                        {/* Content Display */}
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
                            onClick={() => navigate(`/content/${contentId}`)}
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
          </div>
        </div>
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
