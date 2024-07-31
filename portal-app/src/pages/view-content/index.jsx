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
        console.error('Error fetching content:', error);
        setError(error.message);
      });
  }, [UnitID]);

  if (error) return <div>{error}</div>;
  if (!content) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">{content.Title}</h1>
      <p>Category: {content.Category}</p>
      <p>Type: {content.Type}</p>
      <p>Level: {content.Level}</p>
      <p>Duration: {content.Duration}</p>
      <div className="mt-4 p-3 border rounded">
        <div className="text-left">{content.Abstract}</div>
      </div>
    </div>
  );
};

export default ViewContent;
