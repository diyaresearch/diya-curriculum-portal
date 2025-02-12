import React from "react";

const TileItem = ({
  id,
  title,
  category,
  type,
  level,
  duration,
  date,
  onClick,
  onDelete,
  isSelected,
  onSelect,
  isLessonGenerator,
  userRole,
}) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this item?")) {
      onDelete(id);
    }
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handleContentClick = (e) => {
    if (!e.target.closest('input[type="checkbox"]') && !e.target.closest('button')) {
      onClick(id);
    }
  };

  return (
    <div
      className="relative border p-4 rounded-md shadow-sm hover:bg-gray-100 hover:shadow-lg transition duration-200 h-60 flex flex-col justify-between"
      onClick={handleContentClick}
    >
      <div className="absolute top-2 right-2 flex gap-2">
        {!isLessonGenerator && userRole === "admin" && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 transition-colors duration-200"
            title="Delete item"
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
          </button>
        )}
      </div>
      {!isLessonGenerator && userRole === "admin" && (
        <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition duration-200"
          />
        </div>
      )}
      <h3 className="text-[1.0625rem] font-semibold mb-2 mt-6">{title}</h3>
      <p className="text-sm text-gray-600">Category: {category}</p>
      <p className="text-sm text-gray-600">Type: {type}</p>
      <p className="text-sm text-gray-600">Level: {level}</p>
      <p className="text-sm text-gray-600">Duration: {duration}min</p>
      <p className="text-sm text-gray-600">Date: {date || "N/A"}</p>
    </div>
  );
};

export default TileItem;
