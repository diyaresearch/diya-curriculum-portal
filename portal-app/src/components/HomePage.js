import React from "react";
import content_creator from "../assets/content_creator.png";
import educator from "../assets/educator.png";

const HomePage = () => {
  return (
    <div className="text-center mt-10">
      <div className="bg-gray-200 p-10 rounded-lg shadow-lg">
        <div className="flex justify-center space-x-20">
          <div>
            <img src={educator} alt="Educator Icon" className="mx-auto" />
            <p className="mt-4">
              Manage teaching materials & generate lesson plans
            </p>
          </div>
          <div>
            <img
              src={content_creator}
              alt="Content Creator Icon"
              className="mx-auto"
            />
            <p className="mt-4">Upload educational contents</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
