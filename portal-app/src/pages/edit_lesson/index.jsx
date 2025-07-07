import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Modal from "react-modal";
import OverlayTileView from "../../components/OverlayTileView";
import axios from "axios";
import useUserData from "../../hooks/useUserData";
import UploadContent from "../upload-content/index";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

Modal.setAppElement("#root");

export const EditLesson = () => {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    type: "",
    level: "",
    objectives: "",
    duration: "",
    sections: [],
    description: "",
    isPublic: false,
  });

  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [portalContent, setPortalContent] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [objectives, setObjectives] = useState([""]);
  const [sections, setSections] = useState([{ intro: "", contentIds: [] }]);
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const { user, userData, loading } = useUserData();
  const [authorId, setAuthorId] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!loading && !user) {
          navigate("/my-plans");
          return;
        }

        if (loading || !user) return;

        const token = await user.getIdToken();

        const portalResponse = await axios.get(
          `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/units/user`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPortalContent(portalResponse.data);

        const lessonResponse = await axios.get(
          `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/${lessonId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const lessonData = lessonResponse.data;
        setFormData({
          title: lessonData.title || "",
          category: lessonData.category || "",
          level: lessonData.level || "",
          type: lessonData.type || "",
          objectives: lessonData.objectives || "",
          duration: lessonData.duration || "",
          sections: lessonData.sections || [],
          description: lessonData.description || "",
          isPublic: lessonData.isPublic || false,
        });
        setObjectives(lessonData.objectives || "");
        setSections(lessonData.sections || [{ intro: "", contentIds: [] }]);
        setAuthorId(lessonData.authorId || "");
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    if (!loading) {
      fetchData();
    }
  }, [lessonId, navigate, user, loading]);

  useEffect(() => {
    if (sections.length > 0 && portalContent.length > 0) {
      setSelectedMaterials(
        sections.reduce((acc, section, index) => {
          const contentIdsArray = Array.isArray(section.contentIds)
            ? section.contentIds
            : [section.contentIds]; // Ensure `contentIds` is an array

          acc[index] = contentIdsArray.map((contentId) => {
            const materialDetails = portalContent.find((item) => item.id === contentId);
            return materialDetails || { id: contentId }; // Avoid undefined
          });

          return acc;
        }, {})
      );
    }
  }, [sections, portalContent]);

  const handleExit = () => {
    navigate("/my-plans");
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: id === "duration" ? (value === "" ? "" : parseInt(value, 10)) : value,
    });
  };

  const handleChange_objective = (value) => {
    setFormData({ ...formData, objectives: value });
  };

  const handleCreateNewNugget = () => {

    if (selectedSectionIndex === null) {
      setSelectedSectionIndex(0);
    }
    setShowUploadModal(true);
  };

  const handleNewNuggetAdded = (newNugget) => {
    setShowUploadModal(false);
    if (selectedSectionIndex !== null) {
      setSelectedMaterials((prevMaterials) => ({
        ...prevMaterials,
        [selectedSectionIndex]: [...(prevMaterials[selectedSectionIndex] || []), newNugget],
      }));
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
  };

  const deleteSection = (index) => {
    const updatedSections = sections.filter((_, i) => i !== index);
    setSections(updatedSections);
    setFormData((prevData) => ({
      ...prevData,
      sections: updatedSections,
    }));
  };

  const handleSectionChange = (index, value) => {
    const updatedSections = [...sections];
    if (!updatedSections[index]) {
      updatedSections[index] = { intro: "", contentIds: [] };
    }
    updatedSections[index].intro = value;
    setSections(updatedSections);
    setFormData({ ...formData, sections: updatedSections });
  };

  const addSection = () => {
    setSections([...sections, { intro: "", contentIds: [] }]);
  };

  const handleSubmit = async () => {
    if (!user) {
      setModalMessage("User not authenticated");
      setModalIsOpen(true);
      return;
    }

    if (userData.role !== "admin" && user.uid !== authorId) {
      console.error("No permissions to update lesson");
      alert("Contact the Admin to update the lesson plan.");
      return;
    }

    const userId = user.uid;
    const token = await user.getIdToken();

    const url = `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/${lessonId}`;

    try {
      const lessonData = {
        title: formData.title,
        category: formData.category,
        level: formData.level,
        type: formData.type,
        objectives: formData.objectives,
        duration: formData.duration,
        description: formData.description,
        sections: sections.map((section, index) => ({
          id: index,
          intro: section.intro,
          contentIds: selectedMaterials[index]?.map((material) => material.id) || [],
        })),
        author: userId,
        isPublic: formData.isPublic,
      };

      if (formData.isPublic) {
        const contentUpdates = sections.flatMap((section, index) => {
          console.log("Processing section:", section);

          const contentIds = selectedMaterials[index]?.map((material) => material.id) || [];
          console.log(contentIds);
          if (!Array.isArray(contentIds) || contentIds.length === 0) {
            console.log("No valid contentIds found for section", index);
            return [];
          }

          return contentIds.map((contentId) => {
            console.log("Updating content to public:", contentId);
            return fetch(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/update/${contentId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ isPublic: true }),
            });
          });
        });

        console.log("Content update requests:", contentUpdates);
        await Promise.all(contentUpdates);
      } else {
        console.log("Lesson is private. Skipping content update.");
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(lessonData),
      });
      if (!response.ok) {
        throw new Error("Error generating lesson plan");
      }

      setModalMessage("Lesson plan updated successfully");
      setConfirmationModalOpen(false);
      setModalIsOpen(true);
    } catch (error) {
      setConfirmationModalOpen(false);
      if (error.response && error.response.data && error.response.data.error) {
        setModalMessage("Error updating lesson plan: " + error.response.data.error);
      } else {
        setModalMessage(
          "Error updating lesson plan: " + (error.message || "An unknown error occurred")
        );
      }
      setModalIsOpen(true);
    }
  };

  const onSelectMaterial = (material) => {
    const sectionMaterials = selectedMaterials[selectedSectionIndex] || [];
    const alreadySelected = sectionMaterials.find((m) => m.id === material.id);

    if (alreadySelected) {
      const updatedSectionMaterials = sectionMaterials.filter((m) => m.id !== material.id);
      setSelectedMaterials({
        ...selectedMaterials,
        [selectedSectionIndex]: updatedSectionMaterials,
      });
    } else {
      setSelectedMaterials({
        ...selectedMaterials,
        [selectedSectionIndex]: [...sectionMaterials, material],
      });
    }
  };

  const removeMaterial = (materialId, sectionIndex) => {
    const sectionMaterials = selectedMaterials[sectionIndex] || [];
    const updatedSectionMaterials = sectionMaterials.filter((m) => m.id !== materialId);
    setSelectedMaterials({
      ...selectedMaterials,
      [sectionIndex]: updatedSectionMaterials,
    });
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
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-3xl relative">
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            onClick={handleExit}
          >
            Exit
          </button>
        </div>
        <h2 className="text-2xl mb-4 text-center">Edit Lesson Plan</h2>
        <form>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
              Lesson Title:
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="title"
              type="text"
              placeholder="Lesson Plan on..."
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
              Category:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option>Select a category</option>
              <option value="Python">Python</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Economics">Economics</option>
              <option value="Earth Science">Earth Science</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="type">
              Type:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option>Select a type</option>
              <option value="Lectures">Lectures</option>
              <option value="Assignments">Assignments</option>
              <option value="Quiz">Quiz</option>
              <option value="Projects">Projects</option>
              <option value="Case studies">Case studies</option>
              <option value="Data sets">Data sets</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="level">
              Level:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="level"
              value={formData.level}
              onChange={handleChange}
              required
            >
              <option>Select a level</option>
              <option value="Basic">Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="duration">
              Lesson Duration (minutes):
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="duration"
              type="text"
              placeholder="duration"
              value={formData.duration}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="objectives">
              Lesson Objective:
            </label>
            <ReactQuill
              theme="snow"
              value={formData.objectives}
              onChange={handleChange_objective}
              className="bg-white"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
              Lesson Description:
            </label>
            <ReactQuill
              theme="snow"
              value={formData.description}
              onChange={handleChange}
              className="bg-white"
            />
          </div>
          <div className="mb-4 flex items-center">
            <input
              className="mr-2 leading-tight"
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => {
                const updatedValue = e.target.checked;
                setFormData((prevData) => ({ ...prevData, isPublic: updatedValue }));
                console.log(updatedValue);
              }}
            />
            <label className="text-gray-700 text-sm font-bold" htmlFor="isPublic">
              Make Public
            </label>
          </div>
          <div className="mb-4 relative">
            {sections.map((section, index) => (
              <div key={index} className="mb-4 relative">
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor={`Section${index + 1}`}
                >
                  Section #{index + 1}:
                </label>
                <ReactQuill
                  theme="snow"
                  value={sections[index]?.intro || ""}
                  onChange={(value) => handleSectionChange(index, value)}
                  className="bg-white"
                />

                <button
                  type="button"
                  className="bottom-2 right-2 bg-white text-black py-1 px-2 rounded border border-black hover:bg-gray-100 float-end"
                  onClick={() => {
                    setSelectedSectionIndex(index);
                    setShowOverlay(true);
                  }}
                >
                  + Add Existing Nuggets
                </button>
                <button
                  type="button"
                  className="bg-green-500 text-white py-1 px-3 rounded"
                  onClick={() => {
                    setSelectedSectionIndex(index);
                    handleCreateNewNugget();
                  }}
                >
                  + Create New Nugget
                </button>
                {sections.length > 1 && (
                  <button
                    type="button"
                    className="absolute top-0 right-0 text-red-500 text-xl font-bold"
                    onClick={() => deleteSection(index)}
                  >
                    &times;
                  </button>
                )}
                <div className="flex flex-wrap mt-2">
                  {selectedMaterials[index]?.map((material) => (
                    <div
                      key={material.id}
                      className="p-2 border rounded-md m-1 text-xs flex items-center"
                    >
                      <span>{material.Title}</span>
                      <button
                        onClick={() => removeMaterial(material.id, index)}
                        className="ml-2 text-red-500 font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
              onClick={addSection}
            >
              Add another Section
            </button>
          </div>
          <div className="flex items-center justify-center">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-2xl focus:outline-none focus:shadow-outline w-full"
              type="button"
              onClick={() => setConfirmationModalOpen(true)}
            >
              Update
            </button>
          </div>
        </form>
        {/* Confirmation Modal */}
        {confirmationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Update Lesson Plan</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to update this lesson plan? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmationModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
        {showOverlay && (
          <OverlayTileView
            content={portalContent}
            onClose={() => setShowOverlay(false)}
            onSelectMaterial={onSelectMaterial}
            initialSelectedTiles={Object.values(selectedMaterials || {})
              .flat()
              .map((item) => item.id)}
            type={formData.type}
            category={formData.category}
            level={formData.level}
          />
        )}
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Submission Result"
        >
          <h2>{modalMessage}</h2>
          <button
            onClick={() => setModalIsOpen(false)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Close
          </button>
        </Modal>
        <Modal isOpen={showUploadModal} onRequestClose={closeUploadModal}>
          <UploadContent
            fromLesson={closeUploadModal}
            onNuggetCreated={handleNewNuggetAdded}
            isPublic={false}
            type={formData.type}
            category={formData.category}
            level={formData.level}
          />
        </Modal>
      </div>
    </div>
  );
};

export default EditLesson;
