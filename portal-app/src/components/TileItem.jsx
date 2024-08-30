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
      className="relative border p-4 rounded-md shadow-sm hover:bg-gray-100 hover:shadow-lg transition duration-200 h-60 flex flex-col justify-between"
      onClick={() => onClick(id)}
    >
      <h3 className="text-[1.0625rem] font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 ">Category: {category}</p>
      <p className="text-sm text-gray-600 ">Type: {type}</p>
      <p className="text-sm text-gray-600 ">Level: {level}</p>
      <p className="text-sm text-gray-600 ">Duration: {duration}min</p>
      <p className="text-sm text-gray-600">Date: {date || "N/A"}</p>
    </div>
  );
};

export default TileItem;
