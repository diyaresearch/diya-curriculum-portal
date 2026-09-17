import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";

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
  const [selectedCategory, setSelectedCategory] = useState(category || "");
  const [selectedType, setSelectedType] = useState(type || "");
  const [selectedLevel, setSelectedLevel] = useState(level || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedTiles, setSelectedTiles] = useState(initialSelectedTiles || []);

  // Derived during render, not mirrored into state (#525). As two effects -
  // one writing `content` unfiltered, one writing the filtered result - a
  // refetch while a filter was active rendered the full list for a frame first.
  const filteredContent = useMemo(() => {
    let filtered = [...content];

    if (selectedCategory) {
      if (contentType === "nugget") {
        filtered = filtered.filter((item) =>
          Array.isArray(item.Category)
            ? item.Category.includes(selectedCategory)
            : item.Category === selectedCategory
        );
      } else if (contentType === "lessonPlan") {
        filtered = filtered.filter((item) =>
          Array.isArray(item.category)
            ? item.category.includes(selectedCategory)
            : item.category === selectedCategory
        );
      }
    }

    if (selectedType) {
      if (contentType === "nugget") {
        filtered = filtered.filter((item) =>
          Array.isArray(item.Type)
            ? item.Type.includes(selectedType)
            : item.Type === selectedType
        );
      } else if (contentType === "lessonPlan") {
        filtered = filtered.filter((item) =>
          Array.isArray(item.type)
            ? item.type.includes(selectedType)
            : item.type === selectedType
        );
      }
    }

    if (selectedLevel) {
      if (contentType === "nugget") {
        filtered = filtered.filter((item) =>
          Array.isArray(item.Level)
            ? item.Level.includes(selectedLevel)
            : item.Level === selectedLevel
        );
      } else if (contentType === "lessonPlan") {
        filtered = filtered.filter((item) =>
          Array.isArray(item.level)
            ? item.level.includes(selectedLevel)
            : item.level === selectedLevel
        );
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

    return filtered;
  }, [selectedCategory, selectedType, selectedLevel, searchTerm, content, contentType]);

  // Re-seed the dropdowns when the parent hands down different starting
  // filters. React's documented way to adjust state on a prop change is during
  // render, not in an effect (#525): the effect re-rendered once with the stale
  // selection before correcting it.
  const [seededFrom, setSeededFrom] = useState({ category, type, level });
  if (
    seededFrom.category !== category ||
    seededFrom.type !== type ||
    seededFrom.level !== level
  ) {
    setSeededFrom({ category, type, level });
    setSelectedCategory(category || "");
    setSelectedType(type || "");
    setSelectedLevel(level || "");
  }

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
      className="fixed inset-0 flex justify-center items-center [background:rgba(246,_248,_250,_0.98)] z-[1000] font-sans"
    >
      <div
        className="bg-white rounded-lg relative overflow-hidden overflow-y-auto w-[43%] h-[94%] border-2 border-rule shadow-[0_4px_24px_rgba(22,32,64,0.10)] text-ink-strong font-sans"
      >
        <div
          className="scale-container [transform:scale(0.97)] origin-[top_center] pt-8 pr-6 pb-6 pl-6 bg-surface rounded-xl text-ink-strong font-sans"
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
                      <div
                        data-testid="tile-title"
                        className="font-bold text-label text-ink-strong"
                      >
                        {item.Title}
                      </div>
                      <div className="text-[0.98rem] text-[#444]">
                        {/* Display Description as plain text, cut off if too long */}
                        {item.Description
                          ? (() => {
                              const plain = item.Description.replace(/<[^>]+>/g, "");
                              return plain.length > 20 ? plain.slice(0, 20) + "..." : plain;
                            })()
                          : ""}
                      </div>
                      <div className="text-helper text-ink-faint">
                        {(Array.isArray(item.Category) ? item.Category.join(", ") : item.Category) || ""}
                        {" \u00b7 "}
                        {(Array.isArray(item.Type) ? item.Type.join(", ") : item.Type) || ""}
                        {" \u00b7 "}
                        {(Array.isArray(item.Level) ? item.Level.join(", ") : item.Level) || ""}
                      </div>
                      <div className="text-helper text-ink-faint">
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
                      <div className="flex gap-2 mt-2">
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
                        <Link
                          to={`/content/${item.id}`}
                          className="bg-surface text-link border border-link rounded-md py-1.5 px-3.5 font-semibold font-sans text-[1.02rem] no-underline inline-block"
                        >
                          View
                        </Link>
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
              className="p-2 font-sans text-label text-ink-strong"
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
              className="text-lg bg-navy-deep text-white border-0 rounded-md py-2 px-4.5 font-semibold font-sans text-label cursor-pointer ml-3"
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

