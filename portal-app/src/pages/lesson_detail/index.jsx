import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getAuth } from "firebase/auth";

export const LessonDetail = () => {
  const [lesson, setLesson] = useState(null);
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [contentDetails, setContentDetails] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        `http://localhost:3001/api/lessons/${lessonId}/download`,
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

      const token = await user.getIdToken();
      await axios.delete(`http://localhost:3001/api/lesson/${lessonId}`, {
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
          `http://localhost:3001/api/lesson/${lessonId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const lessonData = response.data;
        setLesson(lessonData);
        const contentPromises = lessonData.sections.flatMap((section) =>
          section.contentIds.map(async (contentId) => {
            const contentResponse = await axios.get(
              `http://localhost:3001/api/unit/${contentId}`
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
    return <div>Loading...</div>;
  }

  const { title, subject, level, duration, description, objectives, sections } =
    lesson;

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col items-center justify-center">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-3xl relative flex-grow">
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            onClick={() => navigate("/my-plans")}
          >
            Back to Plans
          </button>
        </div>
        <h1 className="text-3xl text-center mb-4">Lesson Plan</h1>
        <h2 className="text-2xl text-center mb-4">{title}</h2>

        <div className="mb-4">
          <h3 className="text-xl font-bold underline">Lesson Subject:</h3>
          <p>{subject}</p>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold underline">Grade Level:</h3>
          <p>{level}</p>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold underline">Lesson Duration:</h3>
          <p>{duration} minutes</p>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold underline">Lesson Description:</h3>
          <p>{description}</p>
        </div>

        <div className="mb-4">
          <h3 className="text-xl font-bold underline">Lesson Objectives:</h3>
          <ol className="list-decimal list-inside">
            {objectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ol>
        </div>

        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            <h3 className="text-xl font-bold underline">{`Section ${
              sectionIndex + 1
            }`}</h3>
            <p className="mb-2">{section.intro}</p>
            {section.contentIds.map((contentId, contentIndex) => {
              const content = contentDetails[contentId];
              if (!content) {
                return <div key={contentIndex}>Loading content...</div>;
              }
              return (
                <div key={contentIndex} className="mb-2">
                  <h4 className="font-semibold">
                    Content {contentIndex + 1} ({content.Duration}min)
                  </h4>
                  <p className="italic">{content.Abstract}</p>
                  <a href={content.fileUrl} className="text-blue-500 underline">
                    View Content
                  </a>
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex justify-center mt-8 space-x-2">
          <button
            type="button"
            className="bg-red-500 text-white py-2 px-4 rounded-full border border-red-700 hover:bg-red-700"
            onClick={openModal}
          >
            Delete
          </button>
          <button
            type="button"
            className="bg-blue-500 text-white py-2 px-4 rounded-full border border-blue-700 hover:bg-blue-700"
            onClick={handleDownload}
          >
            Download
          </button>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-xl mb-4">
              Are you sure you want to delete this lesson plan?
            </h2>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="bg-gray-500 text-white py-2 px-4 rounded-full border border-gray-700 hover:bg-gray-700"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-red-500 text-white py-2 px-4 rounded-full border border-red-700 hover:bg-red-700"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonDetail;
