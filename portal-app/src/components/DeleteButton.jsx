import React from "react";
import { FaTrash } from "react-icons/fa";

const DeleteButton = ({
  label = "Delete",
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
      className={`inline-flex items-center gap-2 px-4 py-2 border border-red-300 rounded bg-white text-red-700 hover:bg-red-50 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      style={style}
    >
      <FaTrash />
      <span>{label}</span>
    </button>
  );
};

export default DeleteButton;

