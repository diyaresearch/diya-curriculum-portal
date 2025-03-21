import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export const ModuleDetail = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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
      const fetchedPlans = responses.map((response) => response.data);

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
      const moduleData = response.data;

      setTitle(moduleData.title);
      setDescription(moduleData.description);
      setTags(moduleData.tags || []);
      setLessonPlanMap(moduleData.lessonPlans || {});

      // Fetch full lesson plan details based on stored lessonPlanMap
      const lessonPlanIds = Object.values(moduleData.lessonPlans || {});
      fetchLessonDetails(lessonPlanIds);
    } catch (error) {
      console.error("Error fetching module:", error);
    }
  };

  // Fetch detailed lesson plan data using stored lesson plan IDs
  const fetchLessonDetails = async (lessonPlanIds) => {
    try {
      const token = localStorage.getItem("authToken");
      const lessonPlanRequests = lessonPlanIds.map((id) =>
        axios.get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const responses = await Promise.all(lessonPlanRequests);
      const fetchedPlans = responses.map((response) => response.data);
      setLessonPlans(fetchedPlans);
    } catch (error) {
      console.error("Error fetching lesson plan details:", error);
    }
  };

  const addTag = () => {
    if (newTag.trim() !== "") {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // Drag Start - Set Dragged Item
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  // Allow Drag Over - Necessary for Drop
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Handle Drop - Reorder List
  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder lessonPlans array
    const updatedPlans = [...lessonPlans];
    const draggedItem = updatedPlans.splice(draggedIndex, 1)[0];
    updatedPlans.splice(index, 0, draggedItem);

    // Reorder lessonPlanMap
    const updatedPlanMap = {};
    updatedPlans.forEach((plan, idx) => {
      updatedPlanMap[idx] = plan.id;
    });

    setLessonPlans(updatedPlans);
    setLessonPlanMap(updatedPlanMap); // Ensure lessonPlanMap updates as well
    setDraggedIndex(null);
  };

  // Handle module creation
  const handleSubmit = async () => {
    try {
      const newModule = { title, description, tags, lessonPlans: lessonPlanMap };
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
      const updatedModule = { title, description, tags, lessonPlans: lessonPlanMap };
      await axios.post(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module/${moduleId}`,
        updatedModule
      );
      setMode("view");
    } catch (error) {
      console.error("Error updating module:", error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-100">
      <div className="bg-white shadow-md rounded-lg px-8 py-6 w-full max-w-5xl">
        {/* Title based on mode */}
        <h1 className="text-2xl text-center mb-4">
          {mode === "create" ? "Create Module" : mode === "edit" ? "Edit Module" : "View Module"}
        </h1>

        {/* Module Title */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Module Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={mode === "view"}
            className={`w-full px-4 py-2 border rounded ${
              mode === "view" ? "bg-gray-100 cursor-not-allowed" : "bg-white"
            }`}
          />
        </div>

        {/* Module Description */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Module Description:</label>
          <ReactQuill
            value={description}
            onChange={setDescription}
            readOnly={mode === "view"}
            theme="snow"
            className={`bg-white border ${mode === "view" ? "pointer-events-none opacity-60" : ""}`}
          />
        </div>

        {/* Module Tags */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Module Tags:</label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="flex-1 px-4 py-2 border rounded"
              placeholder="Enter a tag"
              disabled={mode === "view"}
            />
            <button
              onClick={addTag}
              disabled={mode === "view"}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Add
            </button>
          </div>
          {tags.map((tag, index) => (
            <span key={index} className="px-3 py-1 bg-gray-200 rounded m-1">
              {tag}{" "}
              {mode !== "view" && (
                <button onClick={() => removeTag(index)} className="text-red-500">
                  &times;
                </button>
              )}
            </span>
          ))}
        </div>

        {/* Lesson Plans List - Drag-and-Drop */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Lesson Plans:</label>
          <div className="border rounded p-2 bg-gray-50">
            {lessonPlans.length > 0 ? (
              lessonPlans.map((lesson, index) => (
                <div
                  key={index}
                  draggable={mode !== "view"}
                  onDragStart={mode !== "view" ? () => handleDragStart(index) : undefined}
                  onDragOver={mode !== "view" ? handleDragOver : undefined}
                  onDrop={mode !== "view" ? () => handleDrop(index) : undefined}
                  // className="p-3 mb-2 border bg-white shadow-md rounded-md cursor-move"
                  className={`p-3 mb-2 border bg-white shadow-md rounded-md cursor-move ${
                    mode !== "view" ? "cursor-move" : "cursor-default"
                  }`}
                >
                  <h3 className="text-lg font-semibold">{lesson.title}</h3>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No lesson plans available.</p>
            )}
          </div>
        </div>

        {/* Create / Edit Buttons */}
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
              onClick={() => {
                window.location.reload();
              }}
              className="bg-gray-400 text-white py-2 px-4 rounded ml-4"
            >
              Exit Edit Mode
            </button>
          </>
        ) : (
          <button
            onClick={() => setMode("edit")}
            className="bg-blue-500 text-white py-2 px-4 rounded"
          >
            Edit Module
          </button>
        )}
      </div>
    </div>
  );
};

export default ModuleDetail;
