import React from "react";
import { useNavigate } from "react-router-dom";

const TileItem = ({
  id,
  title,
  category,
  type,
  level,
  duration,
  date,
  onClick,
}) => {
  return (
    <div
      className="border p-4 rounded-md shadow-sm hover:bg-gray-100 hover:shadow-lg transition duration-200"
      onClick={() => onClick(id)}
    >
      <h3 className="text-[1.0625rem] font-semibold text-left mb-2">{title}</h3>
      <p className="text-sm text-gray-600 text-left">Category: {category}</p>
      <p className="text-sm text-gray-600 text-left">Type: {type}</p>
      <p className="text-sm text-gray-600 text-left">Level: {level}</p>
      <p className="text-sm text-gray-600 text-left">Duration: {duration}min</p>
      <p className="text-sm text-gray-600 text-left">Date: {date || "N/A"}</p>
    </div>
  );
};

export default TileItem;
