import React, { useState } from "react";
import content_creator from "../assets/content_creator.png";
import educator from "../assets/educator.png";
import lesson_plans from "../assets/lesson_plans.png";
import { useNavigate } from "react-router-dom";
import useUserData from "../hooks/useUserData";

const HomePage = ({ user }) => {
  const navigate = useNavigate();
  const { userData } = useUserData();
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  return (
    <>
      {showUpgradePopup && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md shadow-lg max-w-md w-full">
            <p className="text-lg font-bold text-red-500">
              To access this feature, please upgrade to TeacherPlus by emailing{" "}
              <a href="mailto:contact@diyaresearch.org" className="text-blue-600">
                contact@diyaresearch.org
              </a>
              .
            </p>
            <button
              onClick={() => setShowUpgradePopup(false)}
              className="mt-4 bg-gray-400 py-2 px-3 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="text-center mt-1">
        <div className="bg-gray-200 p-1 rounded-lg shadow-lg ">
          <div className="flex justify-center space-x-10">
            <div>
              <img src={educator} alt="Educator Icon" className="mx-auto max-w-xs w-40 h-40" />
              <p className="mt-4">
                {user ? (
                  <button
                    onClick={() => {
                      if (userData.role === "teacherDefault") {
                        setShowUpgradePopup(true);
                      } else {
                        navigate("/lesson-generator");
                      }
                    }}
                    className="font-bold py-2 px-4 rounded"
                  >
                    Try our Lesson Plan Generator!
                  </button>
                ) : (
                  "Manage teaching materials & generate lesson plans"
                )}
              </p>
            </div>
            {user && userData?.role === "admin" && (
              <div>
                <img
                  src={content_creator}
                  alt="Content Creator Icon"
                  className="mx-auto max-w-xs w-40 h-40"
                />
                <p className="mt-4">
                  <button
                    onClick={() => navigate("/upload-content")}
                    className="font-bold py-2 px-4 rounded"
                  >
                    Click here to upload educational contents
                  </button>
                </p>
              </div>
            )}
            <div>
              <img
                src={lesson_plans}
                alt="Lesson Plans Icon"
                className="mx-auto max-w-xs w-40 h-40"
              />
              <p className="mt-4">
                {user ? (
                  <button
                    onClick={() => navigate("/my-plans")}
                    className="font-bold py-2 px-4 rounded"
                  >
                    View Lesson Plans
                  </button>
                ) : (
                  "View and manage your lesson plans"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
