import React, { useEffect, useState } from "react";
import TileItem from "./TileItem";
import Overlay from "./Overlay";

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

const ListView = ({ content }) => {
  const [filteredContent, setFilteredContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

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

  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedType("");
    setSelectedLevel("");
    setSearchTerm("");
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

  const handleTileClick = (id) => {
    const contentItem = content.find((item) => item.id === id);
    setSelectedContent(contentItem);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="text-center mt-10">
      <h2 className="text-2xl font-bold">
        Let's browse some teaching resources!
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
        <button onClick={resetFilters} className="p-2 bg-gray-300 rounded">
          Reset
        </button>
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search for ..."
        className="mt-4 p-2 border rounded w-1/2"
      />
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedContent.map((item, index) => (
            <TileItem
              key={index}
              id={item.id}
              title={item.Title}
              category={item.Category}
              type={item.Type}
              level={item.Level}
              duration={item.Duration}
              date={formatDate(item.LastModified)}
              onClick={handleTileClick}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
          className="p-2 border rounded"
        >
          <option value={12}>12 / page</option>
          <option value={24}>24 / page</option>
        </select>
        <div>
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
      </div>
      {selectedContent && (
        <Overlay
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
};

export default ListView;
