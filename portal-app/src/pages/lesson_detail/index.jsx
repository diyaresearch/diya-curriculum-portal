import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import axios from "axios";
import { FaFilePdf, FaVideo, FaExternalLinkAlt, FaDownload, FaTrash, FaEdit, FaChevronDown } from "react-icons/fa";

export const LessonDetail = () => {
  const [lesson, setLesson] = useState(null);
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [contentDetails, setContentDetails] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleDownload = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        navigate("/lesson-generator");
        return;
      }

      const token = await user.getIdToken();
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lessons/${lessonId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "lesson.pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download the lesson plan.");
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        navigate("/lesson-generator");
        return;
      }

      if (user.uid !== '767Tnvj1DKSUrxshqUv4VvMIkxp1'){
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
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          navigate("/lesson-generator");
          return;
        }

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
          acc[content.id] = content;
          return acc;
        }, {});

        setContentDetails(contentDetailsMap);
      } catch (error) {
        console.error("Error fetching lesson:", error);
      }
    };

    fetchLesson();
  }, [lessonId, navigate]);

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

  const { title, subject, level, duration, description, objectives, sections } = lesson;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Lesson Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <div className="flex space-x-2">
              <div className="relative">
                <button
                  onClick={toggleDropdown}
                  className="p-2 border border-gray-300 rounded inline-flex items-center px-4 py-2 bg-white-600 text-black rounded-lg hover:bg-white-700 transition-colors"
                >
                  Select an action
                  <FaChevronDown className="ml-2" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                    <button
                      onClick={handleDownload}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      <FaDownload className="inline-block mr-2" />
                      Download Plan
                    </button>
                    <button
                      onClick={() => navigate(`/edit-lesson/${lessonId}`)}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      <FaEdit className="inline-block mr-2" />
                      Edit Plan
                    </button>
                    <button
                      onClick={openModal}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
                    >
                      <FaTrash className="inline-block mr-2" />
                      Delete Plan
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Subject:</span>
                <span className="ml-2 text-gray-800">{subject}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Grade Level:</span>
                <span className="ml-2 text-gray-800">{level}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Duration:</span>
                <span className="ml-2 text-gray-800">{duration} minutes</span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="p-6 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Description</h2>
            <p className="text-gray-700 leading-relaxed">{description}</p>
          </div>

          {/* Objectives Section */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Learning Objectives</h2>
            <ul className="list-disc pl-5 space-y-2">
              {objectives.map((objective, index) => (
                <li key={index} className="text-gray-700">{objective}</li>
              ))}
            </ul>
          </div>

          {/* Lesson Sections */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Lesson Content</h2>
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-8 last:mb-0">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Section {sectionIndex + 1}
                  </h3>
                  <p className="text-gray-700">{section.intro}</p>
                </div>

                <div className="space-y-6">
                  {section.contentIds.map((contentId, contentIndex) => {
                    const content = contentDetails[contentId];
                    if (!content) return null;

                    return (
                      <div key={contentIndex} className="border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          {isVideoLink(content.fileUrl) && <FaVideo className="mr-2 text-blue-600" />}
                          {content.fileUrl?.toLowerCase().includes('.pdf') && <FaFilePdf className="mr-2 text-red-600" />}
                          {!isVideoLink(content.fileUrl) && !content.fileUrl?.toLowerCase().includes('.pdf') && 
                            <FaExternalLinkAlt className="mr-2 text-gray-600" />}
                          <h4 className="text-lg font-medium">
                            Content {contentIndex + 1} ({content.Duration}min)
                          </h4>
                        </div>

                        <p className="text-gray-600 mb-4">{content.Abstract}</p>

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
                          <a
                            href={content.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            {content.fileUrl?.toLowerCase().includes('.pdf') ? (
                              <>
                                <FaFilePdf className="mr-2" />
                                View PDF Document
                              </>
                            ) : (
                              <>
                                <FaExternalLinkAlt className="mr-2" />
                                Access Content
                              </>
                            )}
                          </a>
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
            <p className="text-gray-600 mb-6">Are you sure you want to delete this lesson plan? This action cannot be undone.</p>
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
