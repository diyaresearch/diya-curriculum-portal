import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ModuleComponent from "../../components/Module";

const sampleLessonPlans = [
  { title: "Introduction to Python", category: "Python", level: "Basic", duration: 60 },
  { title: "Advanced React", category: "Web Development", level: "Advanced", duration: 90 },
];

export const ModuleDetail = () => {
  const { moduleId } = useParams(); // Get module ID from URL
  const navigate = useNavigate();
  const [mode, setMode] = useState("view"); // Default mode is "view"
  const [moduleData, setModuleData] = useState({
    title: "",
    description: "",
    tags: [],
    lessonPlans: [],
  });

  useEffect(() => {
    if (moduleId === "create") {
      setMode("create");
    } else if (moduleId) {
      setMode("view");
      fetchModuleDetails();
    }
  }, [moduleId]);

  const fetchModuleDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module/${moduleId}`
      );
      setModuleData(response.data);
    } catch (error) {
      console.error("Error fetching module:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module`,
        moduleData
      );
      navigate(`/module/${response.data.id}`); // Redirect to the created module
    } catch (error) {
      console.error("Error creating module:", error);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/module/${moduleId}`,
        moduleData
      );
      navigate(`/module/${moduleId}`); // Redirect to the updated module
    } catch (error) {
      console.error("Error updating module:", error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-100">
      <div className="bg-white shadow-md rounded-lg px-8 py-6 w-full max-w-5xl">
         {/* Dynamic Title */}
         <h1 className="text-2xl text-center mb-4">
          {mode === "create" ? "Create Module" : mode === "edit" ? "Edit Module" : "View Module"}
        </h1>
        {mode === "view" && (
          <button
            onClick={() => setMode("edit")}
            className="mb-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Edit Module
          </button>
        )}
        <ModuleComponent
          mode={mode}
          lessonPlans={sampleLessonPlans}
          moduleData={moduleData}
          setModuleData={setModuleData}
        />

        {mode === "create" && (
          <button
            onClick={handleSubmit}
            className="mt-4 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Submit Module
          </button>
        )}

        {mode === "edit" && (
          <button
            onClick={handleUpdate}
            className="mt-4 bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-700"
          >
            Update Module
          </button>
        )}
      </div>
    </div>
  );
};

export default ModuleDetail;
