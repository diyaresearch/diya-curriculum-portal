import React, { useState, useEffect } from "react";

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
  const [filteredContent, setFilteredContent] = useState(content);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    filterContent();
  }, [selectedCategory, selectedType, selectedLevel, searchTerm, content]);

  const filterContent = () => {
    let filtered = content;
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }
    if (selectedType) {
      filtered = filtered.filter((item) => item.type === selectedType);
    }
    if (selectedLevel) {
      filtered = filtered.filter((item) => item.level === selectedLevel);
    }
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
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
      <table className="table-auto w-full mt-4">
        <thead>
          <tr>
            <th className="border-b-2 p-2">Title</th>
            <th className="border-b-2 p-2">Category</th>
            <th className="border-b-2 p-2">Type</th>
            <th className="border-b-2 p-2">Level</th>
            <th className="border-b-2 p-2">Duration</th>
            <th className="border-b-2 p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {paginatedContent.map((item, index) => (
            <tr key={index}>
              <td className="border-b p-2">{item.title}</td>
              <td className="border-b p-2">{item.category}</td>
              <td className="border-b p-2">{item.type}</td>
              <td className="border-b p-2">{item.level}</td>
              <td className="border-b p-2">{item.duration}</td>
              <td className="border-b p-2">{item.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between items-center mt-4">
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
          className="p-2 border rounded"
        >
          <option value={5}>5 / page</option>
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
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
    </div>
  );
};

export default ListView;
