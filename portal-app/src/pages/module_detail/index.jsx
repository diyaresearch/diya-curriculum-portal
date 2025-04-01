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
import OverlayTileView from "../../components/OverlayTileView";

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
  const [portalContent, setPortalContent] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (moduleId === "create") {
      setMode("create");
      fetchLessonPlans();
    } else if (moduleId) {
      setMode("view");
      fetchModuleDetails();
    }
  }, [moduleId]);

  useEffect(() => {
    const fetchAllLessonPlans = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lessons`);

        setPortalContent(response.data);
      } catch (error) {
        console.error("Error fetching user lesson plans:", error);
      }
    };
    fetchAllLessonPlans();
  }, []);

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

  // On selecting a lesson plan from the popup
  const onSelectLessonPlan = (lessonPlan) => {
    // Check if the lesson plan is already in the list of selected lesson plans
    const alreadySelected = lessonPlans.some((plan) => plan.id === lessonPlan.id);

    let updatedLessonPlans = [...lessonPlans];
    let updatedMap = { ...lessonPlanMap };

    if (alreadySelected) {
      // Triger the check and delete, let admin to delete outside of the popup
      setSelectedLessonIds((prevSelectedLessonIds) => {
        const updatedSelectedLessonIds = new Set(prevSelectedLessonIds);
        updatedSelectedLessonIds.add(lessonPlan.id);
        return updatedSelectedLessonIds;
      });
    } else {
      updatedLessonPlans.push(lessonPlan);
      updatedMap[updatedLessonPlans.length - 1] = lessonPlan.id;
    }

    setLessonPlans(updatedLessonPlans);
    setLessonPlanMap(updatedMap);
    setShowOverlay(false);
  };

  // This is to handle the Add More Lesson Plans button click event
  const handleAddMoreLessonPlans = () => {
    setShowOverlay(true);
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
      await axios.delete(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module/${moduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    <div className="flex justify-center items-start min-h-screen bg-blue-100">
      <div className="bg-white shadow-md rounded-lg px-8 py-6 w-full max-w-6xl">
        {/* Header: Title + Exit */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {mode === "create" ? "Create Module" : mode === "edit" ? "Edit Module" : title}
          </h1>
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            onClick={handleExit}
          >
            Exit
          </button>
        </div>
  
        {mode === "view" ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side: Text Content */}
            <div className="flex-1 space-y-6">
              {/* Description */}
              <div>
                <label className="block text-gray-700 text-lg font-semibold mb-2">Description:</label>
                <div
                  className="border p-4 rounded bg-gray-50"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </div>
  
              {/* Tags */}
              <div>
                <label className="block text-gray-700 text-lg font-semibold mb-2">Module Tags:</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => {
                    const colors = [
                      "bg-pink-200",
                      "bg-yellow-200",
                      "bg-green-200",
                      "bg-blue-200",
                      "bg-purple-200",
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <span key={index} className={`px-3 py-1 ${color} rounded text-sm`}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
  
              {/* Lesson Plans */}
              <div>
                <label className="block text-gray-700 text-lg font-semibold mb-2">Lesson Plans:</label>
                <div className="border rounded p-2 bg-gray-50">
                  {lessonPlans.length > 0 ? (
                    lessonPlans.map((lesson, index) => (
                      <div key={index} className="p-3 mb-2 border bg-white shadow-md rounded-md">
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
  
              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setMode("edit")}
                  className="bg-blue-500 text-white py-2 px-4 rounded"
                >
                  Edit Module
                </button>
                {userData?.role === "admin" && (
                  <button
                    onClick={handleDeleteModule}
                    className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
                  >
                    Delete Module
                  </button>
                )}
              </div>
            </div>
  
            {/* Right Side: Image */}
            <div className="flex-shrink-0 w-full lg:w-1/3">
              {selectedImage && (
                <img
                  src={imageMap[selectedImage] || module1}
                  alt="Cover"
                  className="rounded shadow-md w-full"
                />
              )}
            </div>
          </div>
        ) : (
          // existing create/edit mode content goes here...
          <p className="text-gray-500">Edit/Create mode layout unchanged.</p>
        )}
      </div>
    </div>
  );  
};
export default ModuleDetail;
