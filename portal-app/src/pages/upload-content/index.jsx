import React, { useState } from "react";
import Modal from "react-modal";

Modal.setAppElement("#root");

export const UploadContent = () => {
  const [formData, setFormData] = useState({
    Title: "",
    Category: "",
    Type: "",
    Level: "",
    Duration: "",
    isPublic: false,
    Abstract: "",
  });

  const [file, setFile] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    document.getElementById("file-name").textContent = e.target.files[0].name;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = "http://localhost:3001/api/content/"; // Replace with your backend endpoint URL

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("Title", formData.Title);
      formDataToSend.append("Category", formData.Category);
      formDataToSend.append("Type", formData.Type);
      formDataToSend.append("Level", formData.Level);
      formDataToSend.append("Duration", formData.Duration);
      formDataToSend.append("isPublic", formData.isPublic);
      formDataToSend.append("Abstract", formData.Abstract);
      formDataToSend.append("file", file);

      const response = await fetch(url, {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error("Error submitting content");
      }

      setModalMessage("Content submitted successfully");
      // Optionally reset form fields after successful submission
      setFormData({
        Title: "",
        Category: "",
        Type: "",
        Level: "",
        Duration: "",
        isPublic: false,
        Abstract: "",
      });
      setFile(null);
      document.getElementById("file-name").textContent = "";
    } catch (error) {
      setModalMessage("Error submitting content:" + error.message);
      // Handle error (show message to user, etc.)
    } finally {
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const customStyles = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      width: "400px",
      padding: "20px",
      textAlign: "center",
    },
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.75)",
    },
  };

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col items-center justify-center">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-lg">
        <h2 className="text-2xl mb-4 text-center">Upload contents</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="Title"
            >
              Title:
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Title"
              type="text"
              placeholder="Title"
              value={formData.Title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="Category"
            >
              Category:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Category"
              value={formData.Category}
              onChange={handleChange}
              required
            >
              <option>Select a category</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Languages">Languages</option>
              <option value="Arts">Arts</option>
              <option value="Physical">Physical</option>
              <option value="Education">Education</option>
              <option value="Health">Health</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="Type"
            >
              Type:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Type"
              value={formData.Type}
              onChange={handleChange}
              required
            >
              <option>Select an option</option>
              <option value="Lectures">Lectures</option>
              <option value="Assignments">Assignments</option>
              <option value="Quiz">Quiz</option>
              <option value="Projects">Projects</option>
              <option value="Case studies">Case studies</option>
              <option value="Data sets">Data sets</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="Level"
            >
              Level:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Level"
              value={formData.Level}
              onChange={handleChange}
              required
            >
              <option>Select an option</option>
              <option value="Basic">Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="Duration"
            >
              Duration (minutes):
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Duration"
              type="text"
              placeholder="Duration"
              value={formData.Duration}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-4 flex items-center">
            <input
              className="mr-2 leading-tight"
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) =>
                setFormData({ ...formData, isPublic: e.target.checked })
              }
            />
            <label
              className="text-gray-700 text-sm font-bold"
              htmlFor="isPublic"
            >
              Make Public
            </label>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="Abstract"
            >
              Abstract:
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="Abstract"
              rows="5"
              placeholder="Abstract"
              value={formData.Abstract}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="file"
            >
              Upload File:
            </label>
            <div className="flex items-center">
              <label className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded cursor-pointer focus:outline-none focus:shadow-outline">
                Browse...
                <input
                  className="hidden"
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                />
              </label>
              <span className="ml-2 text-gray-700" id="file-name"></span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Submit
            </button>
          </div>
        </form>
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Submission Result"
        >
          <h2>{modalMessage}</h2>
          <button
            onClick={closeModal}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Close
          </button>
        </Modal>
      </div>
    </div>
  );
};

export default UploadContent;
