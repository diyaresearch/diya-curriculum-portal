import React from "react";
import data_science from "../assets/data_science.png";
import software_engineering from "../assets/software_engineering.png";
import software_testing from "../assets/software_testing.png";
const resources = [
  { title: "Data Science", img: data_science },
  { title: "Software Engineering", img: software_engineering },
  { title: "Software Testing", img: software_testing },
];

const ResourcesPage = () => {
  return (
    <div className="text-center mt-10">
      <h2 className="text-2xl font-bold">
        Resources Available from various domains
      </h2>
      <div className="flex justify-center mt-10 space-x-10">
        {resources.map((resource, index) => (
          <div key={index} className="bg-gray-200 p-5 rounded-lg shadow-lg">
            <img src={resource.img} alt={resource.title} className="mx-auto" />
            <h3 className="mt-4 text-xl">{resource.title}</h3>
            <ul className="mt-4 space-y-2">
              <li>Assignments</li>
              <li>Flash Cards</li>
              <li>Quiz</li>
              <li>Puzzles</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourcesPage;
