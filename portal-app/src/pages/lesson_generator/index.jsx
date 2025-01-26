import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { getAuth } from "firebase/auth";
import OverlayTileView from "../../components/OverlayTileView";
import axios from "axios";

Modal.setAppElement("#root");

export const LessonGenerator = () => {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    level: "",
    objectives: [],
    duration: "",
    sections: [],
    description: "",
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      [id]:
        id === "duration" ? (value === "" ? "" : parseInt(value, 10)) : value,
    });
  };

  const handleChange_objective = (index, event) => {
    const newObjectives = [...objectives];
    newObjectives[index] = event.target.value;
    setObjectives(newObjectives);
    setFormData({ ...formData, objectives: newObjectives });
  };

  const handleSectionChange = (index, event) => {
    const updatedSections = [...sections];
    if (!updatedSections[index]) {
      updatedSections[index] = { intro: "", contentIds: [] };
    }
    updatedSections[index].intro = event.target.value;
    setSections(updatedSections);
    setFormData({ ...formData, sections: updatedSections });
  };
  const addObjective = () => {
    setObjectives([...objectives, ""]);
  };

  const addSection = () => {
    setSections([...sections, { intro: "", contentIds: [] }]);
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
      const lessonData = {
        title: formData.title,
        subject: formData.subject,
        level: formData.level,
        objectives: formData.objectives,
        duration: formData.duration,
        description: formData.description,
        sections: sections.map((section, index) => ({
          id: index,
          intro: section.intro,
          contentIds:
            selectedMaterials[index]?.map((material) => material.id) || [],
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
        subject: "",
        level: "",
        objectives: [""],
        duration: "",
        sections: [],
        description: "",
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
      const updatedSectionMaterials = sectionMaterials.filter(
        (m) => m.id !== material.id
      );
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
    const updatedSectionMaterials = sectionMaterials.filter(
      (m) => m.id !== materialId
    );
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
            My Plans
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
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="title"
            >
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
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="subject"
            >
              Subject:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="subject"
              value={formData.subject}
              onChange={handleChange}
              required
            >
              <option>Select a subject</option>
              <option value="Python">Python</option> // New Category
              <option value="Physics">Physics</option>
              <option value="Chemisty">Chemisty</option>
              <option value="Biology">Biology</option>
              <option value="Economics">Economics</option>
              <option value="Earth Science">Earth Science</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="level"
            >
              Grade Level:
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="level"
              value={formData.level}
              onChange={handleChange}
              required
            >
              <option>Select a grade level</option>
              <option value="1st grade">1st grade</option>
              <option value="2nd grade">2nd grade</option>
              <option value="3rd grade">3rd grade</option>
              <option value="4th grade">4th grade</option>
              <option value="5th grade">5th grade</option>
              <option value="6th grade">6th grade</option>
              <option value="7th grade">7th grade</option>
              <option value="8th grade">8th grade</option>
              <option value="9th grade">9th grade</option>
              <option value="10th grade">10th grade</option>
              <option value="11th grade">11th grade</option>
              <option value="12th grade">12th grade</option>
            </select>
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="duration"
            >
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
            {objectives.map((objective, index) => (
              <div key={index} className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor={`Objective${index + 1}`}
                >
                  Objective #{index + 1}:
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id={`Objective${index + 1}`}
                  type="text"
                  placeholder="The objective of this lesson plan is..."
                  value={formData.objectives[index]}
                  onChange={(event) => handleChange_objective(index, event)}
                  required
                />
              </div>
            ))}
            <button
              type="button"
              className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
              onClick={addObjective}
            >
              Add another Objective
            </button>
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="description"
            >
              Lesson Description:
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="description"
              rows="5"
              placeholder="This lesson is about..."
              value={formData.description}
              onChange={handleChange}
              required
            />
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
                <textarea
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id={`Section${index + 1}`}
                  rows="5"
                  placeholder="This section is about..."
                  value={sections[index]?.intro || ""}
                  onChange={(event) => handleSectionChange(index, event)}
                  required
                />

                <button
                  type="button"
                  className="bottom-2 right-2 bg-white text-black py-1 px-2 rounded border border-black hover:bg-gray-100 float-end"
                  onClick={() => {
                    setSelectedSectionIndex(index);
                    setShowOverlay(true);
                  }}
                >
                  + Add materials from the portal
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
    </div>
  );
};

export default LessonGenerator;
