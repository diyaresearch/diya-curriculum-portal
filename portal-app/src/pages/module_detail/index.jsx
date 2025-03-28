import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import useUserData from "../../hooks/useUserData";
import module1 from "../../assets/modules/module1.png";
import module2 from "../../assets/modules/module2.png";
import module3 from "../../assets/modules/module3.png";
import module4 from "../../assets/modules/module4.png";
import module5 from "../../assets/modules/module5.png";

const imageMap = {
  module1,
  module2,
  module3,
  module4,
  module5,
};

const ModuleDetail = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useUserData();
  const [mode, setMode] = useState("view");

  // Extract selected lesson plan IDs from navigation state (for create mode)
  const selectedPlanIds = location.state?.selectedPlans || [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [lessonPlanMap, setLessonPlanMap] = useState({}); // { 0: "lessonId", 1: "lessonId" }
  const [lessonPlans, setLessonPlans] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [selectedLessonIds, setSelectedLessonIds] = useState(new Set());
  const [selectedImage, setSelectedImage] = useState("module1");

  useEffect(() => {
    if (moduleId === "create") {
      setMode("create");
      fetchLessonPlans();
    } else if (moduleId) {
      setMode("view");
      fetchModuleDetails();
    }
  }, [moduleId]);

  // Fetch lesson plans for create mode (from selectedPlanIds)
  const fetchLessonPlans = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const lessonPlanRequests = selectedPlanIds.map((id) =>
        axios.get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const responses = await Promise.all(lessonPlanRequests);
      const fetchedPlans = responses.map((r) => r.data);

      // Convert lesson plans to { 0: "lessonId", 1: "lessonId" }
      const plansMap = fetchedPlans.reduce((acc, plan, index) => {
        acc[index] = plan.id;
        return acc;
      }, {});

      setLessonPlans(fetchedPlans);
      setLessonPlanMap(plansMap);
    } catch (error) {
      console.error("Error fetching lesson plans:", error);
    }
  };

  // Fetch module details for view/edit mode
  const fetchModuleDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module/${moduleId}`
      );
      const data = response.data;

      setTitle(data.title);
      setDescription(data.description);
      setTags(data.tags || []);
      setLessonPlanMap(data.lessonPlans || {});
      setSelectedImage(data.image || "module1");
      console.log(data.image);

      // Fetch full lesson plan details based on stored lessonPlanMap
      const lessonPlanIds = Object.values(data.lessonPlans || {});
      fetchLessonDetails(lessonPlanIds);
    } catch (error) {
      console.error("Error fetching module:", error);
    }
  };

  // Fetch detailed lesson plan data using stored lesson plan IDs
  const fetchLessonDetails = async (ids) => {
    try {
      const token = localStorage.getItem("authToken");
      const lessonPlanRequests = ids.map((id) =>
        axios.get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const responses = await Promise.all(lessonPlanRequests);
      const fetchedPlans = responses.map((r) => r.data);
      setLessonPlans(fetchedPlans);
    } catch (error) {
      console.error("Error fetching lesson details:", error);
    }
  };

  const addTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // Drag Start - Set Dragged Item
  const handleDragStart = (index) => setDraggedIndex(index);

  // Allow Drag Over - Necessary for Drop
  const handleDragOver = (e) => e.preventDefault();

  // Handle Drop - Reorder List
  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...lessonPlans];
    const item = updated.splice(draggedIndex, 1)[0];
    updated.splice(index, 0, item);

    const newMap = {};
    updated.forEach((plan, idx) => {
      newMap[idx] = plan.id;
    });

    setLessonPlans(updated);
    setLessonPlanMap(newMap);
    setDraggedIndex(null);
  };

  const toggleSelectLesson = (id) => {
    const updated = new Set(selectedLessonIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedLessonIds(updated);
  };

  const handleDeleteSelected = () => {
    if (
      window.confirm(`Are you sure you want to delete ${selectedLessonIds.size} selected lessons?`)
    ) {
      const updatedPlans = lessonPlans.filter((lesson) => !selectedLessonIds.has(lesson.id));
      const updatedMap = {};
      updatedPlans.forEach((plan, idx) => {
        updatedMap[idx] = plan.id;
      });

      setLessonPlans(updatedPlans);
      setLessonPlanMap(updatedMap);
      setSelectedLessonIds(new Set());
    }
  };

  // Handle module creation
  const handleSubmit = async () => {
    try {
      const newModule = {
        title,
        description,
        tags,
        lessonPlans: lessonPlanMap,
        image: selectedImage,
      };
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module`,
        newModule
      );
      navigate(`/module/${response.data.id}`);
    } catch (error) {
      console.error("Error creating module:", error);
    }
  };

  // Handle module update
  const handleUpdate = async () => {
    try {
      const updated = {
        title,
        description,
        tags,
        lessonPlans: lessonPlanMap,
        image: selectedImage,
      };
      await axios.post(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module/${moduleId}`,
        updated
      );
      setMode("view");
    } catch (error) {
      console.error("Error updating module:", error);
    }
  };

  // Handle module deletion (admin only)
  const handleDeleteModule = async () => {
    if (!window.confirm("Are you sure you want to delete this module?")) return;
  
    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module/${moduleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigate("/"); // Redirect to homepage
    } catch (error) {
      console.error("Error deleting module:", error);
    }
  };  

  // Navigate to homepage
  const handleExit = () => {
    navigate("/");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-100">
      <div className="bg-white shadow-md rounded-lg px-8 py-6 w-full max-w-5xl">
        {/* Title based on mode */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl text-center mb-6">
            {mode === "create" ? "Create Module" : mode === "edit" ? "Edit Module" : ""}
          </h1>
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100 ml-4"
            onClick={handleExit}
          >
             Exit
          </button>
        </div>
        {/* Module Title */}
        <div className="mb-6">
          {mode === "view" ? (
            <h2 className="text-4xl font-bold mb-2">{title}</h2>
          ) : (
            <>
              <label className="block text-gray-700 text-lg font-semibold mb-2">
                Module Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border rounded bg-white text-xl"
              />
            </>
          )}
        </div>

        {/* Select Image */}
        {selectedImage && (
          <div className="mb-6">
            <img
              src={imageMap[selectedImage] || module1}
              alt="Cover"
              className="w-full max-w-md rounded shadow-md mx-auto"
            />
          </div>
        )}

        {mode !== "view" && (
          <div className="mb-6">
            <label className="block text-gray-700 text-lg font-semibold mb-2">
              Select Cover Image:
            </label>
            <div className="flex gap-4 flex-wrap">
              {["module1", "module2", "module3", "module4", "module5"].map((key) => (
                <div
                  key={key}
                  onClick={() => setSelectedImage(key)}
                  className={`border-4 rounded cursor-pointer ${
                    selectedImage === key ? "border-blue-500" : "border-transparent"
                  }`}
                >
                  <img src={imageMap[key]} alt={key} className="w-32 h-20 object-cover rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module Description */}
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold mb-2">Description:</label>
          {mode === "view" ? (
            <div
              className="border p-4 rounded bg-gray-50"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <ReactQuill value={description} onChange={setDescription} theme="snow" />
          )}
        </div>

        {/* Module Tags */}
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold mb-2">Module Tags:</label>
          {mode !== "view" && (
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 px-4 py-2 border rounded"
                placeholder="Enter a tag"
              />
              <button onClick={addTag} className="px-4 py-2 bg-blue-500 text-white rounded">
                Add
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => {
              const colorClasses = [
                "bg-pink-200",
                "bg-yellow-200",
                "bg-green-200",
                "bg-blue-200",
                "bg-purple-200",
              ];
              const bgColor = colorClasses[index % colorClasses.length];

              return (
                <span key={index} className={`px-3 py-1 ${bgColor} rounded m-1`}>
                  {tag}
                  {mode !== "view" && (
                    <button onClick={() => removeTag(index)} className="text-red-500 ml-1">
                      &times;
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Lesson Plans */}
        <div className="mb-6">
          <label className="block text-gray-700 text-lg font-semibold mb-2">Lesson Plans:</label>

          {userData?.role === "admin" && mode !== "view" && selectedLessonIds.size > 0 && (
            <div className="flex justify-end mb-2">
              <button
                onClick={handleDeleteSelected}
                className="mb-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete Selected ({selectedLessonIds.size})
              </button>
            </div>
          )}

          <div className="border rounded p-2 bg-gray-50">
            {lessonPlans.length > 0 ? (
              lessonPlans.map((lesson, index) => (
                <div
                  key={index}
                  draggable={mode !== "view"}
                  onDragStart={mode !== "view" ? () => handleDragStart(index) : undefined}
                  onDragOver={mode !== "view" ? handleDragOver : undefined}
                  onDrop={mode !== "view" ? () => handleDrop(index) : undefined}
                  className={`p-3 mb-2 border bg-white shadow-md rounded-md flex items-center gap-4 ${
                    mode !== "view" ? "cursor-move" : "cursor-default"
                  }`}
                >
                  {userData?.role === "admin" && mode !== "view" && (
                    <input
                      type="checkbox"
                      checked={selectedLessonIds.has(lesson.id)}
                      onChange={() => toggleSelectLesson(lesson.id)}
                      className="mr-4"
                    />
                  )}
                  <a
                    href={`/lesson/${lesson.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-black font-semibold hover:text-blue-600 hover:underline"
                  >
                    {lesson.title}
                  </a>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No lesson plans available.</p>
            )}
          </div>
        </div>

        {/* Edit and Submit Buttons */}
        {mode === "create" ? (
          <button onClick={handleSubmit} className="bg-green-500 text-white py-2 px-4 rounded">
            Submit Module
          </button>
        ) : mode === "edit" ? (
          <>
            <button onClick={handleUpdate} className="bg-yellow-500 text-white py-2 px-4 rounded">
              Update Module
            </button>
            <button
              onClick={() => setMode("view")}
              className="bg-gray-500 text-white py-2 px-4 rounded ml-4"
            >
              Exit Edit Mode
            </button>
          </>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={() => setMode("edit")}
              className="bg-blue-500 text-white py-2 px-4 rounded"
            >
              Edit Module
            </button>

            {/* Show Delete button only to Admin */}
            {userData?.role === "admin" && (
              <button
                onClick={handleDeleteModule}
                className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
              >
                Delete Module
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleDetail;