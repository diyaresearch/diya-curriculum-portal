import React, { useState, useEffect, useCallback } from "react";
import TileItem from "./TileItem";

const categories = ["AI Principles", "Data Science", "Machine Learning", "Statistics", "Other"];
const types = ["Lecture", "Assignment","Dataset"];

const levels = ["Basic", "Intermediate", "Advanced"];

const OverlayTileView = ({
  content,
  onClose,
  onSelectMaterial,
  initialSelectedTiles,
  type,
  category,
  level,
  contentType,
  typeOptions = [],
  categoryOptions = [],
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

  return (
    <div
      className="fixed inset-0 flex justify-center items-center"
      style={{
        background: "rgba(246, 248, 250, 0.98)", // Match builder background
        zIndex: 1000,
        fontFamily: "Open Sans, sans-serif",
      }}
    >
      <div
        className="bg-white rounded-lg relative overflow-hidden overflow-y-auto"
        style={{
          width: "43%",
          height: "94%",
          border: "2px solid #e5e7eb",
          boxShadow: "0 4px 24px rgba(22,32,64,0.10)",
          color: "#111",
          fontFamily: "Open Sans, sans-serif",
        }}
      >
        <div
          className="scale-container"
          style={{
            transform: "scale(0.97)",
            transformOrigin: "top center",
            padding: "32px 24px 24px 24px",
            background: "#fff",
            borderRadius: "12px",
            color: "#111",
            fontFamily: "Open Sans, sans-serif",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-6 text-xl font-bold"
            style={{
              right: "18px",
              top: "18px",
              position: "absolute",
              background: "none",
              border: "none",
              color: "#111",
              fontSize: "2rem",
              cursor: "pointer",
              fontFamily: "Open Sans, sans-serif",
            }}
            aria-label="Close Modal"
          >
            &times;
          </button>



          <div className="flex justify-center mt-4 space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border rounded"
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem",
                color: "#111",
                border: "1px solid #bbb",
                background: "#fff",
              }}
            >
              <option value="">Select a category</option>
              {(categoryOptions.length ? categoryOptions : categories).map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="p-2 border rounded"
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem",
                color: "#111",
                border: "1px solid #bbb",
                background: "#fff",
              }}
            >
              <option value="">Select a type</option>
              {(typeOptions.length ? typeOptions : types).map((type, index) => (
                <option key={index} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="p-2 border rounded"
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem",
                color: "#111",
                border: "1px solid #bbb",
                background: "#fff",
              }}
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
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: "1.08rem",
              color: "#111",
              border: "1px solid #bbb",
              background: "#fff",
              marginBottom: "10px",
            }}
          />

          <div className="container mx-auto mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredContent
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((item, index) => {
                  const isSelected = selectedTiles.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg shadow-sm"
                      style={{
                        background: isSelected ? "#e6ecfa" : "#fafbfc",
                        border: isSelected ? "2px solid #111C44" : "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "18px 16px",
                        marginBottom: "8px",
                        color: "#111",
                        fontFamily: "Open Sans, sans-serif",
                        boxShadow: "0 2px 8px rgba(22,32,64,0.06)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        transition: "background 0.2s, border 0.2s",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "1.08rem", color: "#111" }}>
                        {item.Title}
                      </div>
                      <div style={{ fontSize: "0.98rem", color: "#444" }}>
                        {/* Display Description as plain text, cut off if too long */}
                        {item.Description
                          ? (() => {
                              const plain = item.Description.replace(/<[^>]+>/g, "");
                              return plain.length > 20 ? plain.slice(0, 20) + "..." : plain;
                            })()
                          : ""}
                      </div>
                      <div style={{ fontSize: "0.92rem", color: "#888" }}>
                        {(Array.isArray(item.Category) ? item.Category.join(", ") : item.Category) || ""}
                        {" \u00b7 "}
                        {(Array.isArray(item.Type) ? item.Type.join(", ") : item.Type) || ""}
                        {" \u00b7 "}
                        {(Array.isArray(item.Level) ? item.Level.join(", ") : item.Level) || ""}
                      </div>
                      <div style={{ fontSize: "0.92rem", color: "#888" }}>
                        Created: {
                          item.createdAt
                            ? (
                                typeof item.createdAt.toDate === "function"
                                  ? item.createdAt.toDate().toLocaleDateString()
                                  : !isNaN(Date.parse(item.createdAt))
                                    ? new Date(item.createdAt).toLocaleDateString()
                                    : ""
                              )
                            : ""
                        }
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTiles(selectedTiles.filter(id => id !== item.id));
                            } else {
                              setSelectedTiles([...selectedTiles, item.id]);
                            }
                            onSelectMaterial(item);
                          }}
                          style={{
                            background: isSelected ? "#111C44" : "#fff",
                            color: isSelected ? "#fff" : "#111",
                            border: "1px solid #111",
                            borderRadius: "6px",
                            padding: "6px 14px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "Open Sans, sans-serif",
                            fontSize: "1.02rem",
                            transition: "background 0.2s, color 0.2s",
                          }}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                        <a
                          href={`/view-content/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: "#fff",
                            color: "#1a73e8",
                            border: "1px solid #1a73e8",
                            borderRadius: "6px",
                            padding: "6px 14px",
                            fontWeight: 600,
                            fontFamily: "Open Sans, sans-serif",
                            fontSize: "1.02rem",
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                        >
                          View
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => handlePageChange("prev")}
              disabled={currentPage === 1}
              className="p-2"
              style={{
                background: "#fff",
                color: "#111",
                border: "1px solid #111",
                borderRadius: "6px",
                fontWeight: 600,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Prev
            </button>
            <span
              className="p-2"
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem",
                color: "#111",
              }}
            >
              Page {currentPage}
            </span>
            <button
              onClick={() => handlePageChange("next")}
              disabled={currentPage === Math.ceil(filteredContent.length / itemsPerPage)}
              className="p-2"
              style={{
                background: "#fff",
                color: "#111",
                border: "1px solid #111",
                borderRadius: "6px",
                fontWeight: 600,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem",
                cursor:
                  currentPage === Math.ceil(filteredContent.length / itemsPerPage)
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Next
            </button>
            <button
              onClick={onClose}
              className="text-lg"
              style={{
                background: "#111C44",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 18px",
                fontWeight: 600,
                fontFamily: "Open Sans, sans-serif",
                fontSize: "1.08rem",
                cursor: "pointer",
                marginLeft: "12px",
              }}
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

