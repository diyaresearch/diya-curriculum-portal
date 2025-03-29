import React, { useState, useEffect, useCallback } from "react";
import TileItem from "./TileItem";

const categories = ["Python", "Physics", "Chemistry", "Biology", "Economics", "Earth Science"];

const types = ["Lectures", "Assignments", "Quiz", "Projects", "Case studies", "Data sets"];

const levels = ["Basic", "Intermediate", "Advanced"];

const OverlayTileView = ({
  content,
  onClose,
  onSelectMaterial,
  initialSelectedTiles,
  type,
  category,
  level = {},
  contentType,
}) => {
  const [filteredContent, setFilteredContent] = useState(content);
  const [selectedCategory, setSelectedCategory] = useState(category || "");
  const [selectedType, setSelectedType] = useState(type || "");
  const [selectedLevel, setSelectedLevel] = useState(level || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedTiles, setSelectedTiles] = useState(initialSelectedTiles || []);

  useEffect(() => {
    if (content !== filteredContent) {
      setFilteredContent(content);
    }
  }, [content]);

  useEffect(() => {
    setSelectedCategory(category || "");
    setSelectedType(type || "");
    setSelectedLevel(level || "");
  }, [category, type, level]);

  useEffect(() => {
    filterContent();
  }, [selectedCategory, selectedType, selectedLevel, searchTerm]);

  const filterContent = useCallback(() => {
    let filtered = [...content];

    if (selectedCategory) {
      // Handle filtering for both content types
      if (contentType === "nugget") {
        filtered = filtered.filter((item) => item.Category === selectedCategory);
      } else if (contentType === "lessonPlan") {
        filtered = filtered.filter((item) => item.category === selectedCategory);
      }
    }

    if (selectedType) {
      // Handle filtering for both content types
      if (contentType === "nugget") {
        filtered = filtered.filter((item) => item.Type === selectedType);
      } else if (contentType === "lessonPlan") {
        filtered = filtered.filter((item) => item.type === selectedType);
      }
    }

    if (selectedLevel) {
      // Handle filtering for both content types
      if (contentType === "nugget") {
        filtered = filtered.filter((item) => item.Level === selectedLevel);
      } else if (contentType === "lessonPlan") {
        filtered = filtered.filter((item) => item.level === selectedLevel);
      }
    }

    if (searchTerm) {
      // Handle search for both content types
      if (contentType === "nugget") {
        filtered = filtered.filter((item) =>
          item.Title.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else if (contentType === "lessonPlan") {
        filtered = filtered.filter((item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    }

    setFilteredContent(filtered);
  }, [selectedCategory, selectedType, selectedLevel, searchTerm, content, contentType]);

  const handlePageChange = (direction) => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    } else if (
      direction === "next" &&
      currentPage < Math.ceil(filteredContent.length / itemsPerPage)
    ) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div
        className="bg-white p-3 rounded-lg relative overflow-hidden overflow-y-auto"
        style={{ width: "43%", height: "94%" }}
      >
        <div
          className="scale-container"
          style={{ transform: "scale(0.9)", transformOrigin: "top center" }}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-6 text-xl font-bold"
            style={{ right: "10px", position: "absolute" }}
            aria-label="Close Modal"
          >
            &times;
          </button>

          {/* Filters */}
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

          {/* Search Bar */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for ..."
            className="mt-4 p-2 border rounded w-full"
          />

          {/* Tile List */}
          <div className="container mx-auto mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredContent
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((item, index) => {
                  // Conditionally render based on content type (nuggets or lesson plans)
                  if (contentType === "nugget") {
                    // Render Nugget TileView
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
                          onClick={() => {}}
                        />
                        <div className="absolute bottom-3 right-2 flex flex-col space-y-2">
                          <a
                            href={`/view-content/${item.UnitID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1 px-3 rounded bg-green-500 text-white hover:bg-green-700 transition duration-200 text-center"
                          >
                            View
                          </a>
                          <button
                            onClick={() => {
                              setSelectedTiles((prevState) =>
                                prevState.includes(item.id)
                                  ? prevState.filter((id) => id !== item.id)
                                  : [...prevState, item.id]
                              );
                              onSelectMaterial(item);
                            }}
                            className={`py-1 px-3 rounded text-center ${
                              selectedTiles.includes(item.id)
                                ? "bg-red-500 text-white"
                                : "bg-blue-500 text-white"
                            }`}
                          >
                            {selectedTiles.includes(item.id) ? "Unselect" : "Select"}
                          </button>
                        </div>
                      </div>
                    );
                  } else if (contentType === "lessonPlan") {
                    // Render Lesson Plan TileView
                    return (
                      <div key={index} className="relative">
                        <TileItem
                          id={item.id}
                          title={item.title}
                          category={item.category}
                          type={item.type}
                          level={item.level}
                          duration={item.duration}
                          date={formatDate(item.createdAt)}
                          onClick={() => {}}
                        />
                        <div className="absolute bottom-3 right-2 flex flex-col space-y-2">
                          <a
                            href={`/lesson/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1 px-3 rounded bg-green-500 text-white hover:bg-green-700 transition duration-200 text-center"
                          >
                            View
                          </a>
                          <button
                            onClick={() => {
                              setSelectedTiles((prevState) =>
                                prevState.includes(item.id)
                                  ? prevState.filter((id) => id !== item.id)
                                  : [...prevState, item.id]
                              );
                              onSelectMaterial(item);
                            }}
                            className={`py-1 px-3 rounded text-center ${
                              selectedTiles.includes(item.id)
                                ? "bg-red-500 text-white"
                                : "bg-blue-500 text-white"
                            }`}
                          >
                            {selectedTiles.includes(item.id) ? "Selected" : "Select"}
                          </button>
                        </div>
                      </div>
                    );
                  }
                })}
            </div>
          </div>

          {/* Pagination & Save */}
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
              disabled={currentPage === Math.ceil(filteredContent.length / itemsPerPage)}
              className="p-2 bg-gray-300 rounded"
            >
              Next
            </button>
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
  );
};

export default OverlayTileView;
