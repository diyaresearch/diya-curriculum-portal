import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const Module = ({ mode, lessonPlans = [] }) => {
  const [plans, setPlans] = useState([]);

  // Ensure plans update when lessonPlans change
  useEffect(() => {
    setPlans(lessonPlans);
  }, [lessonPlans]);

  const [draggedIndex, setDraggedIndex] = useState(null);

  // Drag Start - Set Dragged Item
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  // Allow Drag Over - Necessary for Drop
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Handle Drop - Reorder List
  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedPlans = [...plans];
    const draggedItem = updatedPlans.splice(draggedIndex, 1)[0]; // Remove dragged item
    updatedPlans.splice(index, 0, draggedItem); // Insert at new position

    setPlans(updatedPlans);
    setDraggedIndex(null); // Reset dragged index
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-3xl">
      {/* Module Title */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Module Title:</label>
        <input
          type="text"
          disabled={mode === "view"}
          className="w-full px-4 py-2 border rounded bg-white"
        />
      </div>

      {/* Module Description */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Module Description:</label>
        <ReactQuill readOnly={mode === "view"} theme="snow" className="bg-white border" />
      </div>

      {/* Lesson Plans List - Drag-and-Drop */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Lesson Plans:</label>
        <div className="border rounded p-2 bg-gray-50">
          {plans.length > 0 ? (
            plans.map((plan, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className="p-3 mb-2 border bg-white shadow-md rounded-md cursor-move"
              >
                <h3 className="text-lg font-semibold">{plan.title}</h3>
                <p className="text-sm text-gray-600">Category: {plan.category}</p>
                <p className="text-sm text-gray-600">Level: {plan.level}</p>
                <p className="text-sm text-gray-600">Duration: {plan.duration} minutes</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No lesson plans available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Module;
