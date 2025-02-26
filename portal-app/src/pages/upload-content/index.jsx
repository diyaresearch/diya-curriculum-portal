import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth } from "firebase/auth";

Modal.setAppElement("#root");

export const UploadContent = ({ fromLesson, onNuggetCreated }) => {
  const [formData, setFormData] = useState({
    Title: "",
    Category: "",
    Type: "",
    Level: "",
    Duration: "",
    isPublic: false,
    Abstract: "",
    fileUrl: "",
  });

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setModalMessage("User not authenticated");
      setModalIsOpen(true);
      return;
    }

    const userId = user.uid;
    const token = await user.getIdToken();

    const url = `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/unit/`; // Replace with your backend endpoint URL

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("Title", formData.Title);
      formDataToSend.append("Category", formData.Category);
      formDataToSend.append("Type", formData.Type);
      formDataToSend.append("Level", formData.Level);
      formDataToSend.append("Duration", formData.Duration);
      formDataToSend.append("isPublic", formData.isPublic);
      formDataToSend.append("Abstract", formData.Abstract);
      formDataToSend.append("fileUrl", formData.fileUrl);
      formDataToSend.append("Author", userId); // Include the user ID

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // Include the token in the request headers
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error("Error submitting content");
      }

      const newNugget = await response.json();
      console.log("New Nugget:", newNugget);

      setModalMessage("Content submitted successfully");
      setFormData({
        Title: "",
        Category: "",
        Type: "",
        Level: "",
        Duration: "",
        isPublic: false,
        Abstract: "",
        fileUrl: "",
      });

      setModalIsOpen(true);
      if (fromLesson) {
        closeModal();
        if (onNuggetCreated) {
          onNuggetCreated(newNugget); // Call the callback if inside a modal
        }
      } else {
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (error) {
      setModalMessage("Error submitting content: " + error.message);
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
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Title">
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
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Category">
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
              <option value="Python">Python</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Earth Science">Earth Science</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Type">
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
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Level">
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
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Duration">
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
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
            />
            <label className="text-gray-700 text-sm font-bold" htmlFor="isPublic">
              Make Public
            </label>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Abstract">
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
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fileUrl">
              Content Url:
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="fileUrl"
              type="text"
              placeholder="File Url"
              value={formData.fileUrl}
              onChange={handleChange}
              required
            />
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
            onClick={() => {
              window.location.href = process.env.REACT_APP_HOME_PAGE;
            }}
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
