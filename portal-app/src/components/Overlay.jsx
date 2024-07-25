import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEllipsisV } from "react-icons/fa";

const Overlay = ({ content, onClose }) => {
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);
  if (!content) return null;

  return (
    <div className="fixed bottom-0 right-0 bg-white p-4 border shadow=lg w-2/3 h-4/5 z-50">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold">{content.Title}</h2>
        <div className="flex space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2"
            >
              <FaEllipsisV />
            </button>
            {showOptions && (
              <div className="absolute right-0 bg-white border shadow-md mt-2 rounded w-48">
                <button
                  onClick={() => alert("Open in New Tab")}
                  className="block px-4 py-2"
                >
                  Open in New Tab
                </button>
                <hr />
                <button
                  onClick={() => alert("Save the Link")}
                  className="block px-4 py-2"
                >
                  Save the Link
                </button>
                <hr />
                <button
                  onClick={() => navigate(`/edit-content/${content.id}`)}
                  className="block px-4 py-2"
                >
                  Edit the Content
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-xl">
            &times;
          </button>
        </div>
      </div>
      <div className="mt-4 text-left">
        <p>Category: {content.Category}</p>
        <p>Type: {content.Type}</p>
        <p>Level: {content.Level}</p>
        <p>Duration: {content.Duration}</p>
        <div className="mt-4 p-3 border rounded h-[150px] w-full overflow-auto">
          <div className="text-left">{content.Abstract}</div>
        </div>
        <div className="mt-4 p-2 border rounded">
          <h3 className="text-lg">Add your comment here:</h3>
          <br />
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Write a comment..."
          ></textarea>
          <div className="flex justify-end">
            <button className="mt-2 p-2 bg-blue-500 text-white rounded">
              Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overlay;
