import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuth } from "firebase/auth";
import useUserData from "../../hooks/useUserData";

const categories = ["Python", "Physics", "Chemistry", "Biology", "Economics", "Earth Science"];
const types = ["Lectures", "Assignments", "Quiz", "Projects", "Case studies", "Data sets"];
const levels = ["Basic", "Intermediate", "Advanced"];

export const MyPlans = () => {
  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const navigate = useNavigate();
  const [planType, setPlanType] = useState("myPlans"); // "public" or "myPlans"
  const { userData } = useUserData();
  const userRole = userData?.role; // Extract user role

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedPlans, setSelectedPlans] = useState(new Set()); // Store selected lesson plans

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          navigate("/lesson-generator");
          return;
        }

        const token = await user.getIdToken();
        let apiUrl =
          planType === "public"
            ? `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lessons`
            : `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/myLessons`;

        const response = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPlans(response.data);
        setFilteredPlans(response.data);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };

    fetchPlans();
  }, [navigate, planType]);

  // Filter plans based on search and selected filters
  useEffect(() => {
    let filtered = plans;

    if (searchTerm) {
      filtered = filtered.filter((plan) =>
        plan.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((plan) => plan.category === selectedCategory);
    }

    if (selectedType) {
      filtered = filtered.filter((plan) => plan.type === selectedType);
    }

    if (selectedLevel) {
      filtered = filtered.filter((plan) => plan.level === selectedLevel);
    }

    setFilteredPlans(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, selectedCategory, selectedType, selectedLevel, plans]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handlePageChange = (direction) => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && currentPage < Math.ceil(filteredPlans.length / itemsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const paginatedPlans = filteredPlans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExit = () => {
    navigate("/");
  };

  // ✅ Handle plan selection (checkbox for admins)
  const handleSelectPlan = (planId) => {
    const updatedSelection = new Set(selectedPlans);
    if (updatedSelection.has(planId)) {
      updatedSelection.delete(planId);
    } else {
      updatedSelection.add(planId);
    }
    setSelectedPlans(updatedSelection);
  };

  // ✅ Handle "Create Module" button click
  const handleCreateModule = () => {
    if (selectedPlans.size > 0) {
      navigate("/module/create", { state: { selectedPlans: Array.from(selectedPlans) } });
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col items-center justify-center">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-4xl relative flex-grow">
        {/* Dropdown & Exit Button */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <select
            className="border px-3 py-1 rounded bg-white"
            value={planType}
            onChange={(e) => {
              setPlanType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="public">Public Plans</option>
            <option value="myPlans">My Plans</option>
          </select>
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            onClick={handleExit}
          >
            Exit
          </button>
        </div>

        <h2 className="text-2xl mb-4 text-center">
          {planType === "public" ? "Public Plans" : "My Plans"}
        </h2>

        {/* Search Bar & Filters */}
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          <input
            type="text"
            placeholder="Search lesson plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border rounded w-64"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Select a category</option>
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Select a type</option>
            {types.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">Select a level</option>
            {levels.map((level, index) => (
              <option key={index} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Plans Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedPlans.map((plan, index) => (
            <div key={index} className="border p-4 rounded-md shadow-sm flex items-center space-x-2">
              {/* ✅ Checkbox for admins */}
              {userRole === "admin" && (
                <input
                  type="checkbox"
                  checked={selectedPlans.has(plan.id)}
                  onChange={() => handleSelectPlan(plan.id)}
                />
              )}
              <div onClick={() => navigate(`/lesson/${plan.id}`)}>
                <h3 className="text-lg font-semibold">{plan.title}</h3>
                <p className="text-sm text-gray-600">Type: {plan.type}</p>
                <p className="text-sm text-gray-600">Category: {plan.category}</p>
                <p className="text-sm text-gray-600">Level: {plan.level}</p>
                <p className="text-sm text-gray-600">Duration: {plan.duration} minutes</p>
                <p className="text-sm text-gray-600">Is Public: {plan.isPublic ? "Yes" : "No"}</p>
                <p className="text-sm text-gray-600">Date: {formatDate(plan.createdAt) || "N/A"}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ✅ Create Module Button (if any plans are selected) */}
        {selectedPlans.size > 0 && (
          <button onClick={handleCreateModule} className="bg-green-500 text-white px-4 py-2 rounded mt-4">
            Create Module
          </button>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => handlePageChange("prev")}
            disabled={currentPage === 1}
            className="p-2 bg-gray-300 rounded"
          >
            Prev
          </button>
          <span className="p-2">Page {currentPage}</span>
          <button
            onClick={() => handlePageChange("next")}
            disabled={currentPage === Math.ceil(filteredPlans.length / itemsPerPage)}
            className="p-2 bg-gray-300 rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPlans;
