import type { CSSProperties, MouseEventHandler } from "react";
import { FaEdit } from "react-icons/fa";

export interface EditButtonProps {
  label?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Tooltip text; falls back to `label`. */
  title?: string;
}

const EditButton = ({
  label = "Edit",
  onClick,
  disabled = false,
  className = "",
  style,
  title,
}: EditButtonProps) => {
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
