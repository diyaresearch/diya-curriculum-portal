import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const Module = ({ mode, lessonPlans = [] }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");

  // Add new tag to the list
  const addTag = () => {
    if (newTag.trim() !== "") {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  // Remove a tag from the list
  const removeTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-3xl">
      {/* Module Title */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Module Title:
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={mode === "view"}
          className={`w-full px-4 py-2 border rounded ${
            mode === "view" ? "bg-gray-100 cursor-not-allowed" : "bg-white"
          }`}
        />
      </div>

      {/* Module Description (Rich Text Editor) */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Module Description:
        </label>
        <ReactQuill
          value={description}
          onChange={setDescription}
          readOnly={mode === "view"}
          theme="snow"
          className={`bg-white border ${
            mode === "view" ? "pointer-events-none opacity-60" : ""
          }`}
        />
      </div>

      {/* Module Tags */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Module Tags:
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1 px-4 py-2 border rounded"
            placeholder="Enter a tag"
            disabled={mode === "view"}
          />
          <button
            onClick={addTag}
            disabled={mode === "view"}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add
          </button>
        </div>

        {/* Display added tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <div key={index} className="px-3 py-1 bg-gray-200 rounded flex items-center">
              <span>{tag}</span>
              {mode !== "view" && (
                <button
                  onClick={() => removeTag(index)}
                  className="ml-2 text-red-500 font-bold"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lesson Plans List */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Lesson Plans:
        </label>
        <div className="border rounded p-2">
          {lessonPlans.length > 0 ? (
            lessonPlans.map((plan, index) => (
              <div key={index} className="p-2 border-b">
                <h3 className="text-lg font-semibold">{plan.title}</h3>
                <p className="text-sm text-gray-600">Category: {plan.category}</p>
                <p className="text-sm text-gray-600">Level: {plan.level}</p>
                <p className="text-sm text-gray-600">
                  Duration: {plan.duration} minutes
                </p>
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
