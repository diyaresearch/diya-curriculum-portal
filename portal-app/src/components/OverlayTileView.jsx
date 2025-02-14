import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useUserData from "../hooks/useUserData";
import TileItem from "./TileItem";

const categories = [
  "Python",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Earth Science",
];

const types = [
  "Lectures",
  "Assignments",
  "Quiz",
  "Projects",
  "Case studies",
  "Data sets",
];

const levels = ["Basic", "Intermediate", "Advanced"];

const OverlayTileView = ({ content, onClose, onSelectMaterial, initialSelectedTiles = {}}) => {
  const { userData } = useUserData(); // ✅ Get user data
  const userRole = userData?.role;    // ✅ Extract role
  const navigate = useNavigate();

  const [filteredContent, setFilteredContent] = useState(content);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedTiles, setSelectedTiles] = useState(initialSelectedTiles || []);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  

  // Define upload page URL with fallback
  const uploadPageUrl = process.env.REACT_APP_UPLOAD_CONTENT_PAGE || "/upload-content";

  useEffect(() => {
    setFilteredContent(content);
  }, [content]);

  useEffect(() => {
    filterContent();
  }, [selectedCategory, selectedType, selectedLevel, searchTerm]);

  const filterContent = useCallback(() => {
    let filtered = [...content];

    if (selectedCategory) {
      filtered = filtered.filter((item) => item.Category === selectedCategory);
    }
    if (selectedType) {
      filtered = filtered.filter((item) => item.Type === selectedType);
    }
    if (selectedLevel) {
      filtered = filtered.filter((item) => item.Level === selectedLevel);
    }
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.Title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredContent(filtered);
  }, [selectedCategory, selectedType, selectedLevel, searchTerm, content]);

  const handlePageChange = (direction) => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    } else if (direction === "next" && currentPage < Math.ceil(filteredContent.length / itemsPerPage)) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleCreateNugget = () => {
    console.log("Create Nugget clicked. Current user role:", userRole);
  
    if (!userRole) {
      console.error("User role is undefined.");
      return;
    }
  
    if (userRole === "teacherDefault") {
      console.log("Showing upgrade popup for teacherDefault");
      setShowUpgradePopup(true);
    } else if (userRole === "teacherPlus" || userRole === "admin") {
      console.log("Navigating to:", uploadPageUrl);
      navigate(uploadPageUrl);
    } else {
      console.warn("Unrecognized user role:", userRole);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-3 rounded-lg relative overflow-hidden overflow-y-auto" style={{ width: "43%", height: "94%" }}>
        <div className="scale-container" style={{ transform: "scale(0.9)", transformOrigin: "top center" }}>
          <button onClick={onClose} className="absolute top-2 right-6 text-xl font-bold" style={{ right: "10px", position: "absolute" }} aria-label="Close Modal">
            &times;
          </button>

          {/* Header with title and "Create a new Nugget" button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Select a Nugget</h2>
            <button
              onClick={handleCreateNugget}
              className="bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600 transition duration-200"
            >
              Create a new Nugget
            </button>
          </div>

          {/* Filters */}
          <div className="flex justify-center mt-4 space-x-4">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="p-2 border rounded">
              <option value="">Select a category</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>{category}</option>
              ))}
            </select>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="p-2 border rounded">
              <option value="">Select a type</option>
              {types.map((type, index) => (
                <option key={index} value={type}>{type}</option>
              ))}
            </select>
            <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className="p-2 border rounded">
              <option value="">Select a level</option>
              {levels.map((level, index) => (
                <option key={index} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search for ..." className="mt-4 p-2 border rounded w-full" />

          {/* Tile List */}
          <div className="container mx-auto mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredContent.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, index) => (
                <div key={index} className="relative">
                  <TileItem id={item.id} title={item.Title} category={item.Category} type={item.Type} level={item.Level} duration={item.Duration} date={formatDate(item.LastModified)} onClick={() => {}} />
                  <button
                    onClick={() => {
                      setSelectedTiles((prevState) =>
                        prevState.includes(item.id) ? prevState.filter((id) => id !== item.id) : [...prevState, item.id]
                      );
                      onSelectMaterial(item);
                    }}
                    className={`absolute bottom-3 right-2 py-1 px-3 rounded ${
                      selectedTiles.includes(item.id) ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                    }`}
                  >
                    {selectedTiles.includes(item.id) ? "Unselect" : "Select"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination & Save */}
          <div className="flex justify-between items-center mt-4">
            <button onClick={() => handlePageChange("prev")} disabled={currentPage === 1} className="p-2 bg-gray-300 rounded">Prev</button>
            <span className="p-2">Page {currentPage}</span>
            <button onClick={() => handlePageChange("next")} disabled={currentPage === Math.ceil(filteredContent.length / itemsPerPage)} className="p-2 bg-gray-300 rounded">Next</button>
            <button onClick={onClose} className="text-lg bg-blue-500 text-white py-1 px-4 rounded-md hover:bg-blue-700 transition duration-200">Save</button>
          </div>
        </div>
      </div>

      {/* Popup for Teacher Default Users */}
      {showUpgradePopup && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md shadow-lg">
            <p className="text-lg font-bold text-red-500">To access this feature, please upgrade to TeacherPlus by emailing <a href="mailto:contact@diyaresearch.org" className="text-blue-600">contact@diyaresearch.org</a>.</p>
            <button onClick={() => setShowUpgradePopup(false)} className="mt-4 bg-gray-400 py-1 px-3 rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlayTileView;