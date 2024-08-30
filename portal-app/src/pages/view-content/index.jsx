import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { storage } from "../../firebase/firebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";

const ViewContent = () => {
  const { UnitID } = useParams(); // Get UnitID from the URL
  const [content, setContent] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch("https://curriculum-portal-api.uc.r.appspot.com/api/units");
        const units = await response.json();

        const unit = units.find((unit) => unit.UnitID === UnitID);
        if (unit) {
          const contentResponse = await fetch(
            `https://curriculum-portal-api.uc.r.appspot.com/api/unit/${unit.id}`
          );
          const data = await contentResponse.json();
          setContent(data);

          if (unit.fileUrl) {
            const fileRef = ref(storage, unit.fileUrl);
            const downloadURL = await getDownloadURL(fileRef);
            console.log(downloadURL);
            setFileUrl(downloadURL);
          }
        } else {
          throw new Error("Unit not found");
        }
      } catch (error) {
        console.error("Error fetching content:", error);
        setError(error.message);
      }
    };

    fetchContent();
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
      {fileUrl && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            File Preview
          </h2>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Open File
          </a>
        </div>
      )}
    </div>
  );
};

export default ViewContent;
