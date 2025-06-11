import React, { useEffect, useState, useCallback, useRef } from "react";
import TileItem from "./TileItem";
import Overlay from "./Overlay";
import useUserData from "../hooks/useUserData";
import { useNavigate } from "react-router-dom";
import module1 from "../assets/modules/module1.png";
import module2 from "../assets/modules/module2.png";
import module3 from "../assets/modules/module3.png";
import module4 from "../assets/modules/module4.png";
import module5 from "../assets/modules/module5.png";

const imageMap = {
  module1,
  module2,
  module3,
  module4,
  module5,
};

const categories = [
  "Python", // New Category
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Earth Science",
];

const types = ["Lectures", "Assignments", "Quiz", "Projects", "Case studies", "Data sets"];
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
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [deleteError, setDeleteError] = useState("");
  const { user, userData } = useUserData();
  const [modules, setModules] = useState([]);
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);


  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/modules`);
        const data = await response.json();
        setModules(data);
      } catch (error) {
        console.error("Error fetching modules:", error);
      }
    };

    fetchModules();
  }, []);

  const filterContent = useCallback(() => {
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
  }, [content, selectedCategory, selectedType, selectedLevel, searchTerm]);

  useEffect(() => {
    setFilteredContent(content);
  }, [content]);

  useEffect(() => {
    filterContent();
  }, [filterContent]);

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
    return date.toLocaleDateString();
  };

  const handleDeleteUnit = async (id) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const token = await user.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/unit/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      setFilteredContent(filteredContent.filter((item) => item.id !== id));
      setDeleteError("");
    } catch (error) {
      setDeleteError(error.message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      if (
        !window.confirm(`Are you sure you want to delete ${selectedItems.size} selected items?`)
      ) {
        return;
      }

      if (!user) {
        throw new Error("User not authenticated");
      }

      const token = await user.getIdToken();
      const deletePromises = Array.from(selectedItems).map((id) =>
        fetch(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/unit/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      const results = await Promise.all(deletePromises);
      const failedDeletions = results.filter((r) => !r.ok);

      if (failedDeletions.length > 0) {
        throw new Error(`Failed to delete ${failedDeletions.length} items`);
      }

      setFilteredContent(filteredContent.filter((item) => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      setDeleteError("");
    } catch (error) {
      setDeleteError(error.message);
    }
  };

  const scroll = (direction) => {
    const { current } = scrollRef;
    if (!current) return;
  
    const scrollAmount = current.offsetWidth; // scroll by one full container
    const newScrollLeft = direction === "left"
      ? current.scrollLeft - scrollAmount
      : current.scrollLeft + scrollAmount;
  
    current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
  
    setTimeout(() => updateArrowVisibility(), 300); // delay to let scroll happen
  };
  
  const updateArrowVisibility = () => {
    const { current } = scrollRef;
    if (!current) return;
    
    const tolerance = 10;
    setShowLeftArrow(current.scrollLeft > tolerance);
    setShowRightArrow(current.scrollLeft + current.offsetWidth < current.scrollWidth - tolerance);
  };
  
  useEffect(() => {
    updateArrowVisibility();
  }, [modules]);
  
  useEffect(() => {
    const { current } = scrollRef;
    if (!current) return;
  
    current.addEventListener("scroll", updateArrowVisibility);
    return () => current.removeEventListener("scroll", updateArrowVisibility);
  }, []);  

  return (
    <div className="text-center mt-10">
      {modules.length > 0 && (
        <div className="relative w-full overflow-hidden px-4 max-w-[1280px] mx-auto mt-10">
          <h2 className="text-2xl font-bold text-center mb-6">Modules</h2>
          {/* Arrow buttons */}
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 bg-white rounded-full shadow w-10 h-10 flex items-center justify-center"
            >
              ◀
            </button>
          )}

          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white rounded-full shadow w-10 h-10 flex items-center justify-center"
            >
              ▶
            </button>
          )}


          <div ref={scrollRef} className="flex space-x-4 scroll-smooth no-scrollbar snap-x snap-mandatory" style={{overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {modules.map((module, index) => (
              <div
                key={index}
                onClick={() => navigate(`/module/${module.id}`)}
                className="w-[250px] flex-shrink-0 snap-start p-4 bg-white shadow-md rounded cursor-pointer hover:shadow-lg transition duration-200"
              >
                <div className="h-40 bg-gray-200 rounded mb-4 flex items-center justify-center">
                  {module.image ? (
                    <img
                      src={imageMap[module.image]}
                      alt={module.image}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <span className="text-gray-500 text-sm">Image Placeholder</span>
                  )}
                </div>
      
                <h3 className="text-xl font-bold mb-2 text-center">{module.title}</h3>
                <div className="flex flex-wrap gap-1 justify-center">
                  {module.tags &&
                    module.tags.map((tag, i) => {
                      const tagColors = [
                        "bg-pink-200",
                        "bg-yellow-200",
                        "bg-green-200",
                        "bg-blue-200",
                        "bg-purple-200",
                      ];
                      const color = tagColors[i % tagColors.length];
                      return (
                        <span key={i} className={`px-2 py-1 text-sm rounded ${color}`}>
                          {tag}
                        </span>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mt-10">Let's browse some teaching resources!</h2>
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
      <div className="flex justify-center items-center mt-4 space-x-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for ..."
          className="p-2 border rounded w-1/2"
        />
        {selectedItems.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200 flex items-center space-x-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Delete Selected ({selectedItems.size})</span>
          </button>
        )}
      </div>
      {deleteError && <div className="text-red-500 mb-4">{deleteError}</div>}
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
              onDelete={handleDeleteUnit}
              isSelected={selectedItems.has(item.id)}
              onSelect={(id) => {
                const newSelected = new Set(selectedItems);
                if (newSelected.has(id)) {
                  newSelected.delete(id);
                } else {
                  newSelected.add(id);
                }
                setSelectedItems(newSelected);
              }}
              userRole={userData?.role}
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
            disabled={currentPage === Math.ceil(filteredContent.length / itemsPerPage)}
            className="p-2 bg-gray-300 rounded"
          >
            Next
          </button>
        </div>
      </div>
      {selectedContent && (
        <Overlay content={selectedContent} onClose={() => setSelectedContent(null)} />
      )}
    </div>
  );
};

export default ListView;
