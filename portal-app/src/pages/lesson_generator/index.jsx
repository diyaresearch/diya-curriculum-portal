import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth } from "firebase/auth";
import OverlayTileView from "../../components/OverlayTileView";
import axios from "axios";
import UploadContent from "../upload-content/index";
import useUserData from "../../hooks/useUserData";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import Quill CSS

Modal.setAppElement("#root");

export const LessonGenerator = () => {
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
  const [sections, setSections] = useState([{ intro: "", contentIds: [] }]);
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { userData } = useUserData(); // Get user data
  const userRole = userData?.role; // Extract role
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/units`)
      .then((response) => {
        setPortalContent(response.data);
      })
      .catch((error) => {
        console.error("Error fetching portal content:", error);
      });
  }, []);

  const handleExit = () => {
    navigate("/");
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: id === "duration" ? (value === "" ? "" : parseInt(value, 10)) : value,
    });
  };

  const handleDescriptionChange = (value) => {
    setFormData({ ...formData, description: value });
  };

  const handleChange_objective = (value) => {
    setFormData({ ...formData, objectives: value });
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

  const handleCreateNewNugget = () => {
    console.log("Create Nugget clicked. Current user role:", userRole);

    if (!userRole) {
      console.error("User role is undefined.");
      return;
    }

    if (userRole === "teacherDefault") {
      console.log("Showing upgrade popup for teacherDefault");
      setShowUpgradePopup(true);
    } else if (userRole === "teacherPlus" || userRole === "admin") {
      if (selectedSectionIndex === null) {
        setSelectedSectionIndex(0);
      }
      setShowUploadModal(true);
    } else {
      console.warn("Unrecognized user role:", userRole);
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setModalMessage("User not authenticated");
      setModalIsOpen(true);
      return;
    }

    const userId = user.uid;
    const token = await user.getIdToken();

    const url = `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/lesson/`;

    try {
      console.log(formData.isPublic === true);

      // If the lesson is public, update all content within sections to be public
      if (formData.isPublic) {
        const contentUpdates = sections.flatMap((section, index) => {
          console.log("Processing section:", section);

          const contentIds = selectedMaterials[index]?.map((material) => material.id) || [];
          console.log(contentIds);
          if (!Array.isArray(contentIds) || contentIds.length === 0) {
            console.error("No valid contentIds found for section", index);
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

      const lessonData = {
        title: formData.title,
        category: formData.category,
        type: formData.type,
        level: formData.level,
        objectives: formData.objectives,
        duration: formData.duration,
        description: formData.description,
        isPublic: formData.isPublic,
        sections: sections.map((section, index) => ({
          id: index,
          intro: section.intro,
          contentIds: selectedMaterials[index]?.map((material) => material.id) || [],
        })),
        author: userId,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(lessonData),
      });

      if (!response.ok) {
        throw new Error("Error generating lesson plan");
      }

      setModalMessage("Lesson plan generated successfully");
      setFormData({
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
      setSections([{ intro: "", contentIds: [] }]);
      setSelectedMaterials({});
      setModalIsOpen(true);
      setIsSubmitting(false);
    } catch (error) {
      setModalMessage("Error generating lesson plan: " + error.message);
      setModalIsOpen(true);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
    navigate("/my-plans");
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
            onClick={() => navigate("/my-plans")}
          >
            Plans
          </button>
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            onClick={handleExit}
          >
            Exit
          </button>
        </div>
        <h2 className="text-2xl mb-4 text-center">Lesson Plan Generator</h2>
        <form onSubmit={handleSubmit}>
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
              value={formData.subject}
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
              onChange={handleDescriptionChange}
              className="bg-white"
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
          <div className="mb-4 relative">
            {sections.map((section, index) => (
              <div key={index} className="mb-4 relative">
                <label className="block text-gray-700 text-sm font-bold mb-2">
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
              className={`py-2 px-4 rounded-2xl focus:outline-none focus:shadow-outline w-full font-bold ${
                isSubmitting
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-700 text-white"
              }`}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
        {showOverlay && (
          <OverlayTileView
            content={portalContent}
            onClose={() => setShowOverlay(false)}
            onSelectMaterial={onSelectMaterial}
            initialSelectedTiles={Object.values(selectedMaterials || {})
              .flat()
              .map((item) => item.id)}
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
            onClick={closeModal}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Close
          </button>
        </Modal>
      </div>
      <Modal isOpen={showUploadModal} onRequestClose={closeUploadModal}>
        <UploadContent
          fromLesson={closeUploadModal}
          onNuggetCreated={handleNewNuggetAdded}
          isPublic={false}
        />
      </Modal>
      {/* Popup for Teacher Default Users */}
      {showUpgradePopup && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md shadow-lg">
            <p className="text-lg font-bold text-red-500">
              To access this feature, please upgrade to TeacherPlus by emailing{" "}
              <a href="mailto:contact@diyaresearch.org" className="text-blue-600">
                contact@diyaresearch.org
              </a>
              .
            </p>
            <button
              onClick={() => setShowUpgradePopup(false)}
              className="mt-4 bg-gray-400 py-1 px-3 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonGenerator;
