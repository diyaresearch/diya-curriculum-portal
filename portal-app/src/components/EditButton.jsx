import React from "react";
import { FaEdit } from "react-icons/fa";

const EditButton = ({
  label = "Edit",
  onClick,
  disabled = false,
  className = "",
  style,
  title,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 transition-colors text-gray-900 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      style={style}
    >
      <FaEdit />
      <span>{label}</span>
    </button>
  );
};

export default EditButton;

