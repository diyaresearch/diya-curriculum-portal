import React from "react";
import { useNavigate } from "react-router-dom";

const TileItem = ({ id, title, category, type, level, duration, date }) => {
  const navigate = useNavigate();

  return (
    <div className="border p-4 rounded-md shadow-sm hover:bg-gray-100 hover:shadow-lg transition duration-200">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-600">Category: {category}</p>
      <p className="text-sm text-gray-600">Type: {type}</p>
      <p className="text-sm text-gray-600">Level: {level}</p>
      <p className="text-sm text-gray-600">Duration: {duration}</p>
      <p className="text-sm text-gray-600">Date: {date || "N/A"}</p>
      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => navigate(`/edit-content/${id}`)}
      >
        Edit
      </button>
    </div>
  );
};

export default TileItem;
