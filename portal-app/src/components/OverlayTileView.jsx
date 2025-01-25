import React, { useState, useEffect } from "react";
import TileItem from "./TileItem";

const categories = [
  "Mathematics",
  "Science",
  "Social Studies",
  "Computer Science",
  "Languages",
  "Arts",
  "Physical",
  "Education",
  "Health",
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

const OverlayTileView = ({ content, onClose, onSelectMaterial }) => {
  const [filteredContent, setFilteredContent] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedTiles, setSelectedTiles] = useState({});

  useEffect(() => {
    setFilteredContent(content);
  }, [content]);

  useEffect(() => {
    filterContent();
  }, [selectedCategory, selectedType, selectedLevel, searchTerm, content]);

  const filterContent = () => {
    let filtered = content;
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
  };

  const handlePageChange = (direction) => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (
      direction === "next" &&
      currentPage < Math.ceil(filteredContent.length / itemsPerPage)
    ) {
      setCurrentPage(currentPage + 1);
    }
  };

  const paginatedContent = filteredContent.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center ">
      <div
        className="bg-white p-3 rounded-lg relative overflow-hidden  overflow-y-auto"
        style={{ width: "43%", height: "94%" }}
      >
        <div
          className="scale-container"
          style={{ transform: "scale(0.9)", transformOrigin: "top center" }}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-xl font-bold"
          >
            &times;
          </button>
          <h2 className="text-xl font-bold text-center mb-4">
            Select Materials
          </h2>
          <div className="flex justify-center mt-4 space-x-4">
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
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for ..."
            className="mt-4 p-2 border rounded w-full"
          />

          <div className="container mx-auto mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paginatedContent.map((item, index) => {
                return (
                  <div key={index} className="relative">
                    <TileItem
                      id={item.id}
                      title={item.Title}
                      category={item.Category}
                      type={item.Type}
                      level={item.Level}
                      duration={item.Duration}
                      date={formatDate(item.LastModified)}
                      onClick={() => {}} //do not need this function in this page
                      onSelect={(id) => {
                        setSelectedTiles((prevState) => ({
                          ...prevState,
                          [id]: !prevState[id],
                        }));
                      }}
                      isSelected={selectedTiles[item.id] || false}
                      isLessonGenerator={true}
                    />
                    <button
                      onClick={() => {
                        setSelectedTiles((prevState) => ({
                          ...prevState,
                          [item.id]: !selectedTiles[item.id],
                        }));
                        onSelectMaterial(item);
                      }}
                      className={`absolute bottom-3 right-2 py-1 px-3 rounded ${
                        selectedTiles[item.id]
                          ? "bg-red-500 text-white"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {selectedTiles[item.id] ? "Unselect" : "Select"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="w-1/2 flex justify-between items-center">
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
                disabled={
                  currentPage === Math.ceil(filteredContent.length / itemsPerPage)
                }
                className="p-2 bg-gray-300 rounded"
              >
                Next
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="text-lg bg-blue-500 text-white py-1 px-4 rounded-md hover:bg-blue-700 transition duration-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlayTileView;
