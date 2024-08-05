import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ViewContent = () => {
  const { UnitID } = useParams(); // Get UnitID from the URL
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch all units to map UnitID to id
    fetch(`http://localhost:3001/api/units`) // Fetch all units to get mapping of UnitID to id
      .then((response) => response.json())
      .then((units) => {
        // Find the unit with the matching UnitID
        const unit = units.find((unit) => unit.UnitID === UnitID);
        if (unit) {
          // Now fetch the content using the id
          return fetch(`http://localhost:3001/api/unit/${unit.id}`);
        } else {
          throw new Error("Unit not found");
        }
      })
      .then((response) => response.json())
      .then((data) => setContent(data))
      .catch((error) => {
        console.error("Error fetching content:", error);
        setError(error.message);
      });
  }, [UnitID]);

  if (error) return <div>{error}</div>;
  if (!content) return <div>Loading...</div>;

  return (
    <div className="p-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{content.Title}</h1>
      <p className="text-lg text-gray-700">
        <span className="font-semibold">Category: </span>
        {content.Category}
      </p>
      <p className="text-lg text-gray-700">
        <span className="font-semibold">Type: </span>
        {content.Type}
      </p>
      <p className="text-lg text-gray-700">
        <span className="font-semibold">Level: </span>
        {content.Level}
      </p>
      <p className="text-lg text-gray-700">
        <span className="font-semibold">Duration: </span>
        {content.Duration}
      </p>
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <div className="text-left text-gray-800">{content.Abstract}</div>
      </div>
    </div>
  );
};

export default ViewContent;
