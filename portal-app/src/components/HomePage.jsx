import React from "react";
import content_creator from "../assets/content_creator.png";
import educator from "../assets/educator.png";
import { useNavigate } from "react-router-dom";

const HomePage = ({ user }) => {
  const navigate = useNavigate();
  return (
    <div className="text-center mt-1">
      <div className="bg-gray-200 p-1 rounded-lg shadow-lg ">
        <div className="flex justify-center space-x-10">
          <div>
            <img
              src={educator}
              alt="Educator Icon"
              className="mx-auto  max-w-xs w-40 h-40"
            />
            <p className="mt-4">
              {user ? (
                <button className="font-bold py-2 px-4 rounded">
                  Try our new AI generator for lesson plans!
                </button>
              ) : (
                "Manage teaching materials & generate lesson plans"
              )}
            </p>
          </div>
          <div>
            <img
              src={content_creator}
              alt="Content Creator Icon"
              className="mx-auto  max-w-xs w-40 h-40"
            />
            <p className="mt-4">
              {user ? (
                <button
                  onClick={() => navigate("/upload-content")}
                  className="font-bold py-2 px-4 rounded"
                >
                  Click here to upload educational contents
                </button>
              ) : (
                "Upload educational contents"
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
